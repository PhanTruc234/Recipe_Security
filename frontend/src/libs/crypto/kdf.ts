import { argon2id } from 'hash-wasm';
import { base64ToBytes, bytesToBase64, utf8ToBytes } from './encoding';

export const ARGON2_PARAMS = {
    memorySize: 19_456,
    iterations: 2,
    parallelism: 1,
    hashLength: 32,
} as const;

export const generateKdfSalt = (): string => {
    return bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
};

const hkdf = async (
    ikm: Uint8Array,
    salt: Uint8Array,
    info: string,
    lengthBytes: number,
): Promise<Uint8Array> => {
    const key = await crypto.subtle.importKey('raw', ikm as BufferSource, 'HKDF', false, [
        'deriveBits',
    ]);
    const bits = await crypto.subtle.deriveBits(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt: salt as BufferSource,
            info: utf8ToBytes(info) as BufferSource,
        },
        key,
        lengthBytes * 8,
    );
    return new Uint8Array(bits);
};

export const deriveMasterKey = async (
    password: string,
    kdfSaltB64: string,
): Promise<Uint8Array> => {
    return argon2id({
        password,
        salt: base64ToBytes(kdfSaltB64),
        parallelism: ARGON2_PARAMS.parallelism,
        iterations: ARGON2_PARAMS.iterations,
        memorySize: ARGON2_PARAMS.memorySize,
        hashLength: ARGON2_PARAMS.hashLength,
        outputType: 'binary',
    });
};

export const deriveAuthHash = async (masterKey: Uint8Array): Promise<string> => {
    return bytesToBase64(await hkdf(masterKey, new Uint8Array(0), 'bepnha-auth-hash-v1', 32));
};

export const deriveEncryptionKey = async (masterKey: Uint8Array): Promise<Uint8Array> => {
    return hkdf(masterKey, new Uint8Array(0), 'bepnha-encryption-key-v1', 32);
};