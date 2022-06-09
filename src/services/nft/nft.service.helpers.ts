export const hasNftParamsOnly = (
  hasNftParams: boolean,
  hasOrderParams: boolean,
  hasOwnerParams: boolean
) => {
  if (!hasNftParams) {
    return false;
  }

  if (hasNftParams && (hasOrderParams || hasOwnerParams)) {
    return false;
  }

  return true;
};

export const hasOrderParamsOnly = (
  hasNftParams: boolean,
  hasOrderParams: boolean,
  hasOwnerParams: boolean
) => {
  if (!hasOrderParams) {
    return false;
  }

  if (hasOrderParams && (hasNftParams || hasOwnerParams)) {
    return false;
  }

  return true;
};

export const hasOwnerParamsOnly = (
  hasNftParams: boolean,
  hasOrderParams: boolean,
  hasOwnerParams: boolean
) => {
  if (!hasOwnerParams) {
    return false;
  }

  if (hasOwnerParams && (hasOrderParams || hasNftParams)) {
    return false;
  }

  return true;
};
