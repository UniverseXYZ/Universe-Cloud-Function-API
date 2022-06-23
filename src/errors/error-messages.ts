export const ERROR_MESSAGES = {
  STRATEGY_NOT_SET:
    'Please send a request with at least one nft, owner or order parameter',
  UNEXPECTED_ERROR: 'Unexpected error occurred',
  INVALID_ATTRIBUTE_TRAIT_PAIR: 'Invalid attribute:trait pair',
  ATTRIBUTE_CONTRACT_ADDRESS_REQUIRED:
    'Please provide contract address in order to filter by traits',
  INVALID_PARAMETER: (parameter: string) => `Invalid parameter '${parameter}'`,
  POSTIVE_INTEGER: (parameter: string) =>
    `Parameter must be a positive integer '${parameter}'`,
};

export enum HTTP_STATUS_CODES {
  UNEXPECTED_ERROR = 500,
  BAD_REQUEST = 400,
}
