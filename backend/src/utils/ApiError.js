/**
 * A standard error shape for the whole API.
 * Throwing `new ApiError(404, "Auction not found")` anywhere gives every error
 * the same structure (statusCode, message, success:false, errors[]), which our
 * error handler then turns into a consistent JSON response for the frontend.
 */
class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
