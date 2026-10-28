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
import { ATLAS, renderAtlas } from './atlas.js';
import { BEACON, renderBeacon } from './beacon.js';
import { HARBOR, renderHarbor } from './harbor.js';
import { SUMMIT, renderSummit } from './summit.js';
import { TIDE, renderTide } from './tide.js';
import { CIRCUIT, renderCircuit } from './circuit.js';
import { PULSE, renderPulse } from './pulse.js';
import { KEYSTONE, renderKeystone } from './keystone.js';

export const TEMPLATES = [
  { ...CLARITY, render: renderClarity },
  { ...ORBIT, render: renderOrbit },
  { ...VERTEX, render: renderVertex },
  { ...LUMEN, render: renderLumen },
  { ...ATLAS, render: renderAtlas },
  { ...BEACON, render: renderBeacon },
  { ...HARBOR, render: renderHarbor },
  { ...SUMMIT, render: renderSummit },
  { ...TIDE, render: renderTide },
  { ...CIRCUIT, render: renderCircuit },
  { ...PULSE, render: renderPulse },
  { ...KEYSTONE, render: renderKeystone },
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
