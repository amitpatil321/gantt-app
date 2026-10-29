/** Error type that carries an HTTP status code to the response layer. */
export class HttpError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new HttpError(400, message, details);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new HttpError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new HttpError(404, message);
  }

  static conflict(message: string) {
    return new HttpError(409, message);
  }
}
