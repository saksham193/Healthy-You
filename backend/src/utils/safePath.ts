const ID_LIKE_SEGMENT = /\/(?:[0-9]+|[0-9a-f]{8}-[0-9a-f-]{13,}|[A-Za-z0-9_-]{20,})(?=\/|$)/gi;

export const getSafePath = (path: string): string => {
  const pathWithoutQuery = path.split("?")[0] || "/";

  return pathWithoutQuery
    .replace(/\/memories\/[^/]+$/i, "/memories/:id")
    .replace(/\/sync\/health-summary\/[^/]+$/i, "/sync/health-summary/:id")
    .replace(ID_LIKE_SEGMENT, "/:id");
};
