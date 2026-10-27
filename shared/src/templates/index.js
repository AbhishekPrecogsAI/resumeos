import { CLARITY, renderClarity } from './clarity.js';

export const TEMPLATES = [{ ...CLARITY, render: renderClarity }];

export function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}

export const DEFAULT_TEMPLATE_ID = CLARITY.id;
