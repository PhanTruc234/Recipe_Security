import { create } from 'zustand';
import type { KeyBundle } from '@/types';
import { deriveAuthHash, deriveEncryptionKey, deriveMasterKey } from '@/libs/crypto/kdf';
import { checkVerifier } from '@/libs/crypto/vault';

export type LockReason = 'idle' | 'server' | 'manual' | null;

interface KeyState {
    encryptionKey: Uint8Array | null;
    unlocked: boolean;
    lockReason: LockReason;
    unlock: (password: string, bundle: KeyBundle) => Promise<boolean>;
    setKey: (encryptionKey: Uint8Array) => void;
    lock: (reason?: LockReason) => void;
}

export const KeyStore = create<KeyState>((set, get) => ({
    encryptionKey: null,
    unlocked: false,
    lockReason: null,

    unlock: async (password, bundle) => {
        const masterKey = await deriveMasterKey(password, bundle.kdfSalt, bundle.kdfIterations);
        const encryptionKey = await deriveEncryptionKey(masterKey);
        if (!(await checkVerifier(encryptionKey, bundle.verifier))) {
            return false;
        }
        set({ encryptionKey, unlocked: true, lockReason: null });
        return true;
    },

    setKey: (encryptionKey) => set({ encryptionKey, unlocked: true, lockReason: null }),
    lock: (reason = 'manual') => {
        const key = get().encryptionKey;
        if (key) key.fill(0);
        set({ encryptionKey: null, unlocked: false, lockReason: reason });
    },
}));

export const computeAuthHash = async (password: string, kdfSalt: string, iterations: number,) => {
    const masterKey = await deriveMasterKey(password, kdfSalt, iterations);
    return {
        authHash: await deriveAuthHash(masterKey, password),
        encryptionKey: await deriveEncryptionKey(masterKey),
    };
};