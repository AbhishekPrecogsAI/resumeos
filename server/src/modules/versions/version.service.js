import mongoose from 'mongoose';
import { contentHash } from '@resumeos/shared/hash.js';
import { diffResumes } from '@resumeos/shared/diff.js';
import { getTemplate } from '@resumeos/shared/templates/index.js';
import { ResumeVersion, MAX_VERSIONS_PER_RESUME } from './version.model.js';
import { Resume } from '../resumes/resume.model.js';
import { ExportRecord } from '../exports/export.model.js';
import { HttpError } from '../../utils/HttpError.js';
import { ApplicationRecord } from '../applications/application.model.js';
import { staleRevision } from '../../utils/revision.js';

const resumeNotFound = () =>
  new HttpError(404, 'NOT_FOUND', "That resume doesn't exist or isn't yours.");
const versionNotFound = () => new HttpError(404, 'NOT_FOUND', "That version doesn't exist.");

/** The hash both versions and exports use to tell whether two states have the same content. */
export const stateHash = ({ content, layout }) => contentHash({ content, layout });

export function versionSummary(doc, { exported = false } = {}) {
  return {
    id: String(doc._id),
    resumeId: String(doc.resumeId),
    versionNumber: doc.versionNumber,
    kind: doc.kind,
    name: doc.name,
    changeNote: doc.changeNote,
    parentVersionId: doc.parentVersionId ? String(doc.parentVersionId) : null,
    restoredFromVersionId: doc.restoredFromVersionId ? String(doc.restoredFromVersionId) : null,
    templateId: doc.templateId,
    templateVersion: doc.templateVersion,
    pageSize: doc.pageSize,
    accentColor: doc.accentColor ?? null,
    backgroundPattern: doc.backgroundPattern ?? 'none',
    contentHash: doc.contentHash,
    createdAt: doc.createdAt,
    exported,
  };
}

async function loadResume(userId, resumeId) {
  const resume = await Resume.findOne({ _id: resumeId, userId }).lean();
  if (!resume) throw resumeNotFound();
  return resume;
}

async function loadVersion(userId, resumeId, versionId) {
  const v = await ResumeVersion.findOne({ _id: versionId, resumeId, userId }).lean();
  if (!v) throw versionNotFound();
  return v;
}

async function nextNumber(userId, resumeId) {
  const r = await Resume.findOneAndUpdate(
    { _id: resumeId, userId },
    { $inc: { versionCounter: 1 } },
    { returnDocument: 'after', projection: { versionCounter: 1 } },
  ).lean();
  if (!r) throw resumeNotFound();
  return r.versionCounter;
}

async function assertCapacity(resumeId, needed = 1) {
  const count = await ResumeVersion.countDocuments({ resumeId });
  if (count + needed > MAX_VERSIONS_PER_RESUME) {
    throw new HttpError(
      409,
      'VERSION_LIMIT_REACHED',
      `A resume can keep up to ${MAX_VERSIONS_PER_RESUME} saved versions. Delete older versions to save new ones.`,
    );
  }
}

async function insertVersion(
  userId,
  resume,
  {
    name,
    changeNote = '',
    kind,
    snapshot,
    templateId,
    pageSize,
    accentColor = null,
    backgroundPattern = 'none',
    parentVersionId,
    restoredFromVersionId = null,
  },
) {
  const versionNumber = await nextNumber(userId, resume._id);
  const template = getTemplate(templateId);
  return ResumeVersion.create({
    userId,
    resumeId: resume._id,
    parentVersionId,
    restoredFromVersionId,
    versionNumber,
    kind,
    name: name || `Version ${versionNumber}`,
    changeNote,
    templateId,
    templateVersion: template?.version ?? 'unknown',
    pageSize,
    accentColor,
    backgroundPattern,
    snapshot: structuredClone(snapshot),
    contentHash: stateHash(snapshot),
    createdBy: userId,
  });
}

/** A comparable state: either the live draft or a saved version. */
async function stateFor(userId, resume, ref) {
  if (ref === 'draft') {
    return {
      meta: { type: 'draft', label: 'Current draft', draftRevision: resume.draftRevision },
      state: {
        ...resume.draft,
        templateId: resume.templateId,
        pageSize: resume.pageSize,
        accentColor: resume.accentColor ?? null,
        backgroundPattern: resume.backgroundPattern ?? 'none',
      },
    };
  }
  const v = await loadVersion(userId, resume._id, ref);
  return {
    meta: { ...versionSummary(v), type: 'version', label: `v${v.versionNumber}: ${v.name}` },
    state: {
      ...v.snapshot,
      templateId: v.templateId,
      pageSize: v.pageSize,
      accentColor: v.accentColor ?? null,
      backgroundPattern: v.backgroundPattern ?? 'none',
    },
  };
}

export const versionService = {
  async create(userId, resumeId, { name, changeNote }) {
    const resume = await loadResume(userId, resumeId);
    await assertCapacity(resume._id);
    const doc = await insertVersion(userId, resume, {
      name,
      changeNote,
      kind: 'manual',
      snapshot: resume.draft,
      templateId: resume.templateId,
      pageSize: resume.pageSize,
      accentColor: resume.accentColor ?? null,
      backgroundPattern: resume.backgroundPattern ?? 'none',
      parentVersionId: resume.currentVersionId,
    });
    await Resume.updateOne({ _id: resume._id, userId }, { $set: { currentVersionId: doc._id } });
    return versionSummary(doc);
  },

  async list(userId, resumeId, { page, limit }) {
    const resume = await loadResume(userId, resumeId);
    const filter = { userId, resumeId: resume._id };
    const [items, total, exportedIds] = await Promise.all([
      ResumeVersion.find(filter, { snapshot: 0 })
        .sort({ versionNumber: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ResumeVersion.countDocuments(filter),
      ExportRecord.distinct('resumeVersionId', { userId, resumeId: resume._id }),
    ]);
    const exported = new Set(exportedIds.filter(Boolean).map(String));
    return {
      items: items.map((v) => versionSummary(v, { exported: exported.has(String(v._id)) })),
      page,
      limit,
      total,
      currentVersionId: resume.currentVersionId ? String(resume.currentVersionId) : null,
      draftMatchesCurrent: await this.draftMatchesCurrent(resume),
    };
  },

  async draftMatchesCurrent(resume) {
    if (!resume.currentVersionId) return false;
    const current = await ResumeVersion.findOne(
      { _id: resume.currentVersionId },
      { contentHash: 1, templateId: 1, pageSize: 1, accentColor: 1, backgroundPattern: 1 },
    ).lean();
    return (
      Boolean(current) &&
      current.contentHash === stateHash(resume.draft) &&
      current.templateId === resume.templateId &&
      current.pageSize === resume.pageSize &&
      (current.accentColor ?? null) === (resume.accentColor ?? null) &&
      (current.backgroundPattern ?? 'none') === (resume.backgroundPattern ?? 'none')
    );
  },

  async get(userId, resumeId, versionId) {
    const resume = await loadResume(userId, resumeId);
    const v = await loadVersion(userId, resume._id, versionId);
    return { ...versionSummary(v), snapshot: v.snapshot };
  },

  /**
   * Restore an old version by creating a new one. If the draft has changes that aren't in any
   * saved version, they're saved first as an automatic version, so nothing is lost.
   */
  async restore(userId, resumeId, versionId) {
    const resume = await loadResume(userId, resumeId);
    const target = await loadVersion(userId, resume._id, versionId);
    const unsaved = !(await this.draftMatchesCurrent(resume));
    await assertCapacity(resume._id, unsaved ? 2 : 1);

    const created = [];
    let parent = resume.currentVersionId;
    if (unsaved) {
      const auto = await insertVersion(userId, resume, {
        name: `Before restoring v${target.versionNumber}`,
        changeNote: 'Saved automatically so the unsaved draft is kept.',
        kind: 'auto',
        snapshot: resume.draft,
        templateId: resume.templateId,
        pageSize: resume.pageSize,
        accentColor: resume.accentColor ?? null,
        backgroundPattern: resume.backgroundPattern ?? 'none',
        parentVersionId: parent,
      });
      created.push(auto);
      parent = auto._id;
    }
    const restored = await insertVersion(userId, resume, {
      name: `Restored v${target.versionNumber}: ${target.name}`.slice(0, 120),
      changeNote: '',
      kind: 'restore',
      snapshot: target.snapshot,
      templateId: target.templateId,
      pageSize: target.pageSize,
      accentColor: target.accentColor ?? null,
      backgroundPattern: target.backgroundPattern ?? 'none',
      parentVersionId: parent,
      restoredFromVersionId: target._id,
    });
    created.push(restored);

    const updated = await Resume.findOneAndUpdate(
      { _id: resume._id, userId, draftRevision: resume.draftRevision },
      {
        $set: {
          draft: structuredClone(target.snapshot),
          templateId: target.templateId,
          pageSize: target.pageSize,
          accentColor: target.accentColor ?? null,
          backgroundPattern: target.backgroundPattern ?? 'none',
          currentVersionId: restored._id,
        },
        $inc: { draftRevision: 1 },
      },
      { returnDocument: 'after' },
    ).lean();
    if (!updated) {
      // The draft changed while restoring (another tab saved). Undo our inserts and report the conflict.
      await ResumeVersion.deleteMany({ _id: mongoose.trusted({ $in: created.map((v) => v._id) }) });
      throw staleRevision(resume.draftRevision + 1);
    }
    return {
      resume: updated,
      restored: versionSummary(restored),
      autoSaved: unsaved ? versionSummary(created[0]) : null,
    };
  },

  async remove(userId, resumeId, versionId) {
    const resume = await loadResume(userId, resumeId);
    const v = await loadVersion(userId, resume._id, versionId);
    await ResumeVersion.deleteOne({ _id: v._id });
    await ApplicationRecord.updateMany(
      { userId, resumeVersionId: v._id },
      { $set: { resumeVersionId: null } },
    );
    if (String(resume.currentVersionId) === String(v._id)) {
      const latest = await ResumeVersion.findOne({ resumeId: resume._id }, { _id: 1 })
        .sort({ versionNumber: -1 })
        .lean();
      await Resume.updateOne(
        { _id: resume._id },
        { $set: { currentVersionId: latest?._id ?? null } },
      );
    }
  },

  async compare(userId, resumeId, leftRef, rightRef) {
    const resume = await loadResume(userId, resumeId);
    const [left, right] = await Promise.all([
      stateFor(userId, resume, leftRef),
      stateFor(userId, resume, rightRef),
    ]);
    return { left: left.meta, right: right.meta, diff: diffResumes(left.state, right.state) };
  },

  async removeForResume(userId, resumeId) {
    return (await ResumeVersion.deleteMany({ userId, resumeId })).deletedCount;
  },
};
