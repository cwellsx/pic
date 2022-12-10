function trim(s: string, first: string, last: string) {
  if (s[0] !== first || s[s.length - 1] !== last) throw new Error("not a string");
  return s.substring(1, s.length - 1);
}

export const trimString = (s: string): string => trim(s, '"', '"');

export const stringToArray = (s: string): string[] => {
  if (!s) return [];
  s = trim(s, "[", "]");
  const parts = s.split(", ");
  return parts.map(trimString);
};
