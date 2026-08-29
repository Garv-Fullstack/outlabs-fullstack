import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../src/context/AuthContext.js';
import { ProtectedRoute } from '../src/components/common/ProtectedRoute.js';
import { LoginPage } from '../src/pages/LoginPage.js';
import { DashboardPage } from '../src/pages/DashboardPage.js';
import { authApi } from '../src/api/auth.api.js';
import { ApiError } from '../src/api/client.js';
import { UserRole } from '@reachinbox/shared';

describe('Frontend Authentication & Protected Routing Tests (Step 2A)', () => {
  const sampleUser = {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'alex@reachinbox.ai',
    name: 'Alex Engineer',
    role: UserRole.USER,
    avatarUrl: null
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Test 1: Initial auth state should be loading and not render protected content', () => {
    // Hang getMe promise so loading state persists
    vi.spyOn(authApi, 'getMe').mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <ProtectedRoute>
            <div>Protected Sensitive Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Verifying authentication session/i)).toBeDefined();
    expect(screen.queryByText(/Protected Sensitive Content/i)).toBeNull();
  });

  it('Test 2: Successful GET /api/auth/me should hydrate user and render dashboard', async () => {
    vi.spyOn(authApi, 'getMe').mockResolvedValue(sampleUser);

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Alex Engineer/i)).toBeDefined();
      expect(screen.getByText(/Delivered Emails/i)).toBeDefined();
    });
  });

  it('Test 3: GET /api/auth/me 401 should produce clean unauthenticated state without crashing', async () => {
    vi.spyOn(authApi, 'getMe').mockRejectedValue(new ApiError('Authentication token required', 401, 'UNAUTHORIZED'));

    let authState: any;
    const TestConsumer = () => {
      authState = useAuth();
      return <div>Auth Consumer</div>;
    };

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(authState.loading).toBe(false);
      expect(authState.authenticated).toBe(false);
      expect(authState.user).toBeNull();
      expect(authState.error).toBeNull(); // 401 should not be an app error
    });
  });

  it('Test 4: Network/server failure should produce explicit error state', async () => {
    vi.spyOn(authApi, 'getMe').mockRejectedValue(new ApiError('Unable to connect to ReachInbox server', 0, 'NETWORK_FAILURE'));

    let authState: any;
    const TestConsumer = () => {
      authState = useAuth();
      return <div>Auth Consumer</div>;
    };

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(authState.loading).toBe(false);
      expect(authState.authenticated).toBe(false);
      expect(authState.error).toContain('Unable to connect');
    });
  });

  it('Test 5 & 6: Unauthenticated user accessing /dashboard should be redirected to /login', async () => {
    vi.spyOn(authApi, 'getMe').mockRejectedValue(new ApiError('Unauthorized', 401));

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Continue with Google/i)).toBeDefined();
      expect(screen.queryByText(/Welcome back/i)).toBeNull();
    });
  });

  it('Test 7: Authenticated user visiting /login should be redirected to /dashboard', async () => {
    vi.spyOn(authApi, 'getMe').mockResolvedValue(sampleUser);

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Alex Engineer/i)).toBeDefined();
      expect(screen.queryByText(/Continue with Google/i)).toBeNull();
    });
  });

  it('Test 8 & 9: Logout calls POST /api/auth/logout and clears user state', async () => {
    vi.spyOn(authApi, 'getMe').mockResolvedValue(sampleUser);
    const logoutSpy = vi.spyOn(authApi, 'logout').mockResolvedValue({ message: 'Logged out' });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Alex Engineer/i)).toBeDefined();
    });

    const logoutBtn = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutBtn);

    await waitFor(() => {
      expect(logoutSpy).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Continue with Google/i)).toBeDefined();
    });
  });

  it('Test 10: Security audit - No JWT or tokens are written to localStorage or sessionStorage', async () => {
    vi.spyOn(authApi, 'getMe').mockResolvedValue(sampleUser);

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, Alex Engineer/i)).toBeDefined();
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('jwt')).toBeNull();
    expect(localStorage.getItem('reachinbox_session')).toBeNull();
    expect(sessionStorage.getItem('token')).toBeNull();
    expect(sessionStorage.getItem('jwt')).toBeNull();
  });

  it('Test 11: Google login helper returns correct backend auth endpoint', () => {
    const url = authApi.getGoogleLoginUrl();
    expect(url).toContain('/auth/google');
  });

  it('Test 12: Protected content is never displayed before session check resolves', async () => {
    let resolveSession: any;
    const sessionPromise = new Promise((resolve) => {
      resolveSession = resolve;
    });

    vi.spyOn(authApi, 'getMe').mockReturnValue(sessionPromise as any);

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <ProtectedRoute>
            <div>Confidential Super Secret</div>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );

    // Initial check
    expect(screen.queryByText('Confidential Super Secret')).toBeNull();

    // Now resolve
    resolveSession(sampleUser);

    await waitFor(() => {
      expect(screen.getByText('Confidential Super Secret')).toBeDefined();
    });
  });
});
