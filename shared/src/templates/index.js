import { CLARITY, renderClarity } from './clarity.js';
import { LEDGER, renderLedger } from './ledger.js';

export const TEMPLATES = [
  { ...CLARITY, render: renderClarity },
  { ...LEDGER, render: renderLedger },
];

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}

export const DEFAULT_TEMPLATE_ID = CLARITY.id;
