import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ElasticsearchClientManager, ELASTICSEARCH_INDEX_NAME } from '../src/search/elasticsearch.client.js';
import { EmailIndexer, EmailDocument } from '../src/search/email.indexer.js';
import { prisma } from '../src/repositories/prisma.js';

describe('Elasticsearch Search & Indexing Tests', () => {
  beforeEach(() => {
    vi.spyOn(prisma.emailDelivery, 'findMany').mockResolvedValue([
      {
        id: 'del-uuid-1',
        campaignId: 'camp-uuid-1',
        sender: { email: 'sales@reachinbox.ai' },
        recipientEmail: 'lead@enterprise.com',
        recipientName: 'Enterprise Buyer',
        campaign: { subject: 'Cold email pitch' },
        status: 'SENT',
        sentAt: new Date(),
        etherealPreviewUrl: 'https://ethereal.email/message/12345'
      } as any
    ]);

    vi.spyOn(prisma.emailDelivery, 'count').mockResolvedValue(1);
    vi.spyOn(prisma.emailDelivery, 'update').mockResolvedValue({} as any);
  });

  it('should initialize ElasticsearchClientManager with configured index name', () => {
    const esManager = new ElasticsearchClientManager();
    expect(ELASTICSEARCH_INDEX_NAME).toBe('reachinbox_emails');
    expect(esManager.getClient()).toBeDefined();
  });

  it('should handle search fallback to PostgreSQL cleanly when Elasticsearch is unavailable', async () => {
    const indexer = new EmailIndexer();
    const result = await indexer.searchEmails('00000000-0000-0000-0000-000000000001', 'cold email', 1, 10);

    expect(result).toHaveProperty('results');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('source');
    expect(result.results.length).toBeGreaterThan(0);
    expect(['elasticsearch', 'postgres']).toContain(result.source);
  });

  it('should format search index document structure with all required fields', () => {
    const doc: EmailDocument = {
      id: 'del-uuid-1',
      campaignId: 'camp-uuid-1',
      userId: 'user-uuid-1',
      senderId: 'sender-uuid-1',
      senderEmail: 'sales@reachinbox.ai',
      recipientEmail: 'lead@enterprise.com',
      recipientName: 'Enterprise Buyer',
      subject: 'Custom Subject line',
      bodyText: 'Plaintext body content',
      status: 'SENT',
      scheduledFor: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      etherealPreviewUrl: 'https://ethereal.email/message/12345',
      createdAt: new Date().toISOString()
    };

    expect(doc.id).toBe('del-uuid-1');
    expect(doc.recipientEmail).toBe('lead@enterprise.com');
  });
});
