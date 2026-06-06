/**
 * Wraps an async route handler so we don't repeat try/catch in every controller.
 * If the wrapped function throws or rejects, the error is forwarded to Express's
 * error-handling middleware via next(err) instead of crashing the request.
 */
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
