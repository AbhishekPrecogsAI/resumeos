import mongoose from 'mongoose';
import { buildBaselines } from '@resumeos/shared/sync.js';
import { defaultLayout } from '@resumeos/shared/resumeModel.js';
import { getTemplate, DEFAULT_TEMPLATE_ID } from '@resumeos/shared/templates/index.js';
import { Resume, MAX_RESUMES_PER_USER } from './resume.model.js';
import { ResumeVersion } from '../versions/version.model.js';
import { CareerProfile } from '../profiles/profile.model.js';
import { resumeContentSchema, layoutSchema, baselinesSchema } from '../profiles/content.schema.js';
import { HttpError } from '../../utils/HttpError.js';
import { staleRevision } from '../../utils/revision.js';

const notFound = () => new HttpError(404, 'NOT_FOUND', "That resume doesn't exist or isn't yours.");

function fieldIssues(error, prefix) {
  return error.issues.map((i) => ({
    location: 'body',
    path: [prefix, ...i.path].join('.'),
    message: i.message,
  }));
}

/** Resume content is the profile minus private evidence items. */
function contentFromProfile(profileContent) {
  const { evidenceItems: _evidence, ...rest } = profileContent ?? {};
  return resumeContentSchema.parse(rest);
}

export function summary(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    targetRole: doc.targetRole,
    templateId: doc.templateId,
    pageSize: doc.pageSize,
    currentVersionId: doc.currentVersionId ? String(doc.currentVersionId) : null,
    jobId: doc.jobId ? String(doc.jobId) : null,
    archived: Boolean(doc.archivedAt),
    branchedFrom: doc.branchedFrom?.resumeId
      ? {
          resumeId: String(doc.branchedFrom.resumeId),
          versionId: doc.branchedFrom.versionId ? String(doc.branchedFrom.versionId) : null,
          versionNumber: doc.branchedFrom.versionNumber ?? null,
        }
      : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function detail(doc) {
  return {
    ...summary(doc),
    draftRevision: doc.draftRevision,
    draft: doc.draft,
    qualityDismissals: doc.qualityDismissals ?? [],
  };
}

function requireTemplate(templateId) {
  if (!getTemplate(templateId)) {
    throw new HttpError(400, 'VALIDATION_FAILED', 'Some fields need attention.', {
      fields: [{ location: 'body', path: 'templateId', message: 'Unknown template.' }],
    });
  }
}

async function assertUnderLimit(userId) {
  if ((await Resume.countDocuments({ userId })) >= MAX_RESUMES_PER_USER) {
    throw new HttpError(
      409,
      'LIMIT_REACHED',
      `You can keep up to ${MAX_RESUMES_PER_USER} resumes. Delete one to create another.`,
    );
  }
}

export const resumeService = {
  async list(userId, { page, limit, includeArchived }) {
    const filter = { userId };
    if (!includeArchived) filter.archivedAt = null;
    const [items, total] = await Promise.all([
      Resume.find(filter, { draft: 0 })
        .sort({ updatedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Resume.countDocuments(filter),
    ]);
    return { items: items.map(summary), page, limit, total };
  },

  async create(
    userId,
    { title, targetRole = '', templateId = DEFAULT_TEMPLATE_ID, pageSize = 'A4' },
  ) {
    requireTemplate(templateId);
    await assertUnderLimit(userId);
    const profile = await CareerProfile.findOne({ userId }).lean();
    const content = contentFromProfile(profile?.content);
    const doc = await Resume.create({
      userId,
      title,
      targetRole,
      templateId,
      pageSize,
      sourceProfileId: profile?._id ?? null,
      draft: { content, layout: defaultLayout(content), baselines: buildBaselines(content) },
    });
    return detail(doc);
  },

  async get(userId, resumeId) {
    const doc = await Resume.findOne({ _id: resumeId, userId }).lean();
    if (!doc) throw notFound();
    return detail(doc);
  },

  async update(userId, resumeId, changes) {
    if (changes.templateId) requireTemplate(changes.templateId);
    const set = { ...changes };
    if ('archived' in set) {
      set.archivedAt = set.archived ? new Date() : null;
      delete set.archived;
    }
    const doc = await Resume.findOneAndUpdate(
      { _id: resumeId, userId },
      { $set: set },
      { new: true, runValidators: true },
    ).lean();
    if (!doc) throw notFound();
    return detail(doc);
  },

  async saveDraft(userId, resumeId, expected, body) {
    const content = resumeContentSchema.safeParse(body.content);
    const layout = layoutSchema.safeParse(body.layout);
    const baselines = baselinesSchema.safeParse(body.baselines ?? {});
    const issues = [
      ...(content.success ? [] : fieldIssues(content.error, 'content')),
      ...(layout.success ? [] : fieldIssues(layout.error, 'layout')),
      ...(baselines.success ? [] : fieldIssues(baselines.error, 'baselines')),
    ];
    if (issues.length)
      throw new HttpError(400, 'VALIDATION_FAILED', 'Some fields need attention.', {
        fields: issues,
      });

    const doc = await Resume.findOneAndUpdate(
      { _id: resumeId, userId, draftRevision: expected },
      {
        $set: { draft: { content: content.data, layout: layout.data, baselines: baselines.data } },
        $inc: { draftRevision: 1 },
      },
      { new: true },
    ).lean();
    if (!doc) {
      const current = await Resume.findOne({ _id: resumeId, userId }, { draftRevision: 1 }).lean();
      if (!current) throw notFound();
      throw staleRevision(current.draftRevision);
    }
    return detail(doc);
  },

  /** Copy a resume, or branch from one of its saved versions (e.g. to tailor for another job). */
  async duplicate(userId, resumeId, { title, targetRole, fromVersionId } = {}) {
    const source = await Resume.findOne({ _id: resumeId, userId }).lean();
    if (!source) throw notFound();
    let version = null;
    if (fromVersionId) {
      version = await ResumeVersion.findOne({
        _id: fromVersionId,
        resumeId: source._id,
        userId,
      }).lean();
      if (!version) throw new HttpError(404, 'NOT_FOUND', "That version doesn't exist.");
    }
    await assertUnderLimit(userId);
    const doc = await Resume.create({
      userId,
      title: (
        title ??
        (version ? `${source.title} (from v${version.versionNumber})` : `${source.title} (copy)`)
      ).slice(0, 120),
      targetRole: targetRole ?? source.targetRole,
      templateId: version?.templateId ?? source.templateId,
      pageSize: version?.pageSize ?? source.pageSize,
      sourceProfileId: source.sourceProfileId,
      draft: structuredClone(version?.snapshot ?? source.draft),
      qualityDismissals: structuredClone(source.qualityDismissals ?? []),
      branchedFrom: {
        resumeId: source._id,
        versionId: version?._id ?? null,
        versionNumber: version?.versionNumber ?? null,
      },
    });
    return detail(doc);
  },

  async remove(userId, resumeId) {
    const result = await Resume.deleteOne({ _id: resumeId, userId });
    if (!result.deletedCount) throw notFound();
    // Dependent records (versions, exports) register their own cleanup via onResumeDeleted.
    await Promise.all(
      resumeService.deleteHooks.map((hook) => hook(userId, new mongoose.Types.ObjectId(resumeId))),
    );
  },

  deleteHooks: [],
};
