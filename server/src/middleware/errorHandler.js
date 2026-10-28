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
    } else if (!(err instanceof HttpError) && err?.status >= 400 && err.status < 500) {
      // Client errors raised by Express middleware (e.g. a missing static asset). The original
      // message is replaced with a generic one, so nothing internal is exposed.
      err =
        err.status === 404
          ? new HttpError(404, 'NOT_FOUND', 'Resource not found.')
          : new HttpError(err.status, 'BAD_REQUEST', 'The request could not be processed.');
    }

    const status = err instanceof HttpError ? err.status : 500;
    if (status >= 500) {
      // Error messages can embed user-submitted values (e.g. Mongoose cast errors), so log only
      // the error type, code and stack frames, never the message.
      logger.error('unhandled error', {
        requestId: req.id,
        name: err?.name,
        code: err?.code,
        frames: String(err?.stack ?? '')
          .split('\n')
          .filter((line) => line.trim().startsWith('at '))
          .slice(0, 8)
          .map((line) => line.trim()),
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
