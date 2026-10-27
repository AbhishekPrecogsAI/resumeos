// Fictional sample data. Not a real person; always label it as sample in the UI.
export const SAMPLE_LABEL = 'Sample data: fictional person';

export const sampleResume = {
  contact: {
    name: 'Mira Okafor-Lindqvist',
    email: 'mira@example.com',
    phone: '',
    location: 'Lisbon, Portugal (remote)',
    website: '',
    linkedin: 'https://www.linkedin.com/in/example',
    github: 'https://github.com/example',
    portfolio: '',
  },
  headline: 'Backend & platform engineer',
  summary:
    'Backend engineer with seven years building payment and logistics APIs in Node.js and Go. Comfortable owning a service from schema design to on-call, and happiest making slow systems predictable.',
  experience: [
    {
      id: 'exp_1',
      company: 'Northwind Freight (sample)',
      title: 'Senior Backend Engineer',
      location: 'Remote',
      employmentType: 'Full-time',
      startDate: '2022-03',
      endDate: '',
      current: true,
      bullets: [
        'Led migration of the shipment-tracking API from a monolith to three Node.js services, cutting p95 latency from 820 ms to 310 ms.',
        'Designed the idempotent webhook delivery pipeline used by 40+ carrier integrations.',
        'Introduced contract tests between services; production incidents from breaking changes dropped to zero over two quarters.',
      ],
    },
    {
      id: 'exp_2',
      company: 'Tallyhouse Payments (sample)',
      title: 'Backend Engineer',
      location: 'Porto, Portugal',
      employmentType: 'Full-time',
      startDate: '2019-01',
      endDate: '2022-02',
      current: false,
      bullets: [
        'Built reconciliation jobs in Go that matched 2M+ daily transactions against bank statements.',
        'Owned the PostgreSQL schema for ledgers, including online migrations with zero downtime.',
      ],
    },
  ],
  projects: [
    {
      id: 'prj_1',
      name: 'queue-lens',
      description:
        'Open-source CLI that inspects RabbitMQ and SQS queues and explains why messages are stuck.',
      url: '',
      repositoryUrl: 'https://github.com/example/queue-lens',
      technologies: ['Go', 'RabbitMQ', 'AWS SQS'],
      startDate: '2021-06',
      endDate: '',
      current: true,
      bullets: [],
    },
  ],
  skills: [
    { id: 'sk_1', name: 'Node.js', category: 'Languages & runtimes' },
    { id: 'sk_2', name: 'Go', category: 'Languages & runtimes' },
    { id: 'sk_3', name: 'TypeScript', category: 'Languages & runtimes' },
    { id: 'sk_4', name: 'PostgreSQL', category: 'Data' },
    { id: 'sk_5', name: 'MongoDB', category: 'Data' },
    { id: 'sk_6', name: 'Redis', category: 'Data' },
    { id: 'sk_7', name: 'Kubernetes', category: 'Infrastructure' },
    { id: 'sk_8', name: 'Terraform', category: 'Infrastructure' },
    { id: 'sk_9', name: 'AWS', category: 'Infrastructure' },
  ],
  education: [
    {
      id: 'edu_1',
      institution: 'University of Porto',
      degree: 'MSc',
      field: 'Informatics and Computing Engineering',
      location: 'Porto, Portugal',
      startDate: '2014-09',
      endDate: '2019-07',
      current: false,
      notes: '',
    },
  ],
  certifications: [
    {
      id: 'cert_1',
      name: 'Certified Kubernetes Application Developer',
      issuer: 'CNCF',
      issuedDate: '2023-05',
      expiresDate: '',
      url: '',
    },
  ],
  customSections: [],
};
