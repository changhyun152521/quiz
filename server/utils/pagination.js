const MAX_PAGE_SIZE = 100;
const MAX_PAGE_NUMBER = 1_000_000;

const parsePagination = (query = {}, { defaultLimit = 10 } = {}) => {
  const parsedPage = Number.parseInt(query.page, 10);
  const parsedLimit = Number.parseInt(query.limit, 10);
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0
    ? Math.min(parsedPage, MAX_PAGE_NUMBER)
    : 1;
  const requestedLimit = Number.isSafeInteger(parsedLimit) && parsedLimit > 0
    ? parsedLimit
    : defaultLimit;
  const limit = Math.min(requestedLimit, MAX_PAGE_SIZE);
  return { page, limit, skip: (page - 1) * limit, maxPageSize: MAX_PAGE_SIZE };
};

module.exports = { MAX_PAGE_SIZE, MAX_PAGE_NUMBER, parsePagination };
