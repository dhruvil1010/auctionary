import { ApiError } from "../utils/ApiError.js";

/**
 * Central error handler.
 *
 * Express recognizes this as an error handler because it takes FOUR arguments
 * (err, req, res, next). It is registered LAST in app.js, after all routes, and
 * normalizes anything thrown anywhere into our consistent JSON error shape — so
 * the frontend always receives { success:false, message, errors } instead of a
 * raw HTML 500 page.
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Normalize non-ApiError throws (e.g. a Mongoose ValidationError) into ApiError.
  if (!(error instanceof ApiError)) {
    const statusCode =
      error.statusCode || (error.name === "ValidationError" ? 400 : 500);
    const message = error.message || "Something went wrong";
    error = new ApiError(statusCode, message, error?.errors || []);
  }

  const payload = {
    success: false,
    message: error.message,
    errors: error.errors,
    // Expose the stack trace only outside production, to aid debugging.
    ...(process.env.NODE_ENV !== "production" ? { stack: error.stack } : {}),
  };

  return res.status(error.statusCode).json(payload);
};

export { errorHandler };
