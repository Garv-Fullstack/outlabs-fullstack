import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../src/pages/DashboardPage.js';
import { campaignApi } from '../src/api/campaign.api.js';

// Mock campaign API
vi.mock('../src/api/campaign.api.js', () => ({
  campaignApi: {
    getStats: vi.fn(),
    getCampaigns: vi.fn(),
    getTimeline: vi.fn(),
    getRecentActivities: vi.fn()
  }
}));

// Mock AuthContext
vi.mock('../src/context/AuthContext.js', () => ({
  useAuth: () => ({
    user: { id: 'test-user', name: 'Test User', email: 'test@reachinbox.test' },
    isAuthenticated: true,
    isLoading: false
  })
}));

describe('Dashboard Engagement Metrics Binding Tests (Phase 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(campaignApi.getTimeline).mockResolvedValue([]);
    vi.mocked(campaignApi.getRecentActivities).mockResolvedValue([]);
  });

  it('should render real openRate percentage in Recent Campaigns table when available', async () => {
    vi.mocked(campaignApi.getStats).mockResolvedValue({
      totalDeliveries: 10,
      scheduledCount: 0,
      processingCount: 0,
      sentCount: 8,
      failedCount: 2,
      cancelledCount: 0,
      rateLimitedCount: 0,
      trackedOpens: 4,
      uniqueOpenedCount: 2,
      openRate: 25.0,
      totalClicks: 2,
      uniqueClickedCount: 1,
      clickRate: 12.5
    });

    vi.mocked(campaignApi.getCampaigns).mockResolvedValue({
      campaigns: [
        {
          id: 'camp-1',
          userId: 'test-user',
          senderId: 'sender-1',
          senderEmail: 'sender@test.com',
          senderName: 'Sender',
          subject: 'Q3 Enterprise Outreach',
          bodyText: 'Hello',
          totalRecipients: 8,
          scheduledStartTime: new Date().toISOString(),
          delayBetweenEmailsSeconds: 2,
          hourlyLimit: 100,
          idempotencyKey: 'idemp-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          stats: {
            total: 8,
            scheduled: 0,
            processing: 0,
            sent: 8,
            failed: 0,
            cancelled: 0,
            rateLimited: 0
          }
        }
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Q3 Enterprise Outreach')).toBeTruthy();
    });

    // Verify 25.0% openRate is rendered in the table
    expect(screen.getByText('25.0%')).toBeTruthy();
  });

  it('should render 0.0% when sent deliveries exist but zero opens are tracked', async () => {
    vi.mocked(campaignApi.getStats).mockResolvedValue({
      totalDeliveries: 5,
      scheduledCount: 0,
      processingCount: 0,
      sentCount: 5,
      failedCount: 0,
      cancelledCount: 0,
      rateLimitedCount: 0,
      trackedOpens: 0,
      uniqueOpenedCount: 0,
      openRate: 0.0,
      totalClicks: 0,
      uniqueClickedCount: 0,
      clickRate: 0.0
    });

    vi.mocked(campaignApi.getCampaigns).mockResolvedValue({
      campaigns: [
        {
          id: 'camp-2',
          userId: 'test-user',
          senderId: 'sender-1',
          senderEmail: 'sender@test.com',
          senderName: 'Sender',
          subject: 'Fresh Outreach Campaign',
          bodyText: 'Hello',
          totalRecipients: 5,
          scheduledStartTime: new Date().toISOString(),
          delayBetweenEmailsSeconds: 2,
          hourlyLimit: 100,
          idempotencyKey: 'idemp-2',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          stats: {
            total: 5,
            scheduled: 0,
            processing: 0,
            sent: 5,
            failed: 0,
            cancelled: 0,
            rateLimited: 0
          }
        }
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Fresh Outreach Campaign')).toBeTruthy();
    });

    expect(screen.getByText('0.0%')).toBeTruthy();
  });

  it('should render "—" when openRate is null because sentCount = 0', async () => {
    vi.mocked(campaignApi.getStats).mockResolvedValue({
      totalDeliveries: 0,
      scheduledCount: 0,
      processingCount: 0,
      sentCount: 0,
      failedCount: 0,
      cancelledCount: 0,
      rateLimitedCount: 0,
      trackedOpens: 0,
      uniqueOpenedCount: 0,
      openRate: null,
      totalClicks: 0,
      uniqueClickedCount: 0,
      clickRate: null
    });

    vi.mocked(campaignApi.getCampaigns).mockResolvedValue({
      campaigns: [
        {
          id: 'camp-3',
          userId: 'test-user',
          senderId: 'sender-1',
          senderEmail: 'sender@test.com',
          senderName: 'Sender',
          subject: 'Pending Scheduled Campaign',
          bodyText: 'Hello',
          totalRecipients: 10,
          scheduledStartTime: new Date().toISOString(),
          delayBetweenEmailsSeconds: 2,
          hourlyLimit: 100,
          idempotencyKey: 'idemp-3',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          stats: {
            total: 10,
            scheduled: 10,
            processing: 0,
            sent: 0,
            failed: 0,
            cancelled: 0,
            rateLimited: 0
          }
        }
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
    });

    render(
      <BrowserRouter>
        <DashboardPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Pending Scheduled Campaign')).toBeTruthy();
    });

    // When openRate is null, open rate cell renders '—'
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});
