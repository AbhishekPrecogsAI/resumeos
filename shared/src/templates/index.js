import { CLARITY, renderClarity } from './clarity.js';
import { LEDGER, renderLedger } from './ledger.js';
import { HORIZON, renderHorizon } from './horizon.js';
import { CADENCE, renderCadence } from './cadence.js';
import { SABLE, renderSable } from './sable.js';
import { MERIDIAN, renderMeridian } from './meridian.js';
import { ATELIER, renderAtelier } from './atelier.js';
import { PRISM, renderPrism } from './prism.js';
import { ORBIT, renderOrbit } from './orbit.js';
import { VERTEX, renderVertex } from './vertex.js';
import { LUMEN, renderLumen } from './lumen.js';

export const TEMPLATES = [
  { ...CLARITY, render: renderClarity },
  { ...ORBIT, render: renderOrbit },
  { ...VERTEX, render: renderVertex },
  { ...LUMEN, render: renderLumen },
  { ...LEDGER, render: renderLedger },
  { ...HORIZON, render: renderHorizon },
  { ...CADENCE, render: renderCadence },
  { ...SABLE, render: renderSable },
  { ...MERIDIAN, render: renderMeridian },
  { ...ATELIER, render: renderAtelier },
  { ...PRISM, render: renderPrism },
];

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}

export const DEFAULT_TEMPLATE_ID = CLARITY.id;
