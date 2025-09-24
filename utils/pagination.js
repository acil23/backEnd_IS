export function parsePagination(query, defaults = { page: 1, perPage: 10 }) {
  const page = Math.max(1, Number(query.page || defaults.page));
  const perPage = Math.min(50, Math.max(1, Number(query.perPage || defaults.perPage)));
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  return { page, perPage, from, to };
}
