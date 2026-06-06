/**
 * A standard success-response shape.
 * Sending `res.json(new ApiResponse(200, data, "Auction created"))` keeps every
 * successful response consistent (statusCode, data, message, success), so the
 * frontend can rely on one predictable format.
 */
class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export { ApiResponse };
