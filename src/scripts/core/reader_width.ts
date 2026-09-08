export const DEFAULT_WIDE_WIDTH_PERCENT = 90;
export const MIN_WIDE_WIDTH_PERCENT = 82;
export const MAX_WIDE_WIDTH_PERCENT = 98;

export const normalizeWideWidthPercent = (value: unknown): number => {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (
    !Number.isInteger(numeric)
    || numeric < MIN_WIDE_WIDTH_PERCENT
    || numeric > MAX_WIDE_WIDTH_PERCENT
    || numeric % 2 !== 0
  ) {
    return DEFAULT_WIDE_WIDTH_PERCENT;
  }
  return numeric;
};
