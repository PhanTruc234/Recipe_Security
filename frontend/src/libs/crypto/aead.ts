import { base64ToBytes, bytesToBase64, utf8ToBytes, } from './encoding';

export interface Sealed {
    ciphertext: string;
    iv: string;
}

const importAesKey = async (key: Uint8Array, usage: KeyUsage[]): Promise<CryptoKey> => {
    return crypto.subtle.importKey(
        'raw',
        key as BufferSource,
        { name: 'AES-GCM' },
        false,
        usage
    );
};

export const seal = async (plaintext: Uint8Array, key: Uint8Array, aad?: string): Promise<Sealed> => {
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const cryptoKey = await importAesKey(key, ['encrypt']);

    const params: AesGcmParams = {
        name: 'AES-GCM',
        iv: iv as BufferSource,
    };

    if (aad) {
        params.additionalData = utf8ToBytes(aad) as BufferSource;
    }

    const buf = await crypto.subtle.encrypt(
        params,
        cryptoKey,
        plaintext as BufferSource
    ); // trả về một ArrayBuffer

    return {
        ciphertext: bytesToBase64(new Uint8Array(buf)),
        iv: bytesToBase64(iv),
    };
};

export const open = async (sealed: Sealed, key: Uint8Array, aad?: string): Promise<Uint8Array> => {
    const cryptoKey = await importAesKey(key, ['decrypt']);

    const params: AesGcmParams = {
        name: 'AES-GCM',
        iv: base64ToBytes(sealed.iv) as BufferSource,
    };

    if (aad) {
        params.additionalData = utf8ToBytes(aad) as BufferSource;
    }

    const buf = await crypto.subtle.decrypt(
        params,
        cryptoKey,
        base64ToBytes(sealed.ciphertext) as BufferSource
    );

    return new Uint8Array(buf);
};