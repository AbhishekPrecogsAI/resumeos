import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { buildApp } from './helpers.js';

describe('health endpoints', () => {
  it('GET /health/live returns ok', async () => {
    const res = await request(buildApp()).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET /health/ready returns 200 when the database is up', async () => {
    const res = await request(buildApp({ isDbReady: () => true })).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', checks: { database: 'up' } });
  });

  it('GET /health/ready returns 503 when the database is down', async () => {
    const res = await request(buildApp({ isDbReady: () => false })).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.checks.database).toBe('down');
  });

  it('sets a request id and security headers', async () => {
    const res = await request(buildApp()).get('/health/live');
    expect(res.headers['x-request-id']).toMatch(/^[A-Za-z0-9._-]{8,}$/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('ignores an unsafe incoming request id', async () => {
    const res = await request(buildApp()).get('/health/live').set('x-request-id', '<script>');
    expect(res.headers['x-request-id']).not.toBe('<script>');
  });
});

describe('api basics', () => {
  it('GET /api/v1/meta reports version', async () => {
    const res = await request(buildApp()).get('/api/v1/meta');
    expect(res.status).toBe(200);
    expect(res.body.apiVersion).toBe('v1');
  });

  it('unknown routes return a consistent 404 error body', async () => {
    const res = await request(buildApp()).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.requestId).toBeTruthy();
  });

  it('malformed JSON returns 400 without a stack trace', async () => {
    const res = await request(buildApp())
      .post('/api/v1/meta')
      .set('content-type', 'application/json')
      .send('{bad');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.js/);
  });

  it('allows the configured origin and rejects others for CORS', async () => {
    const ok = await request(buildApp()).get('/health/live').set('origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const bad = await request(buildApp()).get('/health/live').set('origin', 'https://evil.example');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });
});
