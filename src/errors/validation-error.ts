import { BaseError } from "./base-error";
import { ERROR_MESSAGES, HTTP_STATUS_CODES } from "./error-messages";

export class ValidationError extends BaseError {
  propertyName: string;

  constructor(parameterName: string) {
    super(
      HTTP_STATUS_CODES.BAD_REQUEST,
      ERROR_MESSAGES.INVALID_PARAMETER(parameterName)
    );

    this.propertyName = parameterName;
  }
}
