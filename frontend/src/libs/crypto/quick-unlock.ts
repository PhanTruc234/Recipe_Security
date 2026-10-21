import { seal, open, type Sealed } from './aead';
import { base64ToBytes, bytesToBase64, utf8ToBytes } from './encoding';
import { checkVerifier } from './vault';
import { deriveEncryptionKey, deriveMasterKey, hkdf } from './kdf';
import { KeyStore } from '@/stores/key.store';
import { authApi } from '@/features/auth/api/auth.api';

const PIN_STORAGE_KEY = 'bepnha_quick_pin_v2';
const BIO_STORAGE_KEY = 'bepnha_quick_bio_v2';
// Bản v1: bio lưu khóa bọc ngay cạnh blob, PIN dò được offline -> xóa ngay khi gặp
const LEGACY_STORAGE_KEYS = ['bepnha_quick_pin_v1', 'bepnha_quick_bio_v1'];

const PIN_AAD = 'bepnha-pin-aad-v2';
const BIO_AAD = 'bepnha-bio-aad-v2';
const PIN_PBKDF2_ITERATIONS = 600_000;

type Result = { ok: boolean; error?: string };

interface StoredPinConfig {
    v: 2;
    userId: string;
    salt: string; // Base64 16 byte (công khai)
    blob: Sealed; // encryptionKey bọc bằng HKDF(PIN-local || server share)
}

interface StoredBioConfig {
    v: 2;
    userId: string;
    credentialId: string; // Base64 (công khai)
    prfSalt: string; // Base64 32 byte (công khai, đầu vào PRF)
    blob: Sealed; // encryptionKey bọc bằng HKDF(PRF output)
}

interface PrfResults {
    enabled?: boolean;
    results?: { first?: ArrayBuffer };
}

/* ==================== Tiện ích chung ==================== */

function purgeLegacy(): void {
    LEGACY_STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
}

function readConfig<T extends { v: 2 }>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    purgeLegacy();
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
        const cfg = JSON.parse(raw) as T;
        if (cfg?.v === 2) return cfg;
    } catch {
        /* hỏng -> xóa bên dưới */
    }
    localStorage.removeItem(key);
    return null;
}

const concat = (a: Uint8Array, b: Uint8Array): Uint8Array => {
    const out = new Uint8Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
};

const deriveKey = (ikm: Uint8Array, info: string) => hkdf(ikm, new Uint8Array(0), info, 32);

async function currentUserId(): Promise<string | null> {
    try {
        return (await authApi.me()).userId;
    } catch {
        return null;
    }
}

// Bật PIN / sinh trắc học phải nhập lại mật khẩu chủ: người cầm máy đang mở kho
// không được tự gắn PIN hay vân tay của họ vào kho của người khác.
async function verifyMasterPassword(password: string): Promise<boolean> {
    if (!password) return false;
    const bundle = await authApi.keys();
    const masterKey = await deriveMasterKey(password, bundle.kdfSalt);
    const encKey = await deriveEncryptionKey(masterKey);
    const ok = await checkVerifier(encKey, bundle.verifier);
    masterKey.fill(0);
    encKey.fill(0);
    return ok;
}

// Lấy bản sao khóa đang mở. Bản sao vì lock() ghi đè khóa gốc bằng 0 trong lúc ta đang await.
function snapshotKey(): Uint8Array | null {
    const key = KeyStore.getState().encryptionKey;
    return key ? key.slice() : null;
}

async function finishUnlock(restoredKey: Uint8Array): Promise<boolean> {
    const bundle = await authApi.keys();
    if (!(await checkVerifier(restoredKey, bundle.verifier))) return false;
    KeyStore.getState().setKey(restoredKey);
    return true;
}

/** Xóa toàn bộ cấu hình mở khóa nhanh trên trình duyệt này (gọi khi đăng xuất). */
export function clearQuickUnlockLocal(): void {
    if (typeof window === 'undefined') return;
    purgeLegacy();
    localStorage.removeItem(PIN_STORAGE_KEY);
    localStorage.removeItem(BIO_STORAGE_KEY);
}

/* ==================== 1. MÃ PIN ==================== */

async function pinMaterial(pin: string, salt: Uint8Array) {
    const rawKey = await crypto.subtle.importKey('raw', utf8ToBytes(pin) as BufferSource, 'PBKDF2', false, [
        'deriveBits',
    ]);
    const base = new Uint8Array(
        await crypto.subtle.deriveBits(
            { name: 'PBKDF2', salt: salt as BufferSource, iterations: PIN_PBKDF2_ITERATIONS, hash: 'SHA-256' },
            rawKey,
            256,
        ),
    );
    // proof gửi server để đổi lấy share; local giữ lại để ghép với share -> 2 nhánh HKDF độc lập
    const proof = bytesToBase64(await deriveKey(base, 'bepnha-pin-proof-v2'));
    const local = await deriveKey(base, 'bepnha-pin-local-v2');
    base.fill(0);
    return { proof, local };
}

export function hasPinConfigured(): boolean {
    return !!readConfig<StoredPinConfig>(PIN_STORAGE_KEY);
}

export function clearPinConfig(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(PIN_STORAGE_KEY);
}

/** Tắt PIN: xóa cả share trên server lẫn blob trên máy. */
export async function disablePinUnlock(): Promise<void> {
    clearPinConfig();
    await authApi.pinDisable();
}

export async function setupPinUnlock(pin: string, masterPassword: string): Promise<Result> {
    if (!/^\d{4,8}$/.test(pin)) {
        return { ok: false, error: 'Mã PIN phải từ 4 đến 8 chữ số' };
    }
    if (!KeyStore.getState().encryptionKey) {
        return { ok: false, error: 'Kho chưa được mở — không thể cài đặt mã PIN' };
    }

    try {
        if (!(await verifyMasterPassword(masterPassword))) {
            return { ok: false, error: 'Mật khẩu chủ không đúng' };
        }
        const userId = await currentUserId();
        if (!userId) return { ok: false, error: 'Phiên đăng nhập đã hết' };

        const salt = crypto.getRandomValues(new Uint8Array(16));
        const { proof, local } = await pinMaterial(pin, salt);
        const res = await authApi.pinSetup(proof);
        if (!res.ok || !res.data) {
            local.fill(0);
            return { ok: false, error: res.error ?? 'Server không lưu được PIN' };
        }

        const share = base64ToBytes(res.data.share);
        const wrapKey = await deriveKey(concat(local, share), 'bepnha-pin-wrap-v2');
        local.fill(0);
        share.fill(0);

        const key = snapshotKey();
        if (!key) return { ok: false, error: 'Kho vừa tự khóa — mở lại rồi thử lại' };
        const blob = await seal(key, wrapKey, PIN_AAD);
        key.fill(0);
        wrapKey.fill(0);

        const config: StoredPinConfig = { v: 2, userId, salt: bytesToBase64(salt), blob };
        localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(config));
        return { ok: true };
    } catch (err) {
        return { ok: false, error: 'Lỗi thiết lập mã PIN: ' + String(err) };
    }
}

export async function unlockWithPin(pin: string): Promise<Result & { remainingFails?: number }> {
    const config = readConfig<StoredPinConfig>(PIN_STORAGE_KEY);
    if (!config) return { ok: false, error: 'Chưa cấu hình mã PIN' };

    try {
        const userId = await currentUserId();
        if (config.userId !== userId) {
            clearPinConfig();
            return { ok: false, error: 'PIN trên máy này thuộc tài khoản khác — đã xóa', remainingFails: 0 };
        }

        const { proof, local } = await pinMaterial(pin, base64ToBytes(config.salt));
        // Server đếm số lần sai: chép localStorage đi nơi khác cũng không thử PIN offline được
        const res = await authApi.pinUnlock(proof);
        if (!res.ok || !res.data) {
            local.fill(0);
            const remaining = (res.errorBody as { remaining?: unknown } | null)?.remaining;
            if (remaining === 0) clearPinConfig();
            return {
                ok: false,
                error: res.error ?? 'Mã PIN không đúng.',
                remainingFails: typeof remaining === 'number' ? remaining : undefined,
            };
        }

        const share = base64ToBytes(res.data.share);
        const wrapKey = await deriveKey(concat(local, share), 'bepnha-pin-wrap-v2');
        local.fill(0);
        share.fill(0);
        const restoredKey = await open(config.blob, wrapKey, PIN_AAD);
        wrapKey.fill(0);

        if (!(await finishUnlock(restoredKey))) {
            clearPinConfig();
            return { ok: false, error: 'Khóa không khớp — vui lòng dùng mật khẩu chủ', remainingFails: 0 };
        }
        return { ok: true };
    } catch {
        return { ok: false, error: 'Không mở được bằng PIN — vui lòng dùng mật khẩu chủ' };
    }
}

/* ==================== 2. SINH TRẮC HỌC (WEBAUTHN PRF) ==================== */

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
    return !!readConfig<StoredBioConfig>(BIO_STORAGE_KEY);
}

export function clearBiometricsConfig(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(BIO_STORAGE_KEY);
}

const prfOf = (cred: PublicKeyCredential): PrfResults | undefined =>
    (cred.getClientExtensionResults() as { prf?: PrfResults }).prf;

const prfExtension = (prfSalt: Uint8Array) =>
    ({ prf: { eval: { first: prfSalt } } }) as unknown as AuthenticationExtensionsClientInputs;

// Quét mặt/vân tay và lấy PRF output (32 byte). null nếu bị hủy hoặc không hỗ trợ PRF.
async function prfAssert(credentialId: Uint8Array, prfSalt: Uint8Array): Promise<Uint8Array | null> {
    const assertion = (await navigator.credentials.get({
        publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            allowCredentials: [{ type: 'public-key', id: credentialId as BufferSource }],
            userVerification: 'required',
            timeout: 60000,
            extensions: prfExtension(prfSalt),
        },
    })) as PublicKeyCredential | null;
    const first = assertion ? prfOf(assertion)?.results?.first : undefined;
    return first ? new Uint8Array(first) : null;
}

export async function setupBiometricsUnlock(masterPassword: string): Promise<Result> {
    if (!KeyStore.getState().encryptionKey) {
        return { ok: false, error: 'Kho chưa được mở — không thể kích hoạt sinh trắc học' };
    }
    if (!(await isBiometricsAvailable())) {
        return { ok: false, error: 'Thiết bị này không hỗ trợ cảm biến sinh trắc học (Touch ID / Face ID / Windows Hello)' };
    }

    try {
        if (!(await verifyMasterPassword(masterPassword))) {
            return { ok: false, error: 'Mật khẩu chủ không đúng' };
        }
        const userId = await currentUserId();
        if (!userId) return { ok: false, error: 'Phiên đăng nhập đã hết' };

        const prfSalt = crypto.getRandomValues(new Uint8Array(32));
        const cred = (await navigator.credentials.create({
            publicKey: {
                challenge: crypto.getRandomValues(new Uint8Array(32)),
                // Giữ ngụy trang: tên hiện trong trình quản lý passkey của hệ điều hành
                rp: { name: 'Bếp Nhà' },
                user: {
                    id: crypto.getRandomValues(new Uint8Array(16)),
                    name: 'bep-nha',
                    displayName: 'Bếp Nhà',
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
                extensions: prfExtension(prfSalt),
            },
        })) as PublicKeyCredential | null;
        if (!cred) return { ok: false, error: 'Xác thực sinh trắc học bị hủy' };

        const credentialId = new Uint8Array(cred.rawId);
        const created = prfOf(cred);
        if (!created?.enabled && !created?.results?.first) {
            return {
                ok: false,
                error: 'Trình duyệt / thiết bị này chưa hỗ trợ WebAuthn PRF nên không bật được (để không phải lưu khóa trên máy).',
            };
        }

        // Một số nền tảng trả PRF ngay lúc tạo, số khác phải quét thêm 1 lần
        const prfOut = created.results?.first
            ? new Uint8Array(created.results.first)
            : await prfAssert(credentialId, prfSalt);
        if (!prfOut) return { ok: false, error: 'Không lấy được bí mật PRF từ cảm biến' };

        const wrapKey = await deriveKey(prfOut, 'bepnha-bio-wrap-v2');
        prfOut.fill(0);
        const key = snapshotKey();
        if (!key) return { ok: false, error: 'Kho vừa tự khóa — mở lại rồi thử lại' };
        const blob = await seal(key, wrapKey, BIO_AAD);
        key.fill(0);
        wrapKey.fill(0);

        const config: StoredBioConfig = {
            v: 2,
            userId,
            credentialId: bytesToBase64(credentialId),
            prfSalt: bytesToBase64(prfSalt),
            blob,
        };
        localStorage.setItem(BIO_STORAGE_KEY, JSON.stringify(config));
        return { ok: true };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: 'Không thể kích hoạt sinh trắc học: ' + msg };
    }
}

export async function unlockWithBiometrics(): Promise<Result> {
    const config = readConfig<StoredBioConfig>(BIO_STORAGE_KEY);
    if (!config) return { ok: false, error: 'Chưa cài đặt sinh trắc học trên thiết bị này' };

    try {
        const userId = await currentUserId();
        if (config.userId !== userId) {
            clearBiometricsConfig();
            return { ok: false, error: 'Sinh trắc học trên máy này thuộc tài khoản khác — đã xóa' };
        }

        const prfOut = await prfAssert(base64ToBytes(config.credentialId), base64ToBytes(config.prfSalt));
        if (!prfOut) return { ok: false, error: 'Xác thực sinh trắc học bị hủy hoặc không hỗ trợ' };

        const wrapKey = await deriveKey(prfOut, 'bepnha-bio-wrap-v2');
        prfOut.fill(0);
        const restoredKey = await open(config.blob, wrapKey, BIO_AAD);
        wrapKey.fill(0);

        if (!(await finishUnlock(restoredKey))) {
            clearBiometricsConfig();
            return { ok: false, error: 'Khóa không khớp — vui lòng dùng mật khẩu chủ' };
        }
        return { ok: true };
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: 'Xác thực sinh trắc học thất bại: ' + msg };
    }
}
