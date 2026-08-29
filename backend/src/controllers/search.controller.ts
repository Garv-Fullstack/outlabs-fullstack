import { Request, Response, NextFunction } from 'express';
import { emailIndexer } from '../search/email.indexer.js';
import { ApiResponse } from '@reachinbox/shared';

export class SearchController {
  /**
   * GET /api/emails/search?q=keyword&page=1&limit=20
   */
  public async searchEmails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const queryText = (req.query['q'] as string) || '';
      const page = Math.max(1, parseInt((req.query['page'] as string) || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt((req.query['limit'] as string) || '20', 10)));

      const searchResult = await emailIndexer.searchEmails(userId, queryText, page, limit);

      const response: ApiResponse = {
        success: true,
        data: searchResult,
        requestId: req.id
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export const searchController = new SearchController();
