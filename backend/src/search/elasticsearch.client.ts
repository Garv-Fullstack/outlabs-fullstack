import { Client } from '@elastic/elasticsearch';
import { logger } from '../utils/logger.js';

export const ELASTICSEARCH_INDEX_NAME = process.env['ELASTICSEARCH_INDEX'] || 'reachinbox_emails';

export class ElasticsearchClientManager {
  private client: Client | null = null;
  private nodeUrl: string;

  constructor(nodeUrl?: string) {
    this.nodeUrl = nodeUrl || process.env['ELASTICSEARCH_NODE'] || 'http://localhost:9200';
  }

  public getClient(): Client {
    if (!this.client) {
      this.client = new Client({
        node: this.nodeUrl,
        requestTimeout: 5000,
        maxRetries: 2
      });
    }
    return this.client;
  }

  /**
   * Initializes the index and sets up mapping definitions
   */
  public async ensureIndexExists(): Promise<boolean> {
    try {
      const client = this.getClient();
      const exists = await client.indices.exists({ index: ELASTICSEARCH_INDEX_NAME });

      if (!exists) {
        await client.indices.create({
          index: ELASTICSEARCH_INDEX_NAME,
          mappings: {
            properties: {
              id: { type: 'keyword' },
              campaignId: { type: 'keyword' },
              userId: { type: 'keyword' },
              senderId: { type: 'keyword' },
              senderEmail: { type: 'keyword' },
              recipientEmail: {
                type: 'text',
                fields: { keyword: { type: 'keyword' } }
              },
              recipientName: { type: 'text' },
              subject: { type: 'text', analyzer: 'standard' },
              bodyText: { type: 'text', analyzer: 'standard' },
              status: { type: 'keyword' },
              scheduledFor: { type: 'date' },
              sentAt: { type: 'date' },
              etherealPreviewUrl: { type: 'keyword', index: false },
              createdAt: { type: 'date' }
            }
          }
        });
        logger.info({ index: ELASTICSEARCH_INDEX_NAME }, 'Created Elasticsearch index with mappings');
      }
      return true;
    } catch (error) {
      logger.warn({ error, index: ELASTICSEARCH_INDEX_NAME }, 'Elasticsearch index initialization deferred / unavailable');
      return false;
    }
  }

  /**
   * Probes Elasticsearch cluster health
   */
  public async checkHealth(): Promise<{ status: 'up' | 'down'; latencyMs: number | null; error?: string }> {
    const start = Date.now();
    try {
      const client = this.getClient();
      const ping = await client.ping();
      if (ping) {
        return {
          status: 'up',
          latencyMs: Date.now() - start
        };
      }
      return {
        status: 'down',
        latencyMs: null,
        error: 'Elasticsearch ping failed'
      };
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Elasticsearch connection error';
      return {
        status: 'down',
        latencyMs: null,
        error: errMessage
      };
    }
  }

  public async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }
}

export const esManager = new ElasticsearchClientManager();
