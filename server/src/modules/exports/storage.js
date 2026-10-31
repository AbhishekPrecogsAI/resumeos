import { Readable } from 'node:stream';
import { mkdir, writeFile, unlink, stat, readdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, resolve } from 'node:path';
import mongoose from 'mongoose';

const EXT = { pdf: 'pdf', docx: 'docx' };
const ext = (format) => EXT[format] ?? 'pdf';

/**
 * Where export files live until they expire. Both stores keep a file under a random key and
 * hand it back as a stream; neither stores who owns it (the export record does).
 *
 *   disk:  a private directory on this server (one long-running process).
 *   mongo: a collection with a TTL index, for serverless hosts where each request may land on a
 *          different, short-lived instance with no shared disk. MongoDB removes expired files.
 */
export function createExportStorage(env) {
  return env.EXPORT_STORAGE === 'mongo' ? mongoStorage() : diskStorage(env.EXPORT_TEMP_DIR);
}

function diskStorage(directory) {
  const dir = resolve(directory);
  const path = (key, format) => join(dir, `${key}.${ext(format)}`);
  return {
    kind: 'disk',
    async put(key, format, buffer) {
      await mkdir(dir, { recursive: true, mode: 0o700 });
      await writeFile(path(key, format), buffer, { mode: 0o600 });
    },
    async open(key, format) {
      const info = await stat(path(key, format)).catch(() => null);
      return info ? { stream: createReadStream(path(key, format)), size: info.size } : null;
    },
    async remove(key, format) {
      await unlink(path(key, format)).catch((err) => {
        if (err.code !== 'ENOENT') throw err;
      });
    },
    /** Files older than `cutoff` (ms) with no live record, per `isTracked(key)`. */
    async removeOrphans(cutoff, isTracked) {
      const names = await readdir(dir).catch(() => []);
      let removed = 0;
      for (const name of names) {
        const match = /^([A-Za-z0-9_-]+)\.(pdf|docx)$/.exec(name);
        if (!match) continue;
        const info = await stat(join(dir, name)).catch(() => null);
        if (!info || info.mtimeMs > cutoff) continue;
        if (!(await isTracked(match[1]))) {
          await unlink(join(dir, name)).catch(() => {});
          removed += 1;
        }
      }
      return removed;
    },
  };
}

const exportFileSchema = new mongoose.Schema(
  {
    _id: { type: String },
    format: { type: String, enum: Object.keys(EXT), required: true },
    data: { type: Buffer, required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false },
);
// MongoDB deletes each file once its expiry passes (checked about once a minute).
exportFileSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const ExportFile =
  mongoose.models.ExportFile ?? mongoose.model('ExportFile', exportFileSchema);

function mongoStorage() {
  return {
    kind: 'mongo',
    async put(key, format, buffer, expiresAt) {
      await ExportFile.create({ _id: key, format, data: buffer, expiresAt });
    },
    async open(key, format) {
      const doc = await ExportFile.findOne({ _id: key, format }).lean();
      if (!doc) return null;
      const buffer = Buffer.from(doc.data.buffer ?? doc.data);
      return { stream: Readable.from([buffer]), size: buffer.length };
    },
    async remove(key) {
      await ExportFile.deleteOne({ _id: key });
    },
    // Expired files are removed by the TTL index; an orphan can't outlive its expiry.
    async removeOrphans() {
      return 0;
    },
  };
}
