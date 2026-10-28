import { ProfilePhoto } from './photo.model.js';
import { HttpError } from '../../utils/HttpError.js';

export const MAX_PHOTO_BYTES = 300 * 1024;
const MIN_SIDE = 64;
const MAX_SIDE = 2000;

const invalid = (message) =>
  new HttpError(400, 'VALIDATION_FAILED', 'Some fields need attention.', {
    fields: [{ location: 'body', path: 'dataUrl', message }],
  });

/** Read image dimensions from the file itself; the declared type isn't trusted. */
export function inspectImage(buffer) {
  if (
    buffer.length > 24 &&
    buffer.readUInt32BE(0) === 0x89504e47 &&
    buffer.readUInt32BE(4) === 0x0d0a1a0a
  ) {
    return { mime: 'image/png', width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    // Walk JPEG segments to the first start-of-frame marker.
    let i = 2;
    while (i + 9 < buffer.length) {
      if (buffer[i] !== 0xff) return null;
      const marker = buffer[i + 1];
      const length = buffer.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return {
          mime: 'image/jpeg',
          height: buffer.readUInt16BE(i + 5),
          width: buffer.readUInt16BE(i + 7),
        };
      }
      i += 2 + length;
    }
  }
  return null;
}

const toDataUrl = (doc) => `data:${doc.mime};base64,${doc.data.toString('base64')}`;

export const photoService = {
  async get(userId) {
    const doc = await ProfilePhoto.findOne({ userId }).lean();
    return doc
      ? { dataUrl: toDataUrl(doc), width: doc.width, height: doc.height, updatedAt: doc.updatedAt }
      : null;
  },

  /** Data URL for rendering, or null. */
  async dataUrlFor(userId) {
    const doc = await ProfilePhoto.findOne({ userId }).lean();
    return doc ? toDataUrl(doc) : null;
  },

  async put(userId, dataUrl) {
    const match = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
    if (!match) throw invalid('Upload a JPEG or PNG image.');
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > MAX_PHOTO_BYTES)
      throw invalid(
        'The photo is larger than 300 KB. It should be resized automatically; try a different image.',
      );
    const info = inspectImage(buffer);
    if (!info || info.mime !== match[1])
      throw invalid("That file isn't a valid JPEG or PNG image.");
    if (
      info.width < MIN_SIDE ||
      info.height < MIN_SIDE ||
      info.width > MAX_SIDE ||
      info.height > MAX_SIDE
    ) {
      throw invalid(`Use an image between ${MIN_SIDE} and ${MAX_SIDE} pixels on each side.`);
    }
    const doc = await ProfilePhoto.findOneAndUpdate(
      { userId },
      { $set: { mime: info.mime, data: buffer, width: info.width, height: info.height } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).lean();
    return {
      dataUrl: toDataUrl(doc),
      width: doc.width,
      height: doc.height,
      updatedAt: doc.updatedAt,
    };
  },

  async remove(userId) {
    return (await ProfilePhoto.deleteOne({ userId })).deletedCount;
  },
};
