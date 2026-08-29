import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext.js';
import { ComposerPage } from '../src/pages/ComposerPage.js';
import { CampaignsPage } from '../src/pages/CampaignsPage.js';
import { MonitoringPage } from '../src/pages/MonitoringPage.js';
import { DashboardPage } from '../src/pages/DashboardPage.js';
import { authApi } from '../src/api/auth.api.js';
import { campaignApi } from '../src/api/campaign.api.js';
import { searchApi } from '../src/api/search.api.js';
import { UserRole, EmailStatus } from '@reachinbox/shared';

describe('Milestone 4 Step 2B Frontend Component & Flow Tests', () => {
  const sampleUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'alex@reachinbox.ai',
    name: 'Alex Outreach',
    role: UserRole.USER,
    avatarUrl: null
  };

  const sampleSenders = [
    {
      id: 'sender-1',
      userId: sampleUser.id,
      email: 'sales@reachinbox.ai',
      name: 'Sales Outreach',
      smtpHost: 'smtp.ethereal.email',
      smtpPort: 587,
      smtpUser: 'sales_user',
      hourlyLimit: 100,
      minDelaySeconds: 2,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authApi, 'getMe').mockResolvedValue(sampleUser);
    vi.spyOn(campaignApi, 'getSenders').mockResolvedValue(sampleSenders);
    vi.spyOn(campaignApi, 'getStats').mockResolvedValue({
      totalDeliveries: 45,
      scheduledCount: 10,
      processingCount: 0,
      sentCount: 30,
      failedCount: 2,
      cancelledCount: 0,
      rateLimitedCount: 3
    });

    class MockFileReader {
      onload: ((e: any) => void) | null = null;
      readAsText(_file: any) {
        setTimeout(() => {
          if (this.onload) {
            this.onload({ target: { result: 'Email,Name\nlead@enterprise.com,Enterprise Lead' } });
          }
        }, 0);
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);
  });

  describe('Campaign Composer Tests', () => {
    it('Test 11 & 12: should prevent submission when required fields are missing', async () => {
      render(
        <MemoryRouter initialEntries={['/composer']}>
          <AuthProvider>
            <ComposerPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Campaign Composer/i)).toBeDefined();
      });

      const submitBtn = screen.getByRole('button', { name: /Schedule & Dispatch Campaign/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Please enter an email subject line/i)).toBeDefined();
      });
    });

    it('Test 13, 14, 15: should submit valid campaign with fresh idempotency key and render success view', async () => {
      const scheduleSpy = vi.spyOn(campaignApi, 'scheduleCampaign').mockResolvedValue({
        id: 'camp-created-123',
        userId: sampleUser.id,
        senderId: 'sender-1',
        senderEmail: 'sales@reachinbox.ai',
        senderName: 'Sales Outreach',
        subject: 'Q3 Enterprise Pitch',
        bodyText: 'Let us connect.',
        bodyHtml: null,
        totalRecipients: 1,
        scheduledStartTime: new Date().toISOString(),
        delayBetweenEmailsSeconds: 2,
        hourlyLimit: 100,
        idempotencyKey: 'fresh-idemp-key',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stats: { total: 1, scheduled: 1, processing: 0, sent: 0, failed: 0, cancelled: 0, rateLimited: 0 }
      });

      render(
        <MemoryRouter initialEntries={['/composer']}>
          <AuthProvider>
            <ComposerPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Campaign Composer/i)).toBeDefined();
      });

      // Fill Subject & Body
      const subjectInput = screen.getByPlaceholderText(/e.g. Quick question regarding your sales pipeline/i);
      fireEvent.change(subjectInput, { target: { value: 'Q3 Enterprise Pitch' } });

      const bodyInput = screen.getByPlaceholderText(/Hello, I noticed your recent product launch/i);
      fireEvent.change(bodyInput, { target: { value: 'Let us connect.' } });

      // Simulate file upload via hidden input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const csvFile = new File(['Email,Name\nlead@enterprise.com,Enterprise Lead'], 'leads.csv', { type: 'text/csv' });
      Object.defineProperty(fileInput, 'files', { value: [csvFile] });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText(/leads.csv/i)).toBeDefined();
      });

      const submitBtn = screen.getByRole('button', { name: /Schedule & Dispatch Campaign/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(scheduleSpy).toHaveBeenCalledTimes(1);
        expect(scheduleSpy.mock.calls[0]![0].subject).toBe('Q3 Enterprise Pitch');
        expect(scheduleSpy.mock.calls[0]![0].recipients.length).toBe(1);
        expect(scheduleSpy.mock.calls[0]![0].idempotencyKey).toBeDefined();
        expect(screen.getByText(/Campaign Scheduled Successfully!/i)).toBeDefined();
      });
    });
  });

  describe('Campaigns Page Tests', () => {
    it('Test 17 & 18: should render campaigns list with delivery progress and pagination', async () => {
      vi.spyOn(campaignApi, 'getCampaigns').mockResolvedValue({
        campaigns: [
          {
            id: 'camp-1',
            userId: sampleUser.id,
            senderId: 'sender-1',
            senderEmail: 'sales@reachinbox.ai',
            senderName: 'Sales Outreach',
            subject: 'SaaS Outreach Alpha',
            bodyText: 'Text',
            bodyHtml: null,
            totalRecipients: 10,
            scheduledStartTime: new Date().toISOString(),
            delayBetweenEmailsSeconds: 2,
            hourlyLimit: 100,
            idempotencyKey: 'idemp-1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            stats: { total: 10, scheduled: 3, processing: 0, sent: 7, failed: 0, cancelled: 0, rateLimited: 0 }
          }
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      });

      render(
        <MemoryRouter initialEntries={['/campaigns']}>
          <AuthProvider>
            <CampaignsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('SaaS Outreach Alpha')).toBeDefined();
        expect(screen.getByText(/7 Sent/i)).toBeDefined();
        expect(screen.getByText(/3 Scheduled/i)).toBeDefined();
        expect(screen.getByText(/Delivery Progress: 70%/i)).toBeDefined();
      });
    });

    it('Test 19: should render clean empty state when user has zero campaigns', async () => {
      vi.spyOn(campaignApi, 'getCampaigns').mockResolvedValue({
        campaigns: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 1 }
      });

      render(
        <MemoryRouter initialEntries={['/campaigns']}>
          <AuthProvider>
            <CampaignsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No campaigns found/i)).toBeDefined();
        expect(screen.getByRole('link', { name: /Create First Campaign/i })).toBeDefined();
      });
    });
  });

  describe('Delivery Monitoring & Search Tests', () => {
    it('Test 21 & 25: should render scheduled deliveries and allow cancellation', async () => {
      vi.spyOn(campaignApi, 'getScheduledDeliveries').mockResolvedValue({
        deliveries: [
          {
            id: 'del-scheduled-1',
            campaignId: 'camp-1',
            userId: sampleUser.id,
            senderId: 'sender-1',
            recipientEmail: 'lead@enterprise.com',
            recipientName: 'Lead One',
            idempotencyKey: 'idemp-del-1',
            status: EmailStatus.SCHEDULED,
            scheduledFor: new Date().toISOString(),
            retryCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            campaign: { id: 'camp-1', subject: 'Product Demo' }
          }
        ],
        pagination: { page: 1, limit: 15, total: 1, totalPages: 1 }
      });

      const cancelSpy = vi.spyOn(campaignApi, 'cancelDelivery').mockResolvedValue({
        id: 'del-scheduled-1',
        status: EmailStatus.CANCELLED
      });

      // Mock window.confirm
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/monitoring']}>
          <AuthProvider>
            <MonitoringPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('lead@enterprise.com')).toBeDefined();
        expect(screen.getByText('Product Demo')).toBeDefined();
      });

      const cancelBtn = screen.getByRole('button', { name: /Cancel Job/i });
      fireEvent.click(cancelBtn);

      await waitFor(() => {
        expect(cancelSpy).toHaveBeenCalledWith('del-scheduled-1');
      });
    });

    it('Test 22 & 27: should render sent deliveries with Ethereal preview link', async () => {
      vi.spyOn(campaignApi, 'getSentDeliveries').mockResolvedValue({
        deliveries: [
          {
            id: 'del-sent-1',
            campaignId: 'camp-1',
            userId: sampleUser.id,
            senderId: 'sender-1',
            recipientEmail: 'buyer@acme.com',
            recipientName: 'Acme Buyer',
            idempotencyKey: 'idemp-del-2',
            status: EmailStatus.SENT,
            scheduledFor: new Date().toISOString(),
            sentAt: new Date().toISOString(),
            etherealMessageId: '<test-msg-123@ethereal>',
            etherealPreviewUrl: 'https://ethereal.email/message/msg_12345',
            retryCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            campaign: { id: 'camp-1', subject: 'Acme Follow-up' }
          }
        ],
        pagination: { page: 1, limit: 15, total: 1, totalPages: 1 }
      });

      render(
        <MemoryRouter initialEntries={['/monitoring']}>
          <AuthProvider>
            <MonitoringPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/Delivery Queue & Observability/i)).toBeDefined();
      });

      // Switch to Sent tab
      const sentTabBtn = screen.getByRole('button', { name: /Sent Deliveries/i });
      fireEvent.click(sentTabBtn);

      await waitFor(() => {
        expect(screen.getByText('buyer@acme.com')).toBeDefined();
        const etherealLink = screen.getByRole('link', { name: /View in Ethereal/i });
        expect(etherealLink.getAttribute('href')).toBe('https://ethereal.email/message/msg_12345');
      });
    });

    it('Test 31 & 32: should execute debounced full-text search with engine indicator', async () => {
      const searchSpy = vi.spyOn(searchApi, 'searchEmails').mockResolvedValue({
        results: [
          {
            id: 'search-hit-1',
            campaignId: 'camp-1',
            senderEmail: 'sales@reachinbox.ai',
            recipientEmail: 'target@corp.com',
            recipientName: 'Target Corp',
            subject: 'AI Engine Discussion',
            status: 'SENT',
            sentAt: new Date().toISOString(),
            etherealPreviewUrl: 'https://ethereal.email/message/hit_1'
          }
        ],
        total: 1,
        source: 'elasticsearch'
      });

      render(
        <MemoryRouter initialEntries={['/monitoring']}>
          <AuthProvider>
            <MonitoringPage />
          </AuthProvider>
        </MemoryRouter>
      );

      // Switch to Search tab
      const searchTabBtn = screen.getByRole('button', { name: /Elasticsearch Search/i });
      fireEvent.click(searchTabBtn);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Search subject, body content/i)).toBeDefined();
      });

      const searchInput = screen.getByPlaceholderText(/Search subject, body content/i);
      fireEvent.change(searchInput, { target: { value: 'AI Engine' } });

      await waitFor(() => {
        expect(searchSpy).toHaveBeenCalledWith('AI Engine', 1, 20);
        expect(screen.getByText('AI Engine Discussion')).toBeDefined();
        expect(screen.getByText(/Elasticsearch 8.x Cluster/i)).toBeDefined();
      });
    });
  });

  describe('Dashboard Metrics & Security Tests', () => {
    it('Test 28 & 29: should render aggregate delivery stats accurately', async () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <AuthProvider>
            <DashboardPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('30')).toBeDefined(); // Delivered
        expect(screen.getByText('10')).toBeDefined(); // Scheduled
        expect(screen.getByText('3')).toBeDefined();  // Rate limited
        expect(screen.getByText('2')).toBeDefined();  // Failed
      });
    });

    it('Test 35: should verify zero credentials or tokens in browser storage', () => {
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('jwt')).toBeNull();
      expect(localStorage.getItem('smtpPass')).toBeNull();
      expect(sessionStorage.getItem('token')).toBeNull();
    });
  });
});
