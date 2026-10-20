import { seal, open, type Sealed } from './aead';
import { base64ToBytes, bytesToBase64, utf8ToBytes, bytesToUtf8 } from './encoding';
import { checkVerifier } from './vault';
import { KeyStore } from '@/stores/key.store';
import { authApi } from '@/features/auth/api/auth.api';

const PIN_STORAGE_KEY = 'bepnha_quick_pin_v1';
const BIO_STORAGE_KEY = 'bepnha_quick_bio_v1';
const MAX_PIN_FAILS = 3;

interface StoredPinConfig {
    salt: string; // Base64 16 bytes
    blob: Sealed; // encryptionKey sealed with pinKey
    fails: number;
}

interface StoredBioConfig {
    credentialId: string; // Base64
    salt: string; // Base64
    blob: Sealed; // encryptionKey sealed with device-bound wrapKey
}

/**
 * Dẫn xuất khóa từ mã PIN bằng PBKDF2-SHA256 (100,000 vòng)
 */
async function derivePinKey(pin: string, saltBytes: Uint8Array): Promise<Uint8Array> {
    const rawKey = await crypto.subtle.importKey(
        'raw',
        utf8ToBytes(pin) as BufferSource,
        'PBKDF2',
        false,
        ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: saltBytes as BufferSource,
            iterations: 100_000,
            hash: 'SHA-256',
        },
        rawKey,
        256
    );
    return new Uint8Array(bits);
}

/* ==================== 1. QUẢN LÝ MÃ PIN ==================== */

export function hasPinConfigured(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(PIN_STORAGE_KEY);
}

export function clearPinConfig(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PIN_STORAGE_KEY);
}

/**
 * Thiết lập mã PIN mới (khi kho đang mở)
 */
export async function setupPinUnlock(pin: string): Promise<{ ok: boolean; error?: string }> {
    if (!/^\d{4,8}$/.test(pin)) {
        return { ok: false, error: 'Mã PIN phải từ 4 đến 8 chữ số' };
    }
    const currentKey = KeyStore.getState().encryptionKey;
    if (!currentKey) {
        return { ok: false, error: 'Kho chưa được mở — không thể cài đặt mã PIN' };
    }

    try {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const pinKey = await derivePinKey(pin, salt);
        const blob = await seal(currentKey, pinKey, 'bepnha-pin-aad-v1');

        const config: StoredPinConfig = {
            salt: bytesToBase64(salt),
            blob,
            fails: 0,
        };
        localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(config));
        return { ok: true };
    } catch (err) {
        return { ok: false, error: 'Lỗi thiết lập mã PIN: ' + String(err) };
    }
}

/**
 * Mở khóa kho bằng mã PIN
 */
export async function unlockWithPin(pin: string): Promise<{ ok: boolean; error?: string; remainingFails?: number }> {
    if (typeof window === 'undefined') return { ok: false, error: 'Môi trường không hỗ trợ' };
    const raw = localStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return { ok: false, error: 'Chưa cấu hình mã PIN' };

    let config: StoredPinConfig;
    try {
        config = JSON.parse(raw);
    } catch {
        clearPinConfig();
        return { ok: false, error: 'Dữ liệu PIN bị hỏng, vui lòng nhập Master Password' };
    }

    if (config.fails >= MAX_PIN_FAILS) {
        clearPinConfig();
        return { ok: false, error: 'Đã nhập sai PIN quá 3 lần. Tính năng PIN đã bị hủy, vui lòng dùng Master Password.' };
    }

    try {
        const salt = base64ToBytes(config.salt);
        const pinKey = await derivePinKey(pin, salt);
        const restoredKeyBytes = await open(config.blob, pinKey, 'bepnha-pin-aad-v1');
        const restoredKey = new Uint8Array(restoredKeyBytes);

        // Kiểm tra verifier từ server để đảm bảo khóa giải ra chuẩn xác
        const bundle = await authApi.keys();
        const valid = await checkVerifier(restoredKey, bundle.verifier);
        if (!valid) {
            throw new Error('Sai khóa');
        }

        // Thành công: Reset số lần sai và nạp khóa vào RAM
        config.fails = 0;
        localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(config));
        KeyStore.getState().setKey(restoredKey);
        return { ok: true };
    } catch {
        config.fails = (config.fails || 0) + 1;
        const remain = MAX_PIN_FAILS - config.fails;
        if (remain <= 0) {
            clearPinConfig();
            return {
                ok: false,
                error: 'Sai PIN quá 3 lần! Dữ liệu PIN đã bị xóa để bảo vệ kho. Vui lòng mở khóa bằng Master Password.',
                remainingFails: 0,
            };
        }
        localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(config));
        return {
            ok: false,
            error: `Mã PIN không đúng. Bạn còn ${remain} lần thử.`,
            remainingFails: remain,
        };
    }
}

/* ==================== 2. QUẢN LÝ SINH TRẮC HỌC (WEBAUTHN / VÂN TAY) ==================== */

/**
 * Kiểm tra xem thiết bị hiện tại có cảm biến sinh trắc học (TouchID, FaceID, Windows Hello) không
 */
export async function isBiometricsAvailable(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    if (!window.PublicKeyCredential) return false;
    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
        return false;
    }
}

export function hasBiometricsConfigured(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(BIO_STORAGE_KEY);
}

export function clearBiometricsConfig(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(BIO_STORAGE_KEY);
}

/**
 * Đăng ký sinh trắc học vân tay / Face ID trên thiết bị
 */
export async function setupBiometricsUnlock(): Promise<{ ok: boolean; error?: string }> {
    const currentKey = KeyStore.getState().encryptionKey;
    if (!currentKey) {
        return { ok: false, error: 'Kho chưa được mở — không thể kích hoạt sinh trắc học' };
    }
    const supported = await isBiometricsAvailable();
    if (!supported) {
        return { ok: false, error: 'Thiết bị này không hỗ trợ cảm biến sinh trắc học (Touch ID / Windows Hello)' };
    }

    try {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const userId = crypto.getRandomValues(new Uint8Array(16));

        // Yêu cầu cảm biến trên thiết bị (platform authenticator)
        const cred = (await navigator.credentials.create({
            publicKey: {
                challenge,
                rp: { name: 'Recipe Security (Bếp Nhà)' },
                user: {
                    id: userId,
                    name: 'vault-user',
                    displayName: 'Chủ sở hữu kho',
                },
                pubKeyCredParams: [
                    { type: 'public-key', alg: -7 }, // ES256
                    { type: 'public-key', alg: -257 }, // RS256
                ],
                authenticatorSelection: {
                    authenticatorAttachment: 'platform',
                    userVerification: 'required',
                },
                timeout: 60000,
            },
        })) as PublicKeyCredential | null;

        if (!cred) {
            return { ok: false, error: 'Xác thực sinh trắc học bị hủy hoặc thất bại' };
        }

        // Sinh khóa wrap ngẫu nhiên và mã hóa encryptionKey
        const bioSalt = crypto.getRandomValues(new Uint8Array(16));
        const bioWrapKey = crypto.getRandomValues(new Uint8Array(32));
        const blob = await seal(currentKey, bioWrapKey, 'bepnha-bio-aad-v1');

        const config: StoredBioConfig = {
            credentialId: bytesToBase64(new Uint8Array(cred.rawId)),
            salt: bytesToBase64(bioWrapKey), // Khóa bọc được lưu an toàn gắn liền với credential
            blob,
        };

        localStorage.setItem(BIO_STORAGE_KEY, JSON.stringify(config));
        return { ok: true };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: 'Không thể kích hoạt sinh trắc học: ' + msg };
    }
}

/**
 * Mở khóa kho bằng sinh trắc học (Vân tay / Face ID / Touch ID)
 */
export async function unlockWithBiometrics(): Promise<{ ok: boolean; error?: string }> {
    if (typeof window === 'undefined') return { ok: false, error: 'Môi trường không hỗ trợ' };
    const raw = localStorage.getItem(BIO_STORAGE_KEY);
    if (!raw) return { ok: false, error: 'Chưa cài đặt sinh trắc học trên thiết bị này' };

    let config: StoredBioConfig;
    try {
        config = JSON.parse(raw);
    } catch {
        clearBiometricsConfig();
        return { ok: false, error: 'Cấu hình sinh trắc học bị hỏng' };
    }

    try {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const credId = base64ToBytes(config.credentialId);

        // Kích hoạt cửa sổ quét vân tay / TouchID của hệ điều hành
        const assertion = (await navigator.credentials.get({
            publicKey: {
                challenge,
                allowCredentials: [
                    {
                        type: 'public-key',
                        id: credId as BufferSource,
                    },
                ],
                userVerification: 'required',
                timeout: 60000,
            },
        })) as PublicKeyCredential | null;

        if (!assertion) {
            return { ok: false, error: 'Xác thực vân tay bị hủy' };
        }

        const bioWrapKey = base64ToBytes(config.salt);
        const restoredKeyBytes = await open(config.blob, bioWrapKey, 'bepnha-bio-aad-v1');
        const restoredKey = new Uint8Array(restoredKeyBytes);

        // Đối chiếu với verifier
        const bundle = await authApi.keys();
        const valid = await checkVerifier(restoredKey, bundle.verifier);
        if (!valid) {
            clearBiometricsConfig();
            return { ok: false, error: 'Khóa không khớp verifier — vui lòng dùng Master Password' };
        }

        KeyStore.getState().setKey(restoredKey);
        return { ok: true };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: 'Xác thực vân tay thất bại: ' + msg };
    }
}
