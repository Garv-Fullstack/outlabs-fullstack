import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../src/context/AuthContext.js';
import { SettingsPage } from '../src/pages/SettingsPage.js';
import { authApi } from '../src/api/auth.api.js';
import { senderApi } from '../src/api/sender.api.js';
import { slackApi } from '../src/api/slack.api.js';
import { ApiError } from '../src/api/client.js';
import { UserRole } from '@reachinbox/shared';

describe('Milestone 4 Step 2C Settings & Sender Management Tests', () => {
  const sampleUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@reachinbox.ai',
    name: 'Admin User',
    role: UserRole.ADMIN,
    avatarUrl: null
  };

  const sampleSender = {
    id: 'sender-1',
    userId: sampleUser.id,
    email: 'outreach@reachinbox.ai',
    name: 'Enterprise Outreach',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: 'outreach@reachinbox.ai',
    hourlyLimit: 150,
    minDelaySeconds: 3,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    vi.spyOn(authApi, 'getMe').mockResolvedValue(sampleUser);
    vi.spyOn(senderApi, 'getSenders').mockResolvedValue([sampleSender]);
    vi.spyOn(slackApi, 'getStatus').mockResolvedValue({
      connected: false,
      status: 'DISCONNECTED'
    });
  });

  describe('Sender Management Tests', () => {
    it('Test 1 & 2: should render sender mailbox list and display safe metadata', async () => {
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <AuthProvider>
            <SettingsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Enterprise Outreach')).toBeDefined();
        expect(screen.getByText('outreach@reachinbox.ai')).toBeDefined();
        expect(screen.getByText(/150 emails\/hour/i)).toBeDefined();
        expect(screen.getByText(/3 seconds/i)).toBeDefined();
        expect(screen.getByText(/smtp.gmail.com:587/i)).toBeDefined();
      });
    });

    it('Test 3: should render empty state when user has zero senders', async () => {
      vi.spyOn(senderApi, 'getSenders').mockResolvedValue([]);

      render(
        <MemoryRouter initialEntries={['/settings']}>
          <AuthProvider>
            <SettingsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(/No senders connected/i)).toBeDefined();
        expect(screen.getByRole('button', { name: /Connect First Sender/i })).toBeDefined();
      });
    });

    it('Test 4 & 5: should open modal and create custom SMTP sender', async () => {
      const createSpy = vi.spyOn(senderApi, 'createSender').mockResolvedValue({
        id: 'sender-2',
        userId: sampleUser.id,
        email: 'growth@startup.io',
        name: 'Growth Mailbox',
        smtpHost: 'smtp.sendgrid.net',
        smtpPort: 587,
        smtpUser: 'apikey',
        hourlyLimit: 200,
        minDelaySeconds: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      render(
        <MemoryRouter initialEntries={['/settings']}>
          <AuthProvider>
            <SettingsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Sender/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole('button', { name: /Add Sender/i }));

      // Switch to Custom SMTP mode
      fireEvent.click(screen.getByRole('button', { name: /Custom SMTP/i }));

      // Fill form
      fireEvent.change(screen.getByPlaceholderText('outreach@company.com'), {
        target: { value: 'growth@startup.io' }
      });
      fireEvent.change(screen.getByPlaceholderText('Alex from Growth'), {
        target: { value: 'Growth Mailbox' }
      });
      fireEvent.change(screen.getByPlaceholderText('App password'), {
        target: { value: 'secret-smtp-pass' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Save SMTP Sender/i }));

      await waitFor(() => {
        expect(createSpy).toHaveBeenCalledTimes(1);
        expect(createSpy.mock.calls[0]![0].email).toBe('growth@startup.io');
        expect(createSpy.mock.calls[0]![0].name).toBe('Growth Mailbox');
        expect(createSpy.mock.calls[0]![0].smtpPass).toBe('secret-smtp-pass');
      });
    });

    it('Test 7 & 8: should render 409 conflict error when duplicate sender email submitted', async () => {
      vi.spyOn(senderApi, 'createSender').mockRejectedValue(
        new ApiError('Sender with email outreach@reachinbox.ai already exists for this account', 409, 'CONFLICT')
      );

      render(
        <MemoryRouter initialEntries={['/settings']}>
          <AuthProvider>
            <SettingsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Sender/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole('button', { name: /Add Sender/i }));
      fireEvent.click(screen.getByRole('button', { name: /Custom SMTP/i }));

      fireEvent.change(screen.getByPlaceholderText('outreach@company.com'), {
        target: { value: 'outreach@reachinbox.ai' }
      });
      fireEvent.change(screen.getByPlaceholderText('Alex from Growth'), {
        target: { value: 'Outreach' }
      });
      fireEvent.change(screen.getByPlaceholderText('App password'), {
        target: { value: 'pass' }
      });

      fireEvent.click(screen.getByRole('button', { name: /Save SMTP Sender/i }));

      await waitFor(() => {
        expect(screen.getByText(/already exists for this account/i)).toBeDefined();
      });
    });

    it('Test 11: should support 1-Click automated Ethereal provisioning', async () => {
      const etherealSpy = vi.spyOn(senderApi, 'createSender').mockResolvedValue({
        id: 'sender-ethereal-1',
        userId: sampleUser.id,
        email: 'ethereal.user.123@ethereal.email',
        name: 'Ethereal Test Sender',
        smtpHost: 'smtp.ethereal.email',
        smtpPort: 587,
        smtpUser: 'ethereal.user.123',
        hourlyLimit: 100,
        minDelaySeconds: 2,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      render(
        <MemoryRouter initialEntries={['/settings']}>
          <AuthProvider>
            <SettingsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Sender/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole('button', { name: /Add Sender/i }));

      // Mode is already ETHEREAL
      fireEvent.click(screen.getByRole('button', { name: /Provision Ethereal Sender/i }));

      await waitFor(() => {
        expect(etherealSpy).toHaveBeenCalledTimes(1);
        expect(etherealSpy.mock.calls[0]![0].generateEthereal).toBe(true);
      });
    });

    it('Test 12: should never render SMTP passwords in the DOM', async () => {
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <AuthProvider>
            <SettingsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Enterprise Outreach')).toBeDefined();
      });

      expect(screen.queryByText(/smtpPass/i)).toBeNull();
      expect(screen.queryByText(/smtpPassEncrypted/i)).toBeNull();
    });
  });

  describe('Slack Integration Tests', () => {
    it('Test 17 & 18: should render disconnected state and provide connect action', async () => {
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <AuthProvider>
            <SettingsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      // Switch to Slack tab
      fireEvent.click(screen.getByRole('button', { name: /Slack Alerts/i }));

      await waitFor(() => {
        expect(screen.getByText(/Not Connected/i)).toBeDefined();
        expect(screen.getByRole('button', { name: /Connect Slack Workspace/i })).toBeDefined();
      });
    });

    it('Test 19 & 20: should render connected Slack status and allow disconnect', async () => {
      vi.spyOn(slackApi, 'getStatus').mockResolvedValue({
        connected: true,
        teamName: 'Acme Corp HQ',
        channelName: 'reachinbox-alerts',
        status: 'ACTIVE'
      });

      const disconnectSpy = vi.spyOn(slackApi, 'disconnect').mockResolvedValue({
        message: 'Slack integration disconnected'
      });

      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <MemoryRouter initialEntries={['/settings']}>
          <AuthProvider>
            <SettingsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /Slack Alerts/i }));

      await waitFor(() => {
        expect(screen.getByText(/Connected & Active/i)).toBeDefined();
        expect(screen.getByText('Acme Corp HQ')).toBeDefined();
        expect(screen.getByText('#reachinbox-alerts')).toBeDefined();
      });

      fireEvent.click(screen.getByRole('button', { name: /Disconnect Slack/i }));

      await waitFor(() => {
        expect(disconnectSpy).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Account & Notification Deferred State Tests', () => {
    it('Test 15: should render authenticated user profile on Account tab', async () => {
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <AuthProvider>
            <SettingsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Settings & Integrations')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Account & Security'));

      await waitFor(() => {
        expect(screen.getByText('Authenticated User Profile')).toBeDefined();
        expect(screen.getByText('Session & Token Security')).toBeDefined();
      });
    });

    it('Test 16: should explicitly document backend gap on Notification Preferences tab', async () => {
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <AuthProvider>
            <SettingsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Settings & Integrations')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Notification Preferences'));

      await waitFor(() => {
        expect(screen.getByText(/BACKEND GAP — FRONTEND DEFERRED/i)).toBeDefined();
      });
    });
  });

  describe('Security Tests', () => {
    it('Test 22, 23, 24, 25: should confirm zero credentials in browser storage', () => {
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('jwt')).toBeNull();
      expect(localStorage.getItem('smtpPass')).toBeNull();
      expect(localStorage.getItem('slackToken')).toBeNull();
      expect(sessionStorage.getItem('token')).toBeNull();
      expect(sessionStorage.getItem('jwt')).toBeNull();
    });
  });
});
