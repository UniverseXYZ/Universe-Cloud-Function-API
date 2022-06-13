export class BaseError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);

    this.name = Error.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this);
  }
}
