export const bytesToBase64 = (bytes: Uint8Array): string => {
    let s = '';
    for (let i = 0; i < bytes.length; i++) {
        s += String.fromCharCode(bytes[i]);
    }
    return btoa(s);
};

export const base64ToBytes = (b64: string): Uint8Array => {
    const s = atob(b64);
    const out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) {
        out[i] = s.charCodeAt(i);
    }
    return out;
};

export const utf8ToBytes = (text: string): Uint8Array => {
    return new TextEncoder().encode(text);
};

export const bytesToUtf8 = (bytes: Uint8Array): string => {
    return new TextDecoder().decode(bytes);
};