export const ERROR_MESSAGES = {
  STRATEGY_NOT_SET: "Execution strategy isn't set",
  UNEXPECTED_ERROR: "Unexpected error occurred",
  INVALID_TOKEN_TYPE: "Invalid token type parameter",
  INVALID_CONTRACT: "Invalid contract address",
  INVALID_PARAMETER: (parameter: string) => `Invalid parameter '${parameter}'`,
  POSTIVE_INTEGER: (parameter: string) =>
    `Parameter must be a positive integer '${parameter}'`,
};

export enum HTTP_STATUS_CODES {
  UNEXPECTED_ERROR = 500,
  BAD_REQUEST = 400,
}
