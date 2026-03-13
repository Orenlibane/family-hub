/**
 * Safely extract a string from Express params/query
 */
export const getString = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return undefined;
};

/**
 * Get required string, throw if not present
 */
export const requireString = (value: unknown, name: string): string => {
  const str = getString(value);
  if (!str) throw new Error(`Missing required parameter: ${name}`);
  return str;
};
