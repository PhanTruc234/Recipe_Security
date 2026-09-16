
export interface Recipe {
    name: string;
    cuisine: string;
    level: string;
    timeMinutes: number;
    servings: number;
    ingredients: string[];
    steps: string[];
}

export interface SearchResponse {
    unlocked?: 'real' | 'fake';
    notFound?: boolean;
    recipe?: Recipe;
}

export interface FakeVaultResponse {
    notes: { title: string; body: string }[];
}
export interface SessionInfo {
    authenticated: boolean;
    userId: string | null;
    role: string | null;
    vaultGate: string | null;
    fakeUnlocked: boolean;
    pending2fa: boolean;
    newDeviceAlert: NewDeviceAlert | null;
}

export interface NewDeviceAlert {
    at: string;
    ip: string | null;
    userAgent: string | null;
}

export interface KdfParams {
    kdfSalt: string;
    kdfIterations: number;
}

export interface KeyBundle {
    verifier: string;
    kdfSalt: string;
    kdfIterations: number;
}

export interface AuthResponse extends Partial<KeyBundle> {
    role?: string;
    twofa?: boolean;
}

export interface RegisterPayload {
    name: string;
    email: string;
    authHash: string;
    kdfSalt: string;
    kdfIterations: number;
    verifier: string;
}

export interface LoginPayload {
    email: string;
    authHash: string;
}

export interface Status2faResponse {
    enabled: boolean;
}

export interface Setup2faResponse {
    secret: string;
    qr: string;
}

export interface Enable2faResponse {
    backupCodes: string[];
}

export interface OkResponse {
    ok: boolean;
}

export interface EncryptedCredential {
    id: string;
    ciphertext: string;
    iv: string;
    createdAt: string;
    updatedAt: string;
}

export interface CredentialsResponse {
    credentials: EncryptedCredential[];
}

export interface AdminStats {
    users: number;
    admins: number;
    credentials: number;
    loginFailures: number;
    searchBursts: number;
}

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    _count: { credentials: number };
}

export interface AdminEvent {
    event: string;
    total: number;
}

export interface LogEntry {
    id: string;
    event: string;
    userId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
    context?: Record<string, unknown> | null;
    createdAt: string;
    user?: { email: string } | null;
}

export interface AdminData {
    stats: AdminStats;
    users: AdminUser[];
    logs: LogEntry[];
    events: AdminEvent[];
}

export interface CiphertextSample {
    id: string;
    owner: string;
    updatedAt: string;
    ciphertext: string;
    iv: string;
}

export interface CiphertextResponse {
    samples: CiphertextSample[];
}

export interface IntegrityIssue {
    id: string;
    type: string;
    message: string;
}

export interface IntegrityResult {
    ok: boolean;
    total: number;
    issues: IntegrityIssue[];
}
