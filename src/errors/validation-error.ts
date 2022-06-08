import { BaseError } from "./base-error";
import { ERROR_MESSAGES } from "./error-messages";

export class ValidationError extends BaseError {
  propertyName: string;

  constructor(parameterName: string) {
    super(400, ERROR_MESSAGES.INVALID_PARAMETER(parameterName));

    this.propertyName = parameterName;
  }
}
