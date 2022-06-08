import { BaseError } from "./base-error";
import { ERROR_MESSAGES } from "./error-messages";

export class ValidationError extends BaseError {
  propertyName: string;

  constructor(parameterName: string) {
    super(401, ERROR_MESSAGES.INVALID_PARAMETER(parameterName));

    this.propertyName = parameterName;
  }
}
