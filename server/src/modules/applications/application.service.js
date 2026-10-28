import mongoose from 'mongoose';
import { ApplicationRecord, MAX_APPLICATIONS_PER_USER } from './application.model.js';
import { Resume } from '../resumes/resume.model.js';
import { ResumeVersion } from '../versions/version.model.js';
import { JobDescription } from '../jobs/job.model.js';
import { HttpError } from '../../utils/HttpError.js';

const notFound = () =>
  new HttpError(404, 'NOT_FOUND', "That application doesn't exist or isn't yours.");
const invalidLink = (path, message) =>
  new HttpError(400, 'VALIDATION_FAILED', 'Some fields need attention.', {
    fields: [{ location: 'body', path, message }],
  });

export function publicApplication(doc) {
  return {
    id: String(doc._id),
    company: doc.company,
    role: doc.role,
    status: doc.status,
    appliedAt: doc.appliedAt,
    nextFollowUpAt: doc.nextFollowUpAt,
    notes: doc.notes,
    jobDescriptionId: doc.jobDescriptionId ? String(doc.jobDescriptionId) : null,
    jobLabel: doc.jobLabel,
    resumeId: doc.resumeId ? String(doc.resumeId) : null,
    resumeVersionId: doc.resumeVersionId ? String(doc.resumeVersionId) : null,
    resumeLabel: doc.resumeLabel,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** Validate that linked records belong to the user, and capture labels for history. */
async function resolveLinks(userId, body, existing = {}) {
  const out = {};
  if ('jobDescriptionId' in body) {
    if (body.jobDescriptionId) {
      const job = await JobDescription.findOne(
        { _id: body.jobDescriptionId, userId },
        { title: 1, company: 1 },
      ).lean();
      if (!job) throw invalidLink('jobDescriptionId', "That job description doesn't exist.");
      out.jobDescriptionId = job._id;
      out.jobLabel = job.company ? `${job.title} at ${job.company}` : job.title;
    } else {
      out.jobDescriptionId = null;
    }
  }
  const resumeId =
    'resumeId' in body ? body.resumeId : existing.resumeId ? String(existing.resumeId) : null;
  if ('resumeId' in body || 'resumeVersionId' in body) {
    if (!resumeId) {
      if (body.resumeVersionId) throw invalidLink('resumeVersionId', 'Choose the resume first.');
      Object.assign(out, {
        resumeId: null,
        resumeVersionId: null,
        resumeLabel: 'resumeId' in body ? '' : existing.resumeLabel,
      });
    } else {
      const resume = await Resume.findOne({ _id: resumeId, userId }, { title: 1 }).lean();
      if (!resume) throw invalidLink('resumeId', "That resume doesn't exist.");
      out.resumeId = resume._id;
      out.resumeVersionId = null;
      out.resumeLabel = resume.title;
      if (body.resumeVersionId) {
        const v = await ResumeVersion.findOne(
          { _id: body.resumeVersionId, resumeId: resume._id, userId },
          { versionNumber: 1, name: 1 },
        ).lean();
        if (!v) throw invalidLink('resumeVersionId', "That version doesn't belong to this resume.");
        out.resumeVersionId = v._id;
        out.resumeLabel = `${resume.title}, v${v.versionNumber}: ${v.name}`;
      }
    }
  }
  return out;
}

export const applicationService = {
  async list(userId, { page, limit, status }) {
    const filter = { userId };
    if (status) filter.status = status;
    const [items, total] = await Promise.all([
      ApplicationRecord.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ApplicationRecord.countDocuments(filter),
    ]);
    return { items: items.map(publicApplication), page, limit, total };
  },

  /** Follow-ups due on or before `today` for applications still in progress. */
  async due(userId, today) {
    const items = await ApplicationRecord.find({
      userId,
      status: mongoose.trusted({ $in: ['planned', 'applied', 'interviewing'] }),
      nextFollowUpAt: mongoose.trusted({ $ne: '', $lte: today }),
    })
      .sort({ nextFollowUpAt: 1 })
      .limit(20)
      .lean();
    return items.map(publicApplication);
  },

  async create(userId, body) {
    if ((await ApplicationRecord.countDocuments({ userId })) >= MAX_APPLICATIONS_PER_USER) {
      throw new HttpError(
        409,
        'LIMIT_REACHED',
        `You can track up to ${MAX_APPLICATIONS_PER_USER} applications.`,
      );
    }
    const links = await resolveLinks(userId, body);
    const { jobDescriptionId: _j, resumeId: _r, resumeVersionId: _v, ...fields } = body;
    const doc = await ApplicationRecord.create({ userId, ...fields, ...links });
    return publicApplication(doc);
  },

  async get(userId, id) {
    const doc = await ApplicationRecord.findOne({ _id: id, userId }).lean();
    if (!doc) throw notFound();
    return publicApplication(doc);
  },

  async update(userId, id, body) {
    const existing = await ApplicationRecord.findOne({ _id: id, userId }).lean();
    if (!existing) throw notFound();
    const links = await resolveLinks(userId, body, existing);
    const { jobDescriptionId: _j, resumeId: _r, resumeVersionId: _v, ...fields } = body;
    const doc = await ApplicationRecord.findOneAndUpdate(
      { _id: id, userId },
      { $set: { ...fields, ...links } },
      { returnDocument: 'after', runValidators: true },
    ).lean();
    return publicApplication(doc);
  },

  async remove(userId, id) {
    const result = await ApplicationRecord.deleteOne({ _id: id, userId });
    if (!result.deletedCount) throw notFound();
  },

  // Keep the history readable when linked records go away: clear the id, keep the label.
  unlinkResume: (userId, resumeId) =>
    ApplicationRecord.updateMany(
      { userId, resumeId },
      { $set: { resumeId: null, resumeVersionId: null } },
    ),
  unlinkVersion: (userId, versionId) =>
    ApplicationRecord.updateMany(
      { userId, resumeVersionId: versionId },
      { $set: { resumeVersionId: null } },
    ),
  unlinkJob: (userId, jobId) =>
    ApplicationRecord.updateMany(
      { userId, jobDescriptionId: jobId },
      { $set: { jobDescriptionId: null } },
    ),
};
