import { seal, open, type Sealed } from './aead';
import { bytesToUtf8, utf8ToBytes } from './encoding';

export interface CredentialData {
    service: string;
    url: string;
    username: string;
    password: string;
    note: string;
    breachCount: number | null;
    checkedAt: string | null;
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
    };
};

export const encryptCredential = async (key: Uint8Array, data: CredentialData): Promise<Sealed> => {
    return seal(utf8ToBytes(JSON.stringify(data)), key);
};

export const decryptCredential = async (key: Uint8Array, blob: Sealed): Promise<CredentialData> => {
    const bytes = await open(blob, key);

    return JSON.parse(bytesToUtf8(bytes)) as CredentialData;
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