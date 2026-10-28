import { randomBytes, createHash } from 'node:crypto';
import { mkdir, writeFile, unlink, stat, readdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import mongoose from 'mongoose';
import { join, resolve } from 'node:path';
import { contentHash } from '@resumeos/shared/hash.js';
import { getTemplate } from '@resumeos/shared/templates/index.js';
import { ExportRecord } from './export.model.js';
import { renderPdf } from './render.js';
import { validatePdf, parsePdf } from './validate.js';
import { fitToOnePage } from '@resumeos/shared/fit.js';
import { renderDocx } from './docx.js';
import { validateDocx } from './validateDocx.js';
import { docxReferenceHtml } from './docx.js';

export const FORMATS = {
  pdf: { ext: 'pdf', mime: 'application/pdf', label: 'PDF' },
  docx: {
    ext: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    label: 'Word document',
  },
};
import { Resume } from '../resumes/resume.model.js';
import { ResumeVersion } from '../versions/version.model.js';
import { photoService } from '../photos/photo.service.js';
import { HttpError } from '../../utils/HttpError.js';

const notFound = () => new HttpError(404, 'NOT_FOUND', "That export doesn't exist or isn't yours.");

export function publicExport(doc) {
  const now = Date.now();
  const available =
    Boolean(doc.fileStorageKey) &&
    !doc.fileDeletedAt &&
    new Date(doc.expiresAt).getTime() > now &&
    doc.validationSummary?.status !== 'failed';
  return {
    id: String(doc._id),
    resumeId: String(doc.resumeId),
    resumeTitle: doc.resumeTitle,
    resumeVersionId: doc.resumeVersionId ? String(doc.resumeVersionId) : null,
    draftRevision: doc.draftRevision,
    contentHash: doc.contentHash,
    format: doc.format,
    templateId: doc.templateId,
    templateVersion: doc.templateVersion,
    pageSize: doc.pageSize,
    accentColor: doc.accentColor ?? null,
    backgroundPattern: doc.backgroundPattern ?? 'none',
    pageCount: doc.pageCount,
    byteSize: doc.byteSize,
    durationMs: doc.durationMs,
    validation: doc.validationSummary,
    createdAt: doc.createdAt,
    expiresAt: doc.expiresAt,
    downloadAvailable: available,
  };
}

/** ASCII-safe filename plus an RFC 5987 UTF-8 variant for the original name. */
export function contentDisposition(baseName, ext = 'pdf') {
  const clean =
    String(baseName || 'resume')
      .replace(/[\r\n"\\/]/g, ' ')
      .trim() || 'resume';
  const ascii =
    clean
      .normalize('NFKD')
      .replace(/[^\x20-\x7e]/g, '')
      .replace(/[^A-Za-z0-9 ._-]/g, '')
      .trim()
      .replace(/\s+/g, '-') || 'resume';
  return `attachment; filename="${ascii}.${ext}"; filename*=UTF-8''${encodeURIComponent(clean.replace(/\s+/g, '-'))}.${ext}`;
}

/** The saved version this export corresponds to, only if the draft is identical to it. */
async function matchingVersionId(resume, content, layout) {
  if (!resume.currentVersionId) return null;
  const v = await ResumeVersion.findOne(
    { _id: resume.currentVersionId },
    { contentHash: 1, templateId: 1, pageSize: 1, accentColor: 1, backgroundPattern: 1 },
  ).lean();
  const same =
    v &&
    v.contentHash === contentHash({ content, layout }) &&
    v.templateId === resume.templateId &&
    (v.accentColor ?? null) === (resume.accentColor ?? null) &&
    (v.backgroundPattern ?? 'none') === (resume.backgroundPattern ?? 'none');
  return same ? v._id : null;
}

// Fit results by everything that changes the PDF: a repeat click on an unchanged resume renders
// nothing. Bounded; oldest entries go first.
const FIT_CACHE_MAX = 500;

export function createExportService({ env, pool, logger }) {
  const fitCache = new Map();
  // One measurement at a time per user; a repeat of the same one waits for it instead.
  const fitRunning = new Map(); // userId → { key, promise }

  const dir = resolve(env.EXPORT_TEMP_DIR);
  const ttlMs = env.EXPORT_TTL_MINUTES * 60_000;
  // Files are named <random key>.<format extension>.
  const filePath = (key, format = 'pdf') => join(dir, `${key}.${FORMATS[format]?.ext ?? 'pdf'}`);

  async function removeFile(doc) {
    if (!doc.fileStorageKey) return;
    await unlink(filePath(doc.fileStorageKey, doc.format)).catch((err) => {
      if (err.code !== 'ENOENT') throw err;
    });
  }

  return {
    async create(userId, resumeId, { format, pageSize, idempotencyKey }) {
      if (idempotencyKey) {
        const existing = await ExportRecord.findOne({ userId, idempotencyKey }).lean();
        if (existing) return { record: publicExport(existing), reused: true };
      }

      const resume = await Resume.findOne({ _id: resumeId, userId }).lean();
      if (!resume)
        throw new HttpError(404, 'NOT_FOUND', "That resume doesn't exist or isn't yours.");
      const template = getTemplate(resume.templateId);
      const size = pageSize ?? resume.pageSize;
      const { content, layout } = resume.draft;

      const started = Date.now();
      let rendered;
      let validation;
      try {
        if (format === 'docx') {
          // DOCX is always one column in layout order, so the single-column render is the
          // reference for what it must contain and in which order.
          const html = docxReferenceHtml(content, layout, size);
          rendered = {
            buffer: await renderDocx({
              content,
              layout,
              templateId: resume.templateId,
              pageSize: size,
              accentColor: resume.accentColor ?? null,
            }),
            html,
          };
        } else {
          rendered = await renderPdf(pool, {
            content,
            layout,
            templateId: resume.templateId,
            pageSize: size,
            timeoutMs: env.EXPORT_TIMEOUT_MS,
            accentColor: resume.accentColor ?? null,
            pattern: resume.backgroundPattern ?? 'none',
            // The photo is included only if this resume opts in and the template supports one.
            photo:
              layout?.showPhoto && template?.photo ? await photoService.dataUrlFor(userId) : null,
          });
        }
      } catch (err) {
        if (err instanceof HttpError) throw err;
        logger.error('export render failed', { format, name: err.name, code: err.code });
        throw new HttpError(
          503,
          'EXPORT_UNAVAILABLE',
          `The ${FORMATS[format].label} couldn't be generated right now. Try again in a moment.`,
        );
      }
      validation =
        format === 'docx'
          ? await validateDocx(rendered.buffer, { html: rendered.html })
          : await validatePdf(rendered.buffer, {
              html: rendered.html,
              overflow: rendered.overflow,
            });

      const key = randomBytes(18).toString('base64url');
      await mkdir(dir, { recursive: true, mode: 0o700 });
      await writeFile(filePath(key, format), rendered.buffer, { mode: 0o600 });

      try {
        const doc = await ExportRecord.create({
          userId,
          resumeId: resume._id,
          resumeTitle: resume.title,
          resumeVersionId: await matchingVersionId(resume, content, layout),
          draftRevision: resume.draftRevision,
          contentHash: contentHash({ content, layout }),
          format,
          templateId: resume.templateId,
          templateVersion: template.version,
          pageSize: size,
          accentColor: resume.accentColor ?? null,
          backgroundPattern: resume.backgroundPattern ?? 'none',
          pageCount: validation.pageCount,
          byteSize: rendered.buffer.length,
          durationMs: Date.now() - started,
          validationSummary: validation,
          fileStorageKey: key,
          expiresAt: new Date(Date.now() + ttlMs),
          idempotencyKey: idempotencyKey ?? null,
        });
        return { record: publicExport(doc), reused: false };
      } catch (err) {
        await unlink(filePath(key, format)).catch(() => {});
        if (err?.code === 11000 && idempotencyKey) {
          const existing = await ExportRecord.findOne({ userId, idempotencyKey }).lean();
          if (existing) return { record: publicExport(existing), reused: true };
        }
        throw err;
      }
    },

    /**
     * Find the gentlest spacing and text size that fits the saved draft on one page, by
     * rendering real PDFs and counting their pages. Nothing is saved; the client applies the
     * result as an ordinary (undoable) edit.
     */
    async fitOnePage(userId, resumeId) {
      const resume = await Resume.findOne({ _id: resumeId, userId }).lean();
      if (!resume)
        throw new HttpError(404, 'NOT_FOUND', "That resume doesn't exist or isn't yours.");
      const template = getTemplate(resume.templateId);
      const { content, layout } = resume.draft;
      const photo =
        layout?.showPhoto && template?.photo ? await photoService.dataUrlFor(userId) : null;
      const key = [
        resume._id,
        resume.draftRevision,
        resume.templateId,
        template?.version,
        resume.pageSize,
        resume.accentColor ?? '',
        resume.backgroundPattern ?? 'none',
        photo ? createHash('sha256').update(photo).digest('hex').slice(0, 16) : 'none',
      ].join('|');
      const respond = (result) => ({
        alreadyFits: result.alreadyFits,
        pages: result.pages,
        draftRevision: resume.draftRevision,
        settings: result.layout
          ? { spacing: result.layout.spacing ?? 'normal', fontScale: result.layout.fontScale ?? 1 }
          : null,
      });
      if (fitCache.has(key)) return respond(fitCache.get(key));

      const running = fitRunning.get(String(userId));
      if (running?.key === key) return respond(await running.promise);
      if (running)
        throw new HttpError(
          429,
          'FIT_IN_PROGRESS',
          'Another resume is being measured. Wait for it to finish, then try again.',
        );

      const countPages = async (candidate) => {
        const rendered = await renderPdf(pool, {
          content,
          layout: candidate,
          templateId: resume.templateId,
          pageSize: resume.pageSize,
          timeoutMs: env.EXPORT_TIMEOUT_MS,
          accentColor: resume.accentColor ?? null,
          pattern: resume.backgroundPattern ?? 'none',
          photo,
        });
        return (await parsePdf(rendered.buffer)).pageCount;
      };
      // Errors are mapped here, so anyone waiting on the same measurement gets the same answer.
      const promise = fitToOnePage(layout ?? {}, countPages).catch((err) => {
        if (err instanceof HttpError) throw err;
        logger.error('fit to one page failed', { name: err.name, code: err.code });
        throw new HttpError(
          503,
          'EXPORT_UNAVAILABLE',
          "The page couldn't be measured right now. Try again in a moment.",
        );
      });
      fitRunning.set(String(userId), { key, promise });
      let result;
      try {
        result = await promise;
      } finally {
        fitRunning.delete(String(userId));
      }
      fitCache.set(key, result);
      if (fitCache.size > FIT_CACHE_MAX) fitCache.delete(fitCache.keys().next().value);
      return respond(result);
    },

    async list(userId, { page, limit, resumeId }) {
      const filter = { userId };
      if (resumeId) filter.resumeId = resumeId;
      const [items, total] = await Promise.all([
        ExportRecord.find(filter)
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        ExportRecord.countDocuments(filter),
      ]);
      return { items: items.map(publicExport), page, limit, total };
    },

    async get(userId, exportId) {
      const doc = await ExportRecord.findOne({ _id: exportId, userId }).lean();
      if (!doc) throw notFound();
      return publicExport(doc);
    },

    /** Ownership and expiry are checked before any file access. */
    async openDownload(userId, exportId) {
      const doc = await ExportRecord.findOne({ _id: exportId, userId }).lean();
      if (!doc) throw notFound();
      if (!publicExport(doc).downloadAvailable) {
        throw new HttpError(
          410,
          'EXPORT_EXPIRED',
          'This file is no longer available. Exports are kept for a short time; export again to get a new copy.',
        );
      }
      const path = filePath(doc.fileStorageKey, doc.format);
      const info = await stat(path).catch(() => null);
      if (!info)
        throw new HttpError(
          410,
          'EXPORT_EXPIRED',
          'This file is no longer available. Export again to get a new copy.',
        );
      const resume = await Resume.findOne(
        { _id: doc.resumeId, userId },
        { 'draft.content.contact.name': 1 },
      ).lean();
      const name = resume?.draft?.content?.contact?.name?.trim();
      return {
        stream: createReadStream(path),
        size: info.size,
        mime: FORMATS[doc.format].mime,
        disposition: contentDisposition(
          name ? `${name} resume` : doc.resumeTitle,
          FORMATS[doc.format].ext,
        ),
      };
    },

    async remove(userId, exportId) {
      const doc = await ExportRecord.findOne({ _id: exportId, userId }).lean();
      if (!doc) throw notFound();
      await removeFile(doc);
      await ExportRecord.deleteOne({ _id: doc._id });
    },

    async removeForResume(userId, resumeId) {
      const docs = await ExportRecord.find({ userId, resumeId }).lean();
      await Promise.all(docs.map(removeFile));
      return (await ExportRecord.deleteMany({ userId, resumeId })).deletedCount;
    },

    async removeForUser(userId) {
      const docs = await ExportRecord.find({ userId }).lean();
      await Promise.all(docs.map(removeFile));
      return (await ExportRecord.deleteMany({ userId })).deletedCount;
    },

    /** Delete expired files; keep their metadata records as export history. */
    async sweepExpired() {
      // trusted(): our own operators, exempt from the global sanitizeFilter.
      const expired = await ExportRecord.find({
        expiresAt: mongoose.trusted({ $lte: new Date() }),
        fileDeletedAt: null,
        fileStorageKey: mongoose.trusted({ $ne: null }),
      })
        .limit(500)
        .lean();
      for (const doc of expired) {
        await removeFile(doc);
        await ExportRecord.updateOne({ _id: doc._id }, { $set: { fileDeletedAt: new Date() } });
      }
      await this.sweepOrphans();
      return expired.length;
    },

    /** Remove files with no live record (e.g. a crash between write and insert) once past retention. */
    async sweepOrphans() {
      const names = await readdir(dir).catch(() => []);
      const cutoff = Date.now() - ttlMs;
      let removed = 0;
      for (const name of names) {
        const match = /^([A-Za-z0-9_-]+)\.(pdf|docx)$/.exec(name);
        if (!match) continue;
        const info = await stat(join(dir, name)).catch(() => null);
        if (!info || info.mtimeMs > cutoff) continue;
        const tracked = await ExportRecord.exists({
          fileStorageKey: match[1],
          fileDeletedAt: null,
        });
        if (!tracked) {
          await unlink(join(dir, name)).catch(() => {});
          removed += 1;
        }
      }
      return removed;
    },
  };
}
