import { apiFetch, ApiError } from './client.js';

// /health/ready returns 503 with a JSON body when the DB is down; surface that body.
export async function getReadiness({ signal } = {}) {
  try {
    return await apiFetch('/health/ready', { signal });
  } catch (err) {
    if (err instanceof ApiError && err.status === 503) {
      return { status: 'unavailable', checks: { database: 'down' } };
    }
    throw err;
  }
}
