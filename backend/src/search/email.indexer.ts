import { esManager, ElasticsearchClientManager, ELASTICSEARCH_INDEX_NAME } from './elasticsearch.client.js';
import { prisma } from '../repositories/prisma.js';
import { logger } from '../utils/logger.js';

export interface EmailDocument {
  id: string;
  campaignId: string;
  userId: string;
  senderId: string;
  senderEmail: string;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  bodyText: string;
  status: string;
  scheduledFor: string;
  sentAt?: string | null;
  etherealPreviewUrl?: string | null;
  createdAt: string;
}

export interface SearchResultItem {
  id: string;
  campaignId: string;
  senderEmail: string;
  recipientEmail: string;
  recipientName?: string | null;
  subject: string;
  status: string;
  sentAt?: string | null;
  etherealPreviewUrl?: string | null;
  score?: number;
}

export class EmailIndexer {
  private esClientManager: ElasticsearchClientManager;

  constructor(customEsManager?: ElasticsearchClientManager) {
    this.esClientManager = customEsManager || esManager;
  }

  /**
   * Idempotently indexes an email delivery document into Elasticsearch
   */
  public async indexDelivery(doc: EmailDocument): Promise<boolean> {
    try {
      const client = this.esClientManager.getClient();

      await client.index({
        index: ELASTICSEARCH_INDEX_NAME,
        id: doc.id, // Idempotent document key matching PostgreSQL delivery ID
        document: doc
      });

      logger.info({ deliveryId: doc.id, index: ELASTICSEARCH_INDEX_NAME }, 'Indexed email document in Elasticsearch');

      // Update database flag
      await prisma.emailDelivery.update({
        where: { id: doc.id },
        data: { indexedInEs: true }
      }).catch(() => {
        // Non-blocking catch if DB is disconnected in test
      });

      return true;
    } catch (error) {
      logger.warn({ deliveryId: doc.id, error }, 'Elasticsearch indexing deferred (service unavailable or error)');
      return false;
    }
  }

  /**
   * Searches email deliveries using Elasticsearch full-text query with strict tenant isolation filter
   */
  public async searchEmails(
    userId: string,
    queryText: string,
    page = 1,
    limit = 20
  ): Promise<{ results: SearchResultItem[]; total: number; source: 'elasticsearch' | 'postgres' }> {
    const from = (page - 1) * limit;

    try {
      const client = this.esClientManager.getClient();

      const response = await client.search<EmailDocument>({
        index: ELASTICSEARCH_INDEX_NAME,
        from,
        size: limit,
        query: {
          bool: {
            must: queryText.trim() ? [
              {
                multi_match: {
                  query: queryText,
                  fields: ['subject^3', 'bodyText^2', 'recipientEmail^2', 'recipientName'],
                  fuzziness: 'AUTO'
                }
              }
            ] : [{ match_all: {} }],
            filter: [
              { term: { userId } } // Strict Tenant Isolation Guard
            ]
          }
        },
        sort: [
          { _score: { order: 'desc' } },
          { createdAt: { order: 'desc' } }
        ]
      });

      const hits = response.hits.hits;
      const total = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0;

      const results: SearchResultItem[] = hits.map((hit) => {
        const source = hit._source as EmailDocument;
        return {
          id: source.id,
          campaignId: source.campaignId,
          senderEmail: source.senderEmail,
          recipientEmail: source.recipientEmail,
          recipientName: source.recipientName,
          subject: source.subject,
          status: source.status,
          sentAt: source.sentAt,
          etherealPreviewUrl: source.etherealPreviewUrl,
          score: hit._score || undefined
        };
      });

      return { results, total, source: 'elasticsearch' };
    } catch (esError) {
      logger.warn({ error: esError, userId, queryText }, 'Elasticsearch search failed, falling back to PostgreSQL ILIKE query');
      return await this.fallbackSearchPostgres(userId, queryText, page, limit);
    }
  }

  /**
   * Resilient fallback search using PostgreSQL ILIKE when Elasticsearch is down
   */
  private async fallbackSearchPostgres(
    userId: string,
    queryText: string,
    page: number,
    limit: number
  ): Promise<{ results: SearchResultItem[]; total: number; source: 'postgres' }> {
    const skip = (page - 1) * limit;

    const [deliveries, total] = await Promise.all([
      prisma.emailDelivery.findMany({
        where: {
          userId,
          OR: queryText.trim()
            ? [
                { recipientEmail: { contains: queryText.trim(), mode: 'insensitive' } },
                { recipientName: { contains: queryText.trim(), mode: 'insensitive' } },
                { campaign: { subject: { contains: queryText.trim(), mode: 'insensitive' } } }
              ]
            : undefined
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          sender: { select: { email: true } },
          campaign: { select: { subject: true } }
        }
      }),
      prisma.emailDelivery.count({
        where: {
          userId,
          OR: queryText.trim()
            ? [
                { recipientEmail: { contains: queryText.trim(), mode: 'insensitive' } },
                { recipientName: { contains: queryText.trim(), mode: 'insensitive' } },
                { campaign: { subject: { contains: queryText.trim(), mode: 'insensitive' } } }
              ]
            : undefined
        }
      })
    ]);

    const results: SearchResultItem[] = deliveries.map((d) => ({
      id: d.id,
      campaignId: d.campaignId,
      senderEmail: d.sender.email,
      recipientEmail: d.recipientEmail,
      recipientName: d.recipientName,
      subject: d.campaign.subject,
      status: d.status,
      sentAt: d.sentAt?.toISOString() || null,
      etherealPreviewUrl: d.etherealPreviewUrl || null
    }));

    return { results, total, source: 'postgres' };
  }
}

export const emailIndexer = new EmailIndexer();
