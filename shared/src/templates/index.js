import { CLARITY, renderClarity } from './clarity.js';
import { LEDGER, renderLedger } from './ledger.js';
import { HORIZON, renderHorizon } from './horizon.js';
import { MERIDIAN, renderMeridian } from './meridian.js';
import { ATELIER, renderAtelier } from './atelier.js';

export const TEMPLATES = [
  { ...CLARITY, render: renderClarity },
  { ...LEDGER, render: renderLedger },
  { ...HORIZON, render: renderHorizon },
  { ...MERIDIAN, render: renderMeridian },
  { ...ATELIER, render: renderAtelier },
];

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}

export const DEFAULT_TEMPLATE_ID = CLARITY.id;
