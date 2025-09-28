export interface NostrProfile {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  banner?: string;
  website?: string;
  lud16?: string;
  nip05?: string;
  created_at?: number;
  updated_at?: number;
}

export interface User {
  pubkey: string;
  secretKey: string;
  profile?: NostrProfile;
  isAuthenticated: boolean;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (secretKey: string) => Promise<void>;
  logout: () => void;
  updateProfile: (profile: NostrProfile) => void;
  generateNewKeys: () => void;
  exportKeys: () => void;
  exportSecretKey: () => void;
  exportPublicKey: () => void;
}
