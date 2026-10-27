const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Stable record id like "exp_3fK9aQ2mZp1x". Works in browsers and Node (Web Crypto). */
export function newId(prefix) {
  const bytes = new Uint8Array(14);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `${prefix}_${out}`;
}

export const ID_PATTERN = /^[a-z]{1,6}_[A-Za-z0-9_-]{1,40}$/;
