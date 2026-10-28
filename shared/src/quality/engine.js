import { RULES, RULES_BY_ID } from './rules.js';
import { visibleModel } from './model.js';
import { CATEGORIES, SEVERITIES } from './model.js';

/**
 * Run every rule against the visible resume. Deterministic for a given input and date.
 * Returns findings plus the list of rules that ran; there is deliberately no overall score.
 */
export function runQualityChecks(
  content,
  layout = {},
  { today = new Date(), dismissals = [] } = {},
) {
  const model = visibleModel(content, layout);
  const dismissed = new Map(dismissals.map((d) => [d.key, d]));
  const all = RULES.flatMap((rule) => rule.check(model, content, { today }, rule));
  const order = Object.fromEntries(SEVERITIES.map((s, i) => [s, i]));
  all.sort((a, b) => order[a.severity] - order[b.severity]);
  const findings = all.filter((f) => !dismissed.has(f.key));
  const dismissedFindings = all
    .filter((f) => dismissed.has(f.key))
    .map((f) => ({ ...f, dismissal: dismissed.get(f.key) }));

  const bySeverity = Object.fromEntries(
    SEVERITIES.map((s) => [s, findings.filter((f) => f.severity === s).length]),
  );
  const byCategory = Object.fromEntries(
    Object.keys(CATEGORIES).map((c) => [c, findings.filter((f) => f.category === c).length]),
  );

  return {
    findings,
    dismissed: dismissedFindings,
    counts: { bySeverity, byCategory, total: findings.length },
    rulesRun: RULES.map((r) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      description: r.description,
      limitations: r.limitations,
    })),
    checkedAt: today.toISOString(),
  };
}

export { RULES, RULES_BY_ID, CATEGORIES, SEVERITIES };
