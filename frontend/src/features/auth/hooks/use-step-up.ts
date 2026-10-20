'use client';
import { authApi } from '../api/auth.api';
import { computeAuthHash } from '@/stores/key.store';
import { use2faStatus } from './use-2fa';
import type { StepUp } from '@/types';

// Chứng minh "vẫn là chủ kho": chạy lại Argon2id trên máy -> authHash. Mật khẩu không rời máy.
async function reauthProof(password: string): Promise<string> {
    const { kdfSalt } = await authApi.keys();
    const { authHash, encryptionKey } = await computeAuthHash(password, kdfSalt);
    encryptionKey.fill(0);
    return authHash;
}

export function useStepUp() {
    const status = use2faStatus();
    const uses2fa = status.data?.enabled === true;
    return {
        ready: status.isSuccess,
        uses2fa,
        placeholder: uses2fa ? 'Mã 2FA (6 số / mã dự phòng)' : 'Nhập lại mật khẩu chủ',
        build: async (secret: string): Promise<StepUp> =>
            uses2fa ? { code: secret.trim() } : { reauth: await reauthProof(secret) },
    };
}
