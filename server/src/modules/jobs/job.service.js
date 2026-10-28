import { extractTerms } from '@resumeos/shared/jobs/extract.js';
import { coverage } from '@resumeos/shared/jobs/coverage.js';
import { JobDescription, MAX_JOBS_PER_USER } from './job.model.js';
import { Resume } from '../resumes/resume.model.js';
import { ResumeVersion } from '../versions/version.model.js';
import { CareerProfile } from '../profiles/profile.model.js';
import { HttpError } from '../../utils/HttpError.js';
import { ApplicationRecord } from '../applications/application.model.js';

const notFound = () =>
  new HttpError(404, 'NOT_FOUND', "That job description doesn't exist or isn't yours.");

export function jobSummary(doc) {
  return {
    id: String(doc._id),
    title: doc.title,
    company: doc.company,
    termCount: (doc.userTerms ?? doc.extractedTerms ?? []).length,
    termsEdited: Array.isArray(doc.userTerms),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function jobDetail(doc) {
  return {
    ...jobSummary(doc),
    descriptionText: doc.descriptionText,
    extractedTerms: doc.extractedTerms,
    terms: doc.userTerms ?? doc.extractedTerms,
  };
}

/** The resume state to compare: its draft, or a specific saved version. */
async function resumeState(userId, resumeId, versionId) {
  const resume = await Resume.findOne(
    { _id: resumeId, userId },
    { draft: 1, title: 1, draftRevision: 1 },
  ).lean();
  if (!resume) throw new HttpError(404, 'NOT_FOUND', "That resume doesn't exist or isn't yours.");
  if (!versionId)
    return {
      state: resume.draft,
      source: {
        resumeId: String(resume._id),
        resumeTitle: resume.title,
        versionId: null,
        label: 'Current draft',
      },
    };
  const v = await ResumeVersion.findOne(
    { _id: versionId, resumeId: resume._id, userId },
    { snapshot: 1, versionNumber: 1, name: 1 },
  ).lean();
  if (!v) throw new HttpError(404, 'NOT_FOUND', "That version doesn't exist.");
  return {
    state: v.snapshot,
    source: {
      resumeId: String(resume._id),
      resumeTitle: resume.title,
      versionId: String(v._id),
      label: `v${v.versionNumber}: ${v.name}`,
    },
  };
}

async function profileContent(userId) {
  const p = await CareerProfile.findOne({ userId }, { content: 1 }).lean();
  return p?.content ?? {};
}

export const jobService = {
  async create(userId, { title, company = '', descriptionText }) {
    if ((await JobDescription.countDocuments({ userId })) >= MAX_JOBS_PER_USER) {
      throw new HttpError(
        409,
        'LIMIT_REACHED',
        `You can save up to ${MAX_JOBS_PER_USER} job descriptions. Delete some to add more.`,
      );
    }
    const doc = await JobDescription.create({
      userId,
      title,
      company,
      descriptionText,
      extractedTerms: extractTerms(descriptionText),
    });
    return jobDetail(doc);
  },

  async list(userId, { page, limit }) {
    const [items, total] = await Promise.all([
      JobDescription.find({ userId }, { descriptionText: 0 })
        .sort({ updatedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      JobDescription.countDocuments({ userId }),
    ]);
    return { items: items.map(jobSummary), page, limit, total };
  },

  async get(userId, jobId) {
    const doc = await JobDescription.findOne({ _id: jobId, userId }).lean();
    if (!doc) throw notFound();
    return jobDetail(doc);
  },

  async update(userId, jobId, { title, company, descriptionText, terms, resetTerms }) {
    const set = {};
    if (title !== undefined) set.title = title;
    if (company !== undefined) set.company = company;
    if (descriptionText !== undefined) {
      set.descriptionText = descriptionText;
      set.extractedTerms = extractTerms(descriptionText);
    }
    if (terms !== undefined) set.userTerms = terms;
    if (resetTerms) set.userTerms = null;
    const doc = await JobDescription.findOneAndUpdate(
      { _id: jobId, userId },
      { $set: set },
      { returnDocument: 'after' },
    ).lean();
    if (!doc) throw notFound();
    return jobDetail(doc);
  },

  /** Re-run extraction. The user's edited list is kept; the response shows the fresh extraction. */
  async reextract(userId, jobId) {
    const doc = await JobDescription.findOne({ _id: jobId, userId }).lean();
    if (!doc) throw notFound();
    const extractedTerms = extractTerms(doc.descriptionText);
    await JobDescription.updateOne({ _id: doc._id }, { $set: { extractedTerms } });
    return jobDetail({ ...doc, extractedTerms });
  },

  async remove(userId, jobId) {
    const result = await JobDescription.deleteOne({ _id: jobId, userId });
    if (!result.deletedCount) throw notFound();
    await Resume.updateMany({ userId, jobId }, { $set: { jobId: null } });
    await ApplicationRecord.updateMany(
      { userId, jobDescriptionId: jobId },
      { $set: { jobDescriptionId: null } },
    );
  },

  async match(userId, jobId, { resumeId, versionId }) {
    const job = await JobDescription.findOne({ _id: jobId, userId }).lean();
    if (!job) throw notFound();
    const [{ state, source }, profile] = await Promise.all([
      resumeState(userId, resumeId, versionId),
      profileContent(userId),
    ]);
    return { source, report: coverage(job.userTerms ?? job.extractedTerms, state, profile) };
  },

  /** Analyse without saving anything. */
  async analyze(userId, { descriptionText, terms, resumeId }) {
    const extracted = extractTerms(descriptionText);
    const used = terms ?? extracted;
    if (!resumeId) return { extractedTerms: extracted, terms: used, source: null, report: null };
    const [{ state, source }, profile] = await Promise.all([
      resumeState(userId, resumeId),
      profileContent(userId),
    ]);
    return {
      extractedTerms: extracted,
      terms: used,
      source,
      report: coverage(used, state, profile),
    };
  },

  async assertOwned(userId, jobId) {
    if (!(await JobDescription.exists({ _id: jobId, userId }))) {
      throw new HttpError(400, 'VALIDATION_FAILED', 'Some fields need attention.', {
        fields: [
          { location: 'body', path: 'jobId', message: "That job description doesn't exist." },
        ],
      });
    }
  },
};
