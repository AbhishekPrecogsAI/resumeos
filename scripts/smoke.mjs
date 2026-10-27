// Smoke test against running dev servers: `npm run dev` in another terminal, then `npm run smoke`.
const api = process.env.API_URL ?? 'http://localhost:5000';
const client = process.env.CLIENT_URL ?? 'http://localhost:5173';

const checks = [
  ['server /health/live', `${api}/health/live`, (r, b) => r.status === 200 && b.status === 'ok'],
  [
    'server /health/ready',
    `${api}/health/ready`,
    (r, b) => r.status === 200 && b.checks?.database === 'up',
  ],
  ['client index', client, (r, b) => r.status === 200 && b.includes('<div id="root">')],
  [
    'client proxy /health/ready',
    `${client}/health/ready`,
    (r, b) => r.status === 200 && b.status === 'ok',
  ],
];

let failed = 0;
for (const [name, url, ok] of checks) {
  try {
    const res = await fetch(url);
    const text = await res.text();
    let body = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* html */
    }
    const pass = ok(res, body);
    if (!pass) failed++;
    console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  (${res.status})`);
  } catch (err) {
    failed++;
    console.log(`FAIL  ${name}  (${err.cause?.code ?? err.message})`);
  }
}
process.exit(failed ? 1 : 0);
