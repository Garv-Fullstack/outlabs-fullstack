import { UserRole } from '@reachinbox/shared';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  authenticated: boolean;
  error: string | null;
}
