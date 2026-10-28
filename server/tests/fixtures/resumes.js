import { sampleResume } from '@resumeos/shared/sample/sampleResume.js';
import { emptyContent } from '@resumeos/shared/resumeModel.js';

const bullet = (i, text) => ({ id: `b_${i}`, text, evidenceIds: [] });

/** Edge cases the export must survive. All data is fictional. */
export const FIXTURES = {
  sample: sampleResume,

  unicodeAndLong: {
    ...emptyContent(),
    contact: {
      ...emptyContent().contact,
      name: 'Zoë Ångström-Nguyễn 李小龍',
      email: 'zoe@example.com',
      location: 'São Paulo, Brasil',
      github: 'https://github.com/example-with-a-really-long-handle-that-keeps-going-and-going',
    },
    headline: 'Ingénieure logicielle — systèmes distribués',
    summary: 'Résumé with “curly quotes”, an en dash – and an ellipsis… plus symbols: €, ™, →, ≥.',
    experience: [
      {
        id: 'exp_long',
        company:
          'The Extremely Long And Formally Registered Name Of A Multinational Logistics Conglomerate GmbH & Co. KG',
        title:
          'Principal Distributed Systems Engineer, Platform Reliability and Developer Productivity',
        location: 'Zürich',
        employmentType: '',
        startDate: '2019',
        endDate: '',
        current: true,
        bullets: [
          bullet(
            1,
            'Designed and operated a multi-region event-sourcing platform processing 1.2 billion events per day across 14 regions with a p99 end-to-end latency under 900 ms, coordinating 9 teams through a staged migration that removed the legacy batch pipeline entirely while keeping every downstream consumer online.',
          ),
          bullet(
            2,
            'Wrote the runbook: https://example.com/a/very/long/path/that/has/no/natural/break/points/whatsoever/and/keeps/going',
          ),
        ],
      },
    ],
    skills: Array.from({ length: 60 }, (_, i) => ({
      id: `sk_${i}`,
      name: `Skill${i}`,
      category: ['Languages', 'Data', 'Infrastructure', 'Practices'][i % 4],
      context: '',
      evidenceIds: [],
    })),
  },

  minimal: {
    ...emptyContent(),
    contact: { ...emptyContent().contact, name: 'Sam Lee' },
  },

  multiPage: {
    ...sampleResume,
    experience: Array.from({ length: 9 }, (_, i) => ({
      id: `exp_${i}`,
      company: `Company ${i + 1}`,
      title: 'Software Engineer',
      location: 'Remote',
      employmentType: 'Full-time',
      startDate: `${2010 + i}-0${(i % 9) + 1}`,
      endDate: `${2011 + i}-12`,
      current: false,
      bullets: Array.from({ length: 5 }, (_, j) =>
        bullet(
          `${i}_${j}`,
          `Delivered project ${j + 1} at company ${i + 1}, improving reliability and reducing operational toil for the on-call rotation.`,
        ),
      ),
    })),
  },
};
