/**
 * Custom application error with HTTP status code
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string) {
    return new AppError(message, 400);
  }

  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }

  static notFound(message = 'Not found') {
    return new AppError(message, 404);
  }

  static internal(message = 'Internal server error') {
    return new AppError(message, 500);
  }
}
