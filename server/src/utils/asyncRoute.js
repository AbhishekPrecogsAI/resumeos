// Express 5 forwards rejected promises to the error handler; this keeps handlers terse.
export const route = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
