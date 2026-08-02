export const parseQueryInt = (raw?: string): number | undefined => {
  if (raw === undefined || raw === '') return undefined;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0) return undefined;
  return n;
};

export const parseBool = (raw?: string): boolean => raw === 'true';