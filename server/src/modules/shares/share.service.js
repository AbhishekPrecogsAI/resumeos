import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { getTemplate } from '@resumeos/shared/templates/index.js';
import { shareableResume } from '@resumeos/shared/sharing.js';
import { ShareLink, MAX_SHARES_PER_RESUME } from './share.model.js';
import { Resume } from '../resumes/resume.model.js';
import { ResumeVersion } from '../versions/version.model.js';
import { photoService } from '../photos/photo.service.js';
import { renderPdf } from '../exports/render.js';
import { contentDisposition } from '../exports/export.service.js';
import { HttpError } from '../../utils/HttpError.js';

const DAY_MS = 24 * 60 * 60_000;
export const EXPIRY_DAYS = [7, 30, 90];

const resumeNotFound = () =>
  new HttpError(404, 'NOT_FOUND', "That resume doesn't exist or isn't yours.");
const shareNotFound = () =>
  new HttpError(404, 'NOT_FOUND', "That share link doesn't exist or isn't yours.");
// One answer for unknown, turned-off and broken links, so a token reveals nothing either way.
const unavailable = () =>
  new HttpError(404, 'SHARE_UNAVAILABLE', "This link isn't active. Ask the owner for a new one.");
const expired = () =>
  new HttpError(410, 'SHARE_EXPIRED', 'This link has expired. Ask the owner for a new one.');

const expiryFrom = (days) => (days ? new Date(Date.now() + days * DAY_MS) : null);

/** `versions` maps version id → version for the link's resume; null when not looked up. */
export function publicShare(doc, versions = null) {
  const versionId = doc.versionId ? String(doc.versionId) : null;
  const version = versionId ? versions?.get(versionId) : null;
  return {
    id: String(doc._id),
    resumeId: String(doc.resumeId),
    path: `/r/${doc.token}`,
    label: doc.label ?? '',
    versionId,
    versionLabel: version ? `v${version.versionNumber}: ${version.name}` : null,
    // The saved version was deleted, so the link shows nothing until it's changed or removed.
    versionMissing: Boolean(versionId && versions && !version),
    allowDownload: Boolean(doc.allowDownload),
    hideContactDetails: Boolean(doc.hideContactDetails),
    enabled: doc.enabled !== false,
    expiresAt: doc.expiresAt ?? null,
    expired: Boolean(doc.expiresAt && new Date(doc.expiresAt).getTime() <= Date.now()),
    viewCount: doc.viewCount ?? 0,
    lastViewedAt: doc.lastViewedAt ?? null,
    downloadCount: doc.downloadCount ?? 0,
    createdAt: doc.createdAt,
  };
}

async function ownedResume(userId, resumeId) {
  const resume = await Resume.findOne({ _id: resumeId, userId }, { _id: 1 }).lean();
  if (!resume) throw resumeNotFound();
  return resume;
}

async function assertVersion(userId, resumeId, versionId) {
  if (!versionId) return;
  const exists = await ResumeVersion.exists({ _id: versionId, resumeId, userId });
  if (!exists)
    throw new HttpError(400, 'VALIDATION_FAILED', 'Some fields need attention.', {
      fields: [{ location: 'body', path: 'versionId', message: "That version doesn't exist." }],
    });
}

async function versionMap(userId, resumeId, docs) {
  const ids = [...new Set(docs.map((d) => d.versionId && String(d.versionId)).filter(Boolean))];
  if (!ids.length) return new Map();
  // trusted(): our own operator, exempt from the global sanitizeFilter.
  const versions = await ResumeVersion.find(
    { userId, resumeId, _id: mongoose.trusted({ $in: ids }) },
    { versionNumber: 1, name: 1 },
  ).lean();
  return new Map(versions.map((v) => [String(v._id), v]));
}

/** The live link's resume as viewers see it: settings, visible content and photo. */
async function resolve(token) {
  const share = await ShareLink.findOne({ token }).lean();
  if (!share || share.enabled === false) throw unavailable();
  if (share.expiresAt && new Date(share.expiresAt).getTime() <= Date.now()) throw expired();
  const resume = await Resume.findOne({ _id: share.resumeId, userId: share.userId }).lean();
  if (!resume) throw unavailable();

  let source = {
    content: resume.draft.content,
    layout: resume.draft.layout,
    templateId: resume.templateId,
    pageSize: resume.pageSize,
    accentColor: resume.accentColor ?? null,
    backgroundPattern: resume.backgroundPattern ?? 'none',
    updatedAt: resume.updatedAt,
  };
  if (share.versionId) {
    const v = await ResumeVersion.findOne({
      _id: share.versionId,
      resumeId: resume._id,
      userId: share.userId,
    }).lean();
    if (!v) throw unavailable();
    source = {
      content: v.snapshot.content,
      layout: v.snapshot.layout,
      templateId: v.templateId,
      pageSize: v.pageSize,
      accentColor: v.accentColor ?? null,
      backgroundPattern: v.backgroundPattern ?? 'none',
      updatedAt: v.createdAt,
    };
  }
  const template = getTemplate(source.templateId);
  if (!template) throw unavailable();
  const { content, layout } = shareableResume(source.content, source.layout, {
    hideContactDetails: share.hideContactDetails,
  });
  const photo =
    layout.showPhoto && template.photo ? await photoService.dataUrlFor(share.userId) : null;
  return { share, source, content, layout, photo };
}

export function createShareService({ env, pool, logger }) {
  return {
    async list(userId, resumeId) {
      await ownedResume(userId, resumeId);
      const docs = await ShareLink.find({ userId, resumeId }).sort({ createdAt: -1 }).lean();
      const versions = await versionMap(userId, resumeId, docs);
      return docs.map((d) => publicShare(d, versions));
    },

    async create(userId, resumeId, body) {
      await ownedResume(userId, resumeId);
      await assertVersion(userId, resumeId, body.versionId);
      const count = await ShareLink.countDocuments({ userId, resumeId });
      if (count >= MAX_SHARES_PER_RESUME)
        throw new HttpError(
          409,
          'SHARE_LIMIT_REACHED',
          `A resume can have up to ${MAX_SHARES_PER_RESUME} share links. Delete ones you no longer use.`,
        );
      const doc = await ShareLink.create({
        userId,
        resumeId,
        token: randomBytes(18).toString('base64url'),
        label: body.label ?? '',
        versionId: body.versionId ?? null,
        allowDownload: body.allowDownload ?? false,
        hideContactDetails: body.hideContactDetails ?? false,
        expiresAt: expiryFrom(body.expiresInDays),
      });
      const versions = await versionMap(userId, resumeId, [doc]);
      return publicShare(doc.toObject(), versions);
    },

    async update(userId, resumeId, shareId, changes) {
      const set = {};
      for (const key of ['label', 'allowDownload', 'hideContactDetails', 'enabled'])
        if (key in changes) set[key] = changes[key];
      if ('expiresInDays' in changes) set.expiresAt = expiryFrom(changes.expiresInDays);
      const doc = await ShareLink.findOneAndUpdate(
        { _id: shareId, resumeId, userId },
        { $set: set },
        { returnDocument: 'after', runValidators: true },
      ).lean();
      if (!doc) throw shareNotFound();
      const versions = await versionMap(userId, resumeId, [doc]);
      return publicShare(doc, versions);
    },

    async remove(userId, resumeId, shareId) {
      const { deletedCount } = await ShareLink.deleteOne({ _id: shareId, resumeId, userId });
      if (!deletedCount) throw shareNotFound();
    },

    async removeForResume(userId, resumeId) {
      return (await ShareLink.deleteMany({ userId, resumeId })).deletedCount;
    },

    /** What a viewer gets. Counts the open; never reveals the owner's account or resume title. */
    async view(token) {
      const { share, source, content, layout, photo } = await resolve(token);
      await ShareLink.updateOne(
        { _id: share._id },
        { $inc: { viewCount: 1 }, $set: { lastViewedAt: new Date() } },
      );
      return {
        name: content.contact?.name?.trim() || 'Resume',
        headline: content.headline ?? '',
        content,
        layout,
        photo,
        templateId: source.templateId,
        pageSize: source.pageSize,
        accentColor: source.accentColor,
        backgroundPattern: source.backgroundPattern,
        updatedAt: source.updatedAt,
        allowDownload: Boolean(share.allowDownload),
        expiresAt: share.expiresAt ?? null,
      };
    },

    async pdf(token) {
      const { share, source, content, layout, photo } = await resolve(token);
      if (!share.allowDownload)
        throw new HttpError(
          403,
          'DOWNLOAD_NOT_ALLOWED',
          "The owner hasn't allowed downloads for this link.",
        );
      let rendered;
      try {
        rendered = await renderPdf(pool, {
          content,
          layout,
          templateId: source.templateId,
          pageSize: source.pageSize,
          timeoutMs: env.EXPORT_TIMEOUT_MS,
          accentColor: source.accentColor,
          pattern: source.backgroundPattern,
          photo,
        });
      } catch (err) {
        if (err instanceof HttpError) throw err;
        logger.error('shared pdf render failed', { name: err.name, code: err.code });
        throw new HttpError(
          503,
          'EXPORT_UNAVAILABLE',
          "The PDF couldn't be generated right now. Try again in a moment.",
        );
      }
      await ShareLink.updateOne({ _id: share._id }, { $inc: { downloadCount: 1 } });
      const name = content.contact?.name?.trim();
      return {
        buffer: rendered.buffer,
        disposition: contentDisposition(name ? `${name} resume` : 'resume', 'pdf'),
      };
    },
  };
}
