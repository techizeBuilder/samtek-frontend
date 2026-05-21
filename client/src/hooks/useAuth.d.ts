export interface AuthUser {
  id?: string | number;
  name?: string;
  fullName?: string;
  email?: string;
  companyName?: string;
  unit?: string;
  [key: string]: any;
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: any) => Promise<any>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export function useAuth(): AuthContextType;
