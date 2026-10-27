import argon2 from 'argon2';

// OWASP-recommended Argon2id parameters (19 MiB, t=2, p=1).
const OPTIONS = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export function hashPassword(password) {
  return argon2.hash(password, OPTIONS);
}

export async function verifyPassword(hash, password) {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

// Verified against when no user matches, so response timing doesn't reveal registered emails.
let dummyHash;
export async function verifyAgainstDummy(password) {
  dummyHash ??= await hashPassword('not-a-real-password-placeholder');
  await verifyPassword(dummyHash, password);
  return false;
}
