import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import {
  buildApp,
  connectTestDb,
  dropTestDb,
  clearCollections,
  makeEnv,
  registerUser,
} from './helpers.js';
import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';
import { TEMPLATES } from '@resumeos/shared/templates/index.js';
import { createBrowserPool, findChrome } from '../src/modules/exports/browser.js';
import { renderPdf } from '../src/modules/exports/render.js';
import { renderDocx } from '../src/modules/exports/docx.js';
import { validatePdf } from '../src/modules/exports/validate.js';
import { FIXTURES } from './fixtures/resumes.js';
import { defaultLayout } from '@resumeos/shared/resumeModel.js';

const hasChrome = Boolean(findChrome(process.env.CHROME_PATH));
let dir;
let app;
let pool;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'resumeos-design-'));
  pool = createBrowserPool({
    chromePath: process.env.CHROME_PATH,
    logger: { info() {}, warn() {}, error() {} },
  });
  app = buildApp({ env: makeEnv({ EXPORT_TEMP_DIR: dir }), pdfPool: pool });
  await connectTestDb();
});
afterAll(async () => {
  await pool.close();
  await dropTestDb();
  await rm(dir, { recursive: true, force: true });
});
beforeEach(clearCollections);

async function setup() {
  const u = await registerUser(app);
  await u.client.put('/api/v1/profile').set('if-match', '0').send({ content: sampleResume });
  const resume = (
    await u.client.post('/api/v1/resumes').send({ title: 'Design', templateId: 'meridian' })
  ).body.resume;
  const base = `/api/v1/resumes/${resume.id}`;
  let revision = resume.draftRevision;
  const save = async (layout, content = resume.draft.content) => {
    const res = await u.client
      .put(`${base}/draft`)
      .set('if-match', String(revision))
      .send({ content, layout });
    if (res.status === 200) revision = res.body.resume.draftRevision;
    return res;
  };
  return { ...u, resume, base, save };
}

describe('languages and interests in stored content', () => {
  it('copies them from the profile into new resumes and validates levels', async () => {
    const { resume, save } = await setup();
    expect(resume.draft.content.languages.map((l) => l.name)).toEqual(['Swedish', 'English']);
    expect(resume.draft.content.interests).toEqual([]);
    const bad = await save(resume.draft.layout, {
      ...resume.draft.content,
      languages: [{ id: 'lang_1', name: 'Dutch', level: 'expert' }],
    });
    expect(bad.status).toBe(400);
  });
});

describe('design settings in the layout', () => {
  it('saves font, size, spacing and placement, and rejects anything else', async () => {
    const { resume, save, client, base } = await setup();
    const layout = {
      ...resume.draft.layout,
      font: 'Lora',
      fontScale: 0.9,
      spacing: 'compact',
      placement: { projects: 'side', skills: 'main' },
    };
    expect((await save(layout)).status).toBe(200);
    expect((await client.get(base)).body.resume.draft.layout).toMatchObject({
      font: 'Lora',
      fontScale: 0.9,
      spacing: 'compact',
      placement: { projects: 'side', skills: 'main' },
    });

    for (const wrong of [
      { fontScale: 2 },
      { fontScale: '0.9' },
      { spacing: 'cosy' },
      { font: 'Comic Sans' },
      { placement: { skills: 'top' } },
      { placement: { nonsense: 'side' } },
      { sidebarSide: 'top' },
    ])
      expect([wrong, (await save({ ...resume.draft.layout, ...wrong })).status]).toEqual([
        wrong,
        400,
      ]);
  });

  it("doesn't add design keys to layouts that never set them", async () => {
    const { resume, save, client, base } = await setup();
    expect((await save(resume.draft.layout)).status).toBe(200);
    const stored = (await client.get(base)).body.resume.draft.layout;
    for (const key of ['font', 'fontScale', 'spacing', 'placement'])
      expect(stored).not.toHaveProperty(key);
  });

  it('DOCX uses the matching Word font for a chosen font', async () => {
    const docx = await renderDocx({
      content: sampleResume,
      layout: { ...defaultLayout(sampleResume), font: 'Lora' },
      templateId: 'clarity',
      pageSize: 'A4',
    });
    const styles = await (await JSZip.loadAsync(docx)).file('word/styles.xml').async('string');
    expect(styles).toContain('Georgia');
  });

  it.skipIf(!hasChrome)(
    'every template passes the export checks with every setting changed at once',
    async () => {
      for (const t of TEMPLATES) {
        const content = FIXTURES.multiPage;
        const layout = {
          ...defaultLayout(content),
          font: 'Inter',
          fontScale: 0.85,
          spacing: 'compact',
          placement: t.sideSections ? { projects: 'side', skills: 'main' } : undefined,
        };
        const out = await renderPdf(pool, {
          content,
          layout,
          templateId: t.id,
          pageSize: 'A4',
          timeoutMs: 30_000,
        });
        const v = await validatePdf(out.buffer, out);
        expect([t.id, v.checks.filter((c) => c.result !== 'pass')]).toEqual([t.id, []]);
        // The chosen font is embedded, so the PDF looks the same everywhere.
        expect([t.id, out.buffer.toString('latin1').includes('Inter')]).toEqual([t.id, true]);
      }
    },
    240_000,
  );

  it.skipIf(!hasChrome)(
    'smaller text and compact spacing make the PDF shorter',
    async () => {
      const content = FIXTURES.multiPage;
      const pages = async (extra) => {
        const out = await renderPdf(pool, {
          content,
          layout: { ...defaultLayout(content), ...extra },
          templateId: 'clarity',
          pageSize: 'A4',
          timeoutMs: 30_000,
        });
        return (await validatePdf(out.buffer, out)).pageCount;
      };
      const normal = await pages({});
      expect(await pages({ spacing: 'compact', fontScale: 0.85 })).toBeLessThan(normal);
      expect(await pages({ spacing: 'relaxed', fontScale: 1.2 })).toBeGreaterThan(normal);
    },
    60_000,
  );
});

describe('fit to one page', () => {
  it.skipIf(!hasChrome)(
    'finds settings that really fit, using the saved draft, and saves nothing',
    async () => {
      const { resume, save, client, base } = await setup();
      // Just over a page on Meridian: the sample plus three long roles.
      const content = {
        ...resume.draft.content,
        experience: [
          ...resume.draft.content.experience,
          ...FIXTURES.multiPage.experience.slice(0, 3).map((x, i) => ({
            ...x,
            id: `exp_extra${i}`,
            bullets: x.bullets.map((b, j) => ({ ...b, id: `b_extra${i}_${j}` })),
          })),
        ],
      };
      expect((await save(resume.draft.layout, content)).status).toBe(200);
      const res = await client.post(`${base}/fit-one-page`).send({});
      expect(res.status).toBe(200);
      expect(res.body.alreadyFits).toBe(false);
      expect(res.body.pages).toBe(1);
      expect(res.body.settings.spacing).toBe('compact');
      expect(res.body.settings.fontScale).toBeGreaterThanOrEqual(0.85);
      expect((await client.get(base)).body.resume.draft.layout).not.toHaveProperty('spacing');

      // Applying the settings really produces a one-page PDF.
      const out = await renderPdf(pool, {
        content,
        layout: { ...resume.draft.layout, ...res.body.settings },
        templateId: 'meridian',
        pageSize: 'A4',
        timeoutMs: 30_000,
      });
      expect((await validatePdf(out.buffer, out)).pageCount).toBe(1);
    },
    120_000,
  );

  it.skipIf(!hasChrome)(
    'says so when nothing fits, and when it already fits',
    async () => {
      const { resume, save, client, base } = await setup();
      expect((await client.post(`${base}/fit-one-page`).send({})).body).toMatchObject({
        alreadyFits: true,
        pages: 1,
      });
      await save(resume.draft.layout, FIXTURES.multiPage);
      const res = await client.post(`${base}/fit-one-page`).send({});
      expect(res.body).toMatchObject({ alreadyFits: false, settings: null });
      expect(res.body.pages).toBeGreaterThan(1);
    },
    120_000,
  );

  it('rejects other users and bodies', async () => {
    const { base, client } = await setup();
    const other = await registerUser(app);
    expect((await other.client.post(`${base}/fit-one-page`).send({})).status).toBe(404);
    expect((await client.post(`${base}/fit-one-page`).send({ fontScale: 0.5 })).status).toBe(400);
  });
});

describe('fit to one page: cost controls', () => {
  // Same app, but counting PDF renders.
  let counting;
  let countingApp;
  beforeAll(() => {
    counting = {
      renders: 0,
      withPage(fn) {
        this.renders += 1;
        return pool.withPage(fn);
      },
      close: async () => {},
    };
    countingApp = buildApp({ env: makeEnv({ EXPORT_TEMP_DIR: dir }), pdfPool: counting });
  });

  async function twoResumes() {
    const u = await registerUser(countingApp);
    await u.client.put('/api/v1/profile').set('if-match', '0').send({ content: sampleResume });
    const make = async () =>
      (await u.client.post('/api/v1/resumes').send({ title: 'R', templateId: 'clarity' })).body
        .resume;
    return { ...u, a: await make(), b: await make() };
  }

  it.skipIf(!hasChrome)(
    'a repeat on an unchanged resume renders nothing',
    async () => {
      const { client, a } = await twoResumes();
      const url = `/api/v1/resumes/${a.id}/fit-one-page`;
      const first = await client.post(url).send({});
      expect(first.status).toBe(200);
      const after = counting.renders;
      expect(after).toBeGreaterThan(0);
      const again = await client.post(url).send({});
      expect(again.body).toEqual(first.body);
      expect(counting.renders).toBe(after);

      // Any change to what the PDF depends on measures again.
      await client.patch(`/api/v1/resumes/${a.id}`).send({ pageSize: 'Letter' });
      await client.post(url).send({});
      expect(counting.renders).toBeGreaterThan(after);
    },
    60_000,
  );

  it.skipIf(!hasChrome)(
    'one measurement at a time per person; the same one is shared',
    async () => {
      const { client, a, b } = await twoResumes();
      const before = counting.renders;
      const [x, y] = await Promise.all([
        client.post(`/api/v1/resumes/${a.id}/fit-one-page`).send({}),
        client.post(`/api/v1/resumes/${a.id}/fit-one-page`).send({}),
      ]);
      expect([x.status, y.status]).toEqual([200, 200]);
      expect(counting.renders - before).toBe(1); // sample fits: one render, shared
      const slow = client.post(`/api/v1/resumes/${b.id}/fit-one-page`).send({});
      const other = await twoResumes(); // a different person isn't blocked
      const [first, second, third] = await Promise.all([
        slow,
        client.post(`/api/v1/resumes/${a.id}/fit-one-page`).send({}),
        other.client.post(`/api/v1/resumes/${other.a.id}/fit-one-page`).send({}),
      ]);
      expect(first.status).toBe(200);
      // Resume a is cached, so it answers without waiting for b.
      expect(second.status).toBe(200);
      expect(third.status).toBe(200);
    },
    60_000,
  );

  it('has its own, tighter rate limit', async () => {
    const { rateLimits } = await import('../src/middleware/rateLimit.js');
    const limits = rateLimits({ RATE_LIMIT_DISABLED: false });
    expect(typeof limits.fit).toBe('function');
    expect(limits.fit).not.toBe(limits.export);
  });
});

describe('skill levels', () => {
  it('stores 1–5, rejects anything else, and keeps unlevelled skills unchanged', async () => {
    const { resume, save, client, base } = await setup();
    const skills = resume.draft.content.skills;
    expect(skills[0]).not.toHaveProperty('level');
    const content = {
      ...resume.draft.content,
      skills: [{ ...skills[0], level: 4 }, ...skills.slice(1)],
    };
    expect((await save(resume.draft.layout, content)).status).toBe(200);
    const stored = (await client.get(base)).body.resume.draft.content.skills;
    expect(stored[0].level).toBe(4);
    expect(stored[1]).not.toHaveProperty('level');
    for (const level of [0, 6, 2.5, '3'])
      expect(
        (
          await save(resume.draft.layout, {
            ...resume.draft.content,
            skills: [{ ...skills[0], level }],
          })
        ).status,
      ).toBe(400);
  });

  it.skipIf(!hasChrome)(
    'every template passes the export checks with levelled skills and languages',
    async () => {
      const content = {
        ...FIXTURES.sample,
        skills: FIXTURES.sample.skills.map((s, i) => ({ ...s, level: (i % 5) + 1 })),
      };
      for (const t of TEMPLATES) {
        const out = await renderPdf(pool, {
          content,
          layout: defaultLayout(content),
          templateId: t.id,
          pageSize: 'A4',
          timeoutMs: 30_000,
        });
        const v = await validatePdf(out.buffer, out);
        expect([t.id, v.checks.filter((c) => c.result !== 'pass')]).toEqual([t.id, []]);
      }
    },
    240_000,
  );
});

describe('the sample resume', () => {
  // Gallery thumbnails show page one. Adding languages once pushed four templates to two pages
  // unnoticed; this keeps the sample honest about fitting.
  it.skipIf(!hasChrome)(
    'fits on one page in every template',
    async () => {
      for (const t of TEMPLATES) {
        const out = await renderPdf(pool, {
          content: sampleResume,
          layout: defaultLayout(sampleResume),
          templateId: t.id,
          pageSize: 'A4',
          timeoutMs: 30_000,
        });
        expect([t.id, (await validatePdf(out.buffer, out)).pageCount]).toEqual([t.id, 1]);
      }
    },
    240_000,
  );
});

describe('sidebar side', () => {
  it('is saved and can be cleared', async () => {
    const { resume, save, client, base } = await setup();
    expect((await save({ ...resume.draft.layout, sidebarSide: 'right' })).status).toBe(200);
    expect((await client.get(base)).body.resume.draft.layout.sidebarSide).toBe('right');
  });

  it.skipIf(!hasChrome)(
    'every two-column template passes the export checks with its sidebar flipped',
    async () => {
      for (const t of TEMPLATES.filter((x) => x.sideSections)) {
        for (const content of [FIXTURES.sample, FIXTURES.multiPage]) {
          const out = await renderPdf(pool, {
            content,
            layout: {
              ...defaultLayout(content),
              sidebarSide: t.sidebarSide === 'left' ? 'right' : 'left',
            },
            templateId: t.id,
            pageSize: 'A4',
            timeoutMs: 30_000,
          });
          const v = await validatePdf(out.buffer, out);
          expect([t.id, v.checks.filter((c) => c.result !== 'pass')]).toEqual([t.id, []]);
        }
      }
    },
    300_000,
  );
});
