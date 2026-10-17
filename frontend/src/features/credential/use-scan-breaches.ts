'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { credentialApi } from './credential.api';
import { decryptCredential, encryptCredential } from '@/libs/crypto/vault';
import { checkPassword } from '@/libs/crypto/breachCheck';
import { KeyStore } from '@/stores/key.store';
import type { EncryptedCredential } from '@/types';

export function useScanBreaches() {
    const qc = useQueryClient();
    const [scanning, setScanning] = useState(false);
    const [progress, setProgress] = useState('');

    async function scan(rows: EncryptedCredential[]) {
        const key = KeyStore.getState().encryptionKey;
        if (!key) return;
        setScanning(true); setProgress('');
        try {
            let done = 0;
            for (const row of rows) {
                try {
                    const data = await decryptCredential(key, { ciphertext: row.ciphertext, iv: row.iv });
                    const result = await checkPassword(data.password);
                    const updated = { ...data, breachCount: result.count, checkedAt: result.checkedAt };
                    const blob = await encryptCredential(key, updated);
                    await credentialApi.update(row.id, blob);
                } catch {
                    // một mục lỗi không làm hỏng cả lượt quét
                }
                done += 1;
                setProgress(`Đã kiểm tra ${done}/${rows.length} mục`);
            }
            await qc.invalidateQueries({ queryKey: ['credentials'] });
        } finally {
            setScanning(false);
        }
    }

    return { scan, scanning, progress };
}