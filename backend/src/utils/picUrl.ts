export const stripWaSigning = (url?: string | null): string => {
  if (!url) return "";
  const idx = url.indexOf("?");
  return idx === -1 ? url : url.substring(0, idx);
};
