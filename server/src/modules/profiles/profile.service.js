import { newId } from '@resumeos/shared/ids.js';
import { ID_PREFIX } from '@resumeos/shared/resumeModel.js';
import { CareerProfile, PROFILE_SCHEMA_VERSION } from './profile.model.js';
import { profileContentSchema, SECTION_SCHEMAS, pruneEvidenceRefs } from './content.schema.js';
import { HttpError } from '../../utils/HttpError.js';
import { staleRevision } from '../../utils/revision.js';

export function emptyProfileContent() {
  return profileContentSchema.parse({});
}

function toDto(doc) {
  if (!doc) return { revision: 0, content: emptyProfileContent(), updatedAt: null, exists: false };
  return { revision: doc.revision, content: doc.content, updatedAt: doc.updatedAt, exists: true };
}

function validateContent(content) {
  const result = profileContentSchema.safeParse(content);
  if (!result.success) {
    throw new HttpError(400, 'VALIDATION_FAILED', 'Some fields need attention.', {
      fields: result.error.issues.map((i) => ({
        location: 'body',
        path: i.path.join('.'),
        message: i.message,
      })),
    });
  }
  return pruneEvidenceRefs(result.data);
}

/** Write with an optimistic revision check. Revision 0 means "no profile saved yet". */
async function writeContent(userId, expected, content) {
  const valid = validateContent(content);
  if (expected === 0) {
    try {
      const doc = await CareerProfile.create({
        userId,
        revision: 1,
        schemaVersion: PROFILE_SCHEMA_VERSION,
        content: valid,
      });
      return toDto(doc);
    } catch (err) {
      if (err?.code !== 11000) throw err;
      const current = await CareerProfile.findOne({ userId }, { revision: 1 }).lean();
      throw staleRevision(current?.revision ?? 0);
    }
  }
  const doc = await CareerProfile.findOneAndUpdate(
    { userId, revision: expected },
    { $set: { content: valid, schemaVersion: PROFILE_SCHEMA_VERSION }, $inc: { revision: 1 } },
    { new: true },
  );
  if (!doc) {
    const current = await CareerProfile.findOne({ userId }, { revision: 1 }).lean();
    throw staleRevision(current?.revision ?? 0);
  }
  return toDto(doc);
}

async function loadAt(userId, expected) {
  const doc = await CareerProfile.findOne({ userId }).lean();
  const revision = doc?.revision ?? 0;
  if (revision !== expected) throw staleRevision(revision);
  return structuredClone(doc?.content ?? emptyProfileContent());
}

function entriesOf(content, section) {
  content[section] ??= [];
  return content[section];
}

function notFound() {
  return new HttpError(404, 'NOT_FOUND', 'That entry no longer exists in your profile.');
}

export const profileService = {
  async get(userId) {
    return toDto(await CareerProfile.findOne({ userId }).lean());
  },

  replace(userId, expected, content) {
    return writeContent(userId, expected, content);
  },

  async addEntry(userId, expected, section, entry, { position } = {}) {
    const content = await loadAt(userId, expected);
    const list = entriesOf(content, section);
    const created = { ...entry, id: entry.id ?? newId(ID_PREFIX[section]) };
    if (list.some((e) => e.id === created.id))
      throw new HttpError(409, 'DUPLICATE_ID', 'An entry with this id already exists.');
    const parsed = SECTION_SCHEMAS[section].safeParse(created);
    if (!parsed.success) validateContent({ ...content, [section]: [...list, created] });
    if (position === 'start') list.unshift(parsed.data);
    else list.push(parsed.data);
    const dto = await writeContent(userId, expected, content);
    return { ...dto, entry: parsed.data };
  },

  async updateEntry(userId, expected, section, entryId, changes) {
    const content = await loadAt(userId, expected);
    const list = entriesOf(content, section);
    const index = list.findIndex((e) => e.id === entryId);
    if (index < 0) throw notFound();
    list[index] = { ...list[index], ...changes, id: entryId };
    const dto = await writeContent(userId, expected, content);
    return { ...dto, entry: dto.content[section][index] };
  },

  async deleteEntry(userId, expected, section, entryId) {
    const content = await loadAt(userId, expected);
    const list = entriesOf(content, section);
    if (!list.some((e) => e.id === entryId)) throw notFound();
    content[section] = list.filter((e) => e.id !== entryId);
    return writeContent(userId, expected, content);
  },
};
