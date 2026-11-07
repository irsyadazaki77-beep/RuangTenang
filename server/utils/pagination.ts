import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function validatePagination(req: Request, defaultLimit = 20): PaginationParams {
  const pageRaw = req.query.page;
  const limitRaw = req.query.limit;

  let page = 1;
  let limit = defaultLimit;

  if (pageRaw !== undefined) {
    const parsedPage = parseInt(String(pageRaw), 10);
    if (!isNaN(parsedPage) && parsedPage >= 1) {
      page = parsedPage;
    }
  }

  if (limitRaw !== undefined) {
    if (String(limitRaw).toLowerCase() === 'all') {
      limit = 100; // Cap 'all' to hard limit of 100
    } else {
      const parsedLimit = parseInt(String(limitRaw), 10);
      if (!isNaN(parsedLimit) && parsedLimit >= 1) {
        limit = Math.min(parsedLimit, 100); // Cap max limit to 100
      }
    }
  }

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}
