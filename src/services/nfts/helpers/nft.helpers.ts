export const hasNftParamsOnly = (
  hasNftParams: boolean,
  hasOrderParams: boolean,
  hasOwnerParams: boolean,
  hasHistoryParams: boolean,
) => {
  if (!hasNftParams) {
    return false;
  }

  if (hasNftParams && (hasOrderParams || hasOwnerParams || hasHistoryParams)) {
    return false;
  }

  return true;
};

export const hasOrderParamsOnly = (
  hasNftParams: boolean,
  hasOrderParams: boolean,
  hasOwnerParams: boolean,
  hasHistoryParams: boolean,
) => {
  if (!hasOrderParams) {
    return false;
  }

  if (hasOrderParams && (hasNftParams || hasOwnerParams || hasHistoryParams)) {
    return false;
  }

  return true;
};

export const hasOwnerParamsOnly = (
  hasNftParams: boolean,
  hasOrderParams: boolean,
  hasOwnerParams: boolean,
  hasHistoryParams: boolean,
) => {
  if (!hasOwnerParams) {
    return false;
  }

  if (hasOwnerParams && (hasOrderParams || hasNftParams || hasHistoryParams)) {
    return false;
  }

  return true;
};
