export const YEAR_RANGE_MESSAGE = "startYear must be less than or equal to endYear.";
export const DATE_RANGE_MESSAGE = "startDate must be less than or equal to endDate.";

export function hasOrderedOptionalRange(
  value: Record<string, unknown>,
  startKey: string,
  endKey: string,
): boolean {
  const start = value[startKey];
  const end = value[endKey];
  return typeof start !== "number" || typeof end !== "number" || start <= end;
}

export function hasOrderedOptionalStringRange(
  value: Record<string, unknown>,
  startKey: string,
  endKey: string,
): boolean {
  const start = value[startKey];
  const end = value[endKey];
  return typeof start !== "string" || typeof end !== "string" || start <= end;
}
