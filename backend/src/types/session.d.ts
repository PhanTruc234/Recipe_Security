import 'express-session';

declare module 'express-session' {
    interface SessionData {
        userId?: string;
        role?: string;
        vaultGate?: 'real';
        fakeUnlocked?: boolean;
        vaultLastActivity?: number;
        pendingTotpSecret?: string;
        pending2fa?: { userId: string; role: string; ts: number };
    }
}