import { BaseError } from "./base-error";
import { ERROR_MESSAGES } from "./error-messages";

export class PositiveNumberValidationError extends BaseError {
  propertyName: string;

  constructor(parameterName: string) {
    super(400, ERROR_MESSAGES.POSTIVE_INTEGER(parameterName));

    this.propertyName = parameterName;
  }
}
