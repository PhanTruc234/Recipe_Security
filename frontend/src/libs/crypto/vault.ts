import { seal, open, type Sealed } from './aead';
import { bytesToUtf8, utf8ToBytes } from './encoding';

export type RevealAuthMode = 'none' | 'quick' | 'pin' | 'bio';

export interface CredentialData {
    service: string;
    url: string;
    username: string;
    password: string;
    note: string;
    breachCount: number | null;
    checkedAt: string | null;
    requireRevealAuth?: RevealAuthMode;
}

export const emptyCredential = (): CredentialData => {
    return {
        service: '',
        url: '',
        username: '',
        password: '',
        note: '',
        breachCount: null,
        checkedAt: null,
        requireRevealAuth: 'none',
    };
};

// AAD gắn ciphertext với id của chính mục đó -> server tráo ciphertext giữa 2 mục
// thì AES-GCM báo lỗi xác thực. Không cần userId: mỗi user đã có khóa riêng.
const credentialAad = (id: string) => `bepnha-cred-v2:${id}`;

// Đổi thành false sau khi mọi tài khoản đã mở kho 1 lần (mục cũ đã được nâng cấp hết).
// Khi còn true, server vẫn có thể tráo các blob định dạng CŨ (không AAD).
export const ALLOW_LEGACY_CREDENTIALS = true;

export const encryptCredential = async (key: Uint8Array, id: string, data: CredentialData): Promise<Sealed> => {
    return seal(utf8ToBytes(JSON.stringify(data)), key, credentialAad(id));
};

export const decryptCredential = async (
    key: Uint8Array,
    id: string,
    blob: Sealed,
): Promise<{ data: CredentialData; legacy: boolean }> => {
    try {
        const bytes = await open(blob, key, credentialAad(id));
        return { data: JSON.parse(bytesToUtf8(bytes)) as CredentialData, legacy: false };
    } catch (e) {
        if (!ALLOW_LEGACY_CREDENTIALS) throw e;
        const bytes = await open(blob, key); // định dạng cũ, không AAD
        return { data: JSON.parse(bytesToUtf8(bytes)) as CredentialData, legacy: true };
    }
};

const VERIFY_TEXT = 'bepnha-vault-verify-v1';

export const makeVerifier = async (key: Uint8Array): Promise<string> => {
    return JSON.stringify(
        await seal(utf8ToBytes(VERIFY_TEXT), key)
    );
};

export const checkVerifier = async (key: Uint8Array, verifier: string): Promise<boolean> => {
    try {
        const bytes = await open(
            JSON.parse(verifier) as Sealed,
            key
        );

        return bytesToUtf8(bytes) === VERIFY_TEXT;
    } catch {
        return false;
    }
};