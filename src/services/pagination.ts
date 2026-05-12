// Parses `?limit` and `?offset` query params and clamps them to safe bounds.

export interface Pagination {
  limit: number;
  offset: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export const parsePagination = (
  query: Record<string, any>
): Pagination => {
  const rawLimit = Number(query.limit);
  const rawOffset = Number(query.offset);

  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
      : DEFAULT_LIMIT;
  const offset =
    Number.isFinite(rawOffset) && rawOffset >= 0
      ? Math.floor(rawOffset)
      : 0;

  return { limit, offset };
};
