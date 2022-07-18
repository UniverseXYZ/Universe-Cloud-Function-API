import { BaseError } from './base-error';
import { ERROR_MESSAGES, HTTP_STATUS_CODES } from './error-messages';

export class PositiveIntValidationError extends BaseError {
  propertyName: string;

  constructor(parameterName: string) {
    super(
      HTTP_STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.POSTIVE_INTEGER(parameterName),
    );

    this.propertyName = parameterName;
  }
}

export class PositiveNumberValidationError extends BaseError {
  propertyName: string;

  constructor(parameterName: string) {
    super(
      HTTP_STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.POSTIVE_NUMBER(parameterName),
    );

    this.propertyName = parameterName;
  }
}