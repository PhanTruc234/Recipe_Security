import { base64ToBytes, bytesToBase64, utf8ToBytes } from './encoding';

export const KDF_ITERATIONS = 600_000;
export const generateKdfSalt = (): string => {
    return bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
};
const hkdf = async (ikm: Uint8Array, salt: Uint8Array, info: string, lengthBytes: number): Promise<Uint8Array> => {
    const key = await crypto.subtle.importKey(
        'raw',
        ikm as BufferSource,
        'HKDF',
        false,
        ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: salt as BufferSource,
            info: utf8ToBytes(info) as BufferSource,
        },
        key,
        lengthBytes * 8
    );

    return new Uint8Array(bits);
};
export const deriveMasterKey = async (password: string, kdfSaltB64: string, iterations: number = KDF_ITERATIONS): Promise<Uint8Array> => {
    const baseKey = await crypto.subtle.importKey(
        'raw',
        utf8ToBytes(password) as BufferSource,
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: base64ToBytes(kdfSaltB64) as BufferSource,
            iterations,
            hash: 'SHA-256',
        },
        baseKey,
        256
    );

    return new Uint8Array(bits);
};
export const deriveAuthHash = async (masterKey: Uint8Array, password: string): Promise<string> => {
    const baseKey = await crypto.subtle.importKey(
        'raw',
        masterKey as BufferSource,
        'PBKDF2',
        false,
        ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: utf8ToBytes(password) as BufferSource,
            iterations: 1,
            hash: 'SHA-256',
        },
        baseKey,
        256
    );

    return bytesToBase64(new Uint8Array(bits));
};
export const deriveEncryptionKey = async (masterKey: Uint8Array): Promise<Uint8Array> => {
    return hkdf(
        masterKey,
        new Uint8Array(0),
        'bepnha-encryption-key-v1',
        32
    );
};