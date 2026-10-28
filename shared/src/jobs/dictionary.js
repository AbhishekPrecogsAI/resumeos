/**
 * Known technical terms and their accepted variants. Explicit and editable: matching only treats
 * strings listed here as equivalent. `caseSensitive` is for names that are also common English
 * words ("Go", "Swift", "Express"), which then match only when capitalised as a proper name.
 */
const T = (term, category, variants = [], opts = {}) => ({ term, category, variants, ...opts });

export const TERM_DICTIONARY = [
  // Languages
  T('JavaScript', 'language', ['JS', 'ECMAScript', 'ES6']),
  T('TypeScript', 'language', ['TS']),
  T('Python', 'language'),
  T('Java', 'language', [], { caseSensitive: true }),
  T('Kotlin', 'language'),
  T('Go', 'language', ['Golang'], { caseSensitive: true }),
  T('Rust', 'language', [], { caseSensitive: true }),
  T('C', 'language', [], { caseSensitive: true }),
  T('C++', 'language', ['CPP', 'C plus plus']),
  T('C#', 'language', ['C sharp', 'CSharp']),
  T('Ruby', 'language', [], { caseSensitive: true }),
  T('PHP', 'language'),
  T('Scala', 'language'),
  T('Swift', 'language', [], { caseSensitive: true }),
  T('Elixir', 'language'),
  T('R', 'language', [], { caseSensitive: true }),
  T('SQL', 'language'),
  T('Bash', 'language', ['shell scripting', 'Shell']),
  // Runtimes, frameworks, libraries
  T('Node.js', 'framework', ['NodeJS', 'Node']),
  T('Deno', 'framework'),
  T('Express', 'framework', ['Express.js', 'ExpressJS'], { caseSensitive: true }),
  T('NestJS', 'framework', ['Nest.js']),
  T('React', 'framework', ['React.js', 'ReactJS']),
  T('Next.js', 'framework', ['NextJS']),
  T('Vue', 'framework', ['Vue.js', 'VueJS']),
  T('Angular', 'framework', ['AngularJS']),
  T('Svelte', 'framework', ['SvelteKit']),
  T('Django', 'framework'),
  T('Flask', 'framework'),
  T('FastAPI', 'framework'),
  T('Spring Boot', 'framework', ['Spring'], { caseSensitive: true }),
  T('Ruby on Rails', 'framework', ['Rails', 'RoR']),
  T('.NET', 'framework', ['dotnet', 'ASP.NET', '.NET Core']),
  T('GraphQL', 'framework'),
  T('gRPC', 'framework'),
  T('REST APIs', 'practice', ['REST', 'RESTful', 'REST API', 'RESTful APIs']),
  T('Tailwind CSS', 'framework', ['Tailwind', 'TailwindCSS']),
  T('Redux', 'framework'),
  T('Jest', 'tool'),
  T('Vitest', 'tool'),
  T('Playwright', 'tool'),
  T('Cypress', 'tool'),
  T('Selenium', 'tool'),
  T('pytest', 'tool'),
  // Data
  T('PostgreSQL', 'datastore', ['Postgres', 'psql']),
  T('MySQL', 'datastore', ['MariaDB']),
  T('MongoDB', 'datastore', ['Mongo']),
  T('Redis', 'datastore'),
  T('Elasticsearch', 'datastore', ['Elastic', 'OpenSearch', 'ELK']),
  T('DynamoDB', 'datastore'),
  T('Cassandra', 'datastore'),
  T('SQLite', 'datastore'),
  T('Snowflake', 'datastore'),
  T('BigQuery', 'datastore'),
  T('Kafka', 'datastore', ['Apache Kafka']),
  T('RabbitMQ', 'datastore'),
  T('Amazon SQS', 'datastore', ['SQS']),
  T('Spark', 'datastore', ['Apache Spark', 'PySpark']),
  T('Airflow', 'tool', ['Apache Airflow']),
  T('dbt', 'tool'),
  // Cloud and infrastructure
  T('AWS', 'cloud', ['Amazon Web Services']),
  T('Google Cloud', 'cloud', ['GCP', 'Google Cloud Platform']),
  T('Azure', 'cloud', ['Microsoft Azure']),
  T('Kubernetes', 'infrastructure', ['K8s', 'k8s']),
  T('Docker', 'infrastructure', ['containers', 'containerization']),
  T('Terraform', 'infrastructure'),
  T('Ansible', 'infrastructure'),
  T('Helm', 'infrastructure'),
  T('Pulumi', 'infrastructure'),
  T('Linux', 'infrastructure'),
  T('Nginx', 'infrastructure'),
  T('AWS Lambda', 'cloud', ['Lambda', 'serverless']),
  T('CI/CD', 'practice', [
    'continuous integration',
    'continuous delivery',
    'continuous deployment',
    'CICD',
  ]),
  T('GitHub Actions', 'tool'),
  T('GitLab CI', 'tool'),
  T('Jenkins', 'tool'),
  T('Argo CD', 'tool', ['ArgoCD', 'Argo']),
  T('Git', 'tool', [], { caseSensitive: true }),
  // Observability and reliability
  T('Prometheus', 'tool'),
  T('Grafana', 'tool'),
  T('Datadog', 'tool'),
  T('OpenTelemetry', 'tool', ['OTel']),
  T('observability', 'practice', ['monitoring', 'tracing']),
  T('incident response', 'practice', ['incident management', 'on-call', 'on call']),
  T('SLOs', 'practice', ['SLO', 'SLIs', 'SLI', 'service level objectives']),
  T('site reliability engineering', 'practice', ['SRE']),
  // Practices and concepts
  T('microservices', 'practice', ['microservice', 'service-oriented architecture', 'SOA']),
  T('distributed systems', 'practice', ['distributed system']),
  T('event-driven architecture', 'practice', ['event-driven', 'event sourcing']),
  T('system design', 'practice', ['software architecture', 'architecture']),
  T('test-driven development', 'practice', ['TDD']),
  T('automated testing', 'practice', [
    'unit testing',
    'integration testing',
    'unit tests',
    'integration tests',
    'end-to-end testing',
    'e2e testing',
  ]),
  T('code review', 'practice', ['code reviews']),
  T('Agile', 'practice', ['Scrum', 'Kanban']),
  T('security', 'practice', ['application security', 'AppSec', 'OWASP']),
  T('OAuth', 'practice', ['OAuth2', 'OAuth 2.0', 'OpenID Connect', 'OIDC']),
  T('performance optimization', 'practice', ['performance tuning', 'latency', 'performance']),
  T('data modeling', 'practice', ['data modelling', 'schema design']),
  T('mentoring', 'practice', ['mentorship', 'mentor']),
  T('technical leadership', 'practice', ['tech lead', 'technical lead', 'leadership']),
  T('machine learning', 'practice', ['ML']),
  T('accessibility', 'practice', ['a11y', 'WCAG']),
  T('HTML', 'language', ['HTML5']),
  T('CSS', 'language', ['CSS3', 'Sass', 'SCSS']),
];

/** Lower-case, Unicode-normalised form used for case-insensitive comparisons. */
export const fold = (s) =>
  String(s ?? '')
    .normalize('NFKC')
    .toLowerCase();

/** Compact form ignoring spaces, dots, hyphens and slashes: "Node.js" and "NodeJS" both → "nodejs". */
export const compact = (s) => fold(s).replace(/[\s.\-/_]+/g, '');

export const termId = (term) =>
  compact(term)
    .replace(/\+/g, 'plus')
    .replace(/#/g, 'sharp')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 60) || 'term';

export function findDictionaryEntry(term) {
  const c = compact(term);
  return (
    TERM_DICTIONARY.find(
      (d) => compact(d.term) === c || d.variants.some((v) => compact(v) === c),
    ) ?? null
  );
}
