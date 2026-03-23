// src/helpers/getRequestParam.ts
export const getRequestParam = (
  value: string | string[] | undefined,
  fieldName = "param"
): string => {
  if (value === undefined) {
    throw new Error(`${fieldName} is required`);
  }

  return Array.isArray(value) ? value[0] : value;
};

export const getRequestParamAsNumber = (
  value: string | string[] | undefined,
  fieldName = "param"
): number => {
  const strValue = getRequestParam(value, fieldName);
  const num = parseInt(strValue, 10);

  if (Number.isNaN(num)) {
    throw new Error(`${fieldName} must be a valid number`);
  }

  return num;
};
