import { HttpError } from '../utils/HttpError.js';

export function notFoundHandler() {
  return (req, res) => {
    res
      .status(404)
      .json({ error: { code: 'NOT_FOUND', message: 'Resource not found.', requestId: req.id } });
  };
}

export function errorHandler(logger, { exposeDetails = false } = {}) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    if (err?.type === 'entity.too.large') {
      err = new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');
    } else if (err?.type === 'entity.parse.failed') {
      err = new HttpError(400, 'INVALID_JSON', 'Request body is not valid JSON.');
    }

    const status = err instanceof HttpError ? err.status : 500;
    if (status >= 500) {
      logger.error('unhandled error', {
        requestId: req.id,
        name: err?.name,
        message: err?.message,
      });
    }

    const body = {
      error: {
        code: err instanceof HttpError ? err.code : 'INTERNAL_ERROR',
        message: err instanceof HttpError ? err.message : 'Something went wrong on our side.',
        requestId: req.id,
      },
    };
    if (err instanceof HttpError && err.details) body.error.details = err.details;
    if (exposeDetails && status >= 500)
      body.error.debug = { message: err?.message, stack: err?.stack };
    res.status(status).json(body);
  };
}
