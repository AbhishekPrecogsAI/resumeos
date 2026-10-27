import { HttpError } from '../utils/HttpError.js';

/**
 * Validate req.body / req.params / req.query against zod schemas.
 * Schemas should be strict so unexpected keys (including `$`-operators) are rejected.
 */
export function validate({ body, params, query } = {}) {
  return (req, res, next) => {
    const issues = [];
    const parsed = {};
    for (const [part, schema] of [
      ['body', body],
      ['params', params],
      ['query', query],
    ]) {
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) parsed[part] = result.data;
      else
        for (const issue of result.error.issues) {
          issues.push({ location: part, path: issue.path.join('.'), message: issue.message });
        }
    }
    if (issues.length) {
      return next(
        new HttpError(400, 'VALIDATION_FAILED', 'Some fields need attention.', { fields: issues }),
      );
    }
    req.valid = parsed;
    next();
  };
}
