export const buildContactPicUrl = (
  urlPicture: string | null | undefined,
  companyId: number
): string | null => {
  if (!urlPicture || urlPicture.includes("nopicture")) return null;
  if (urlPicture.startsWith("http")) return urlPicture;

  const backendUrl = process.env.BACKEND_URL || "";
  return `${backendUrl}/public/company${companyId}/contacts/${urlPicture}`;
};

export const normalizeContactToEmit = (contact: any, companyId: number) => {
  const plain = contact.toJSON ? contact.toJSON() : { ...contact };
  return {
    ...plain,
    urlPicture: buildContactPicUrl(plain.urlPicture, companyId)
  };
};
