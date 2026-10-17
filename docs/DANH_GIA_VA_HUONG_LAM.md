# Recipe_Security — Đánh giá & Hướng làm (báo cáo môn Bảo mật hệ thống)

> Dự án **Recipe_Security** là bản port của **recipe-vault** (một password manager zero-knowledge
> ngụy trang thành app công thức nấu ăn) sang **công nghệ mới**:
> - Backend: Express + Prisma → **NestJS + TypeORM + PostgreSQL (Neon)**
> - Frontend: React (Vite) + React Router + SWR → **Next.js 16 (App Router, RSC) + TanStack Query + React Hook Form + Zod + Tailwind v4**
>
> Trạng thái: backend & frontend **biên dịch sạch** (`tsc --noEmit` không lỗi). Feature-parity ~95%.

---

## 1. Kiến trúc tổng thể

```
Trình duyệt ──(same-origin /api/*)──► Next.js (rewrite proxy / BFF) ──► NestJS :3000 ──► Neon (Postgres)
   │  crypto + khóa giải mã (RAM)                 │ (chỉ chuyển tiếp, KHÔNG thấy khóa)
   │  TanStack Query cache                        │
```

- **Zero-knowledge:** mọi mã hóa chạy ở **trình duyệt** (Web Crypto). Server chỉ lưu ciphertext + tham số công khai. Khóa giải mã **chưa bao giờ** tồn tại trên server.
- **BFF proxy (Next rewrites):** trình duyệt gọi `/api/*` cùng origin → Next chuyển sang NestJS → hết CORS, cookie phiên **first-party**.
- **RSC-first:** phần công khai/metadata (cover món ăn, admin dashboard, fake vault) là **Server Component**; phần đụng khóa/tương tác (vault, form, unlock) là **Client Component**.

### Luồng dữ liệu khóa (zero-knowledge)
```
ĐĂNG KÝ (browser): kdfSalt = ngẫu nhiên (crypto.getRandomValues)
  password + kdfSalt ──PBKDF2(600k)──► masterKey ─┬─PBKDF2(1 vòng, salt=password)─► authHash  → GỬI server (bcrypt lần nữa)
                                                   └─HKDF──► encryptionKey (AES-256-GCM, Ở LẠI RAM)
  verifier = AES-GCM("chuỗi cố định", encryptionKey) → gửi để sau kiểm "đúng mật khẩu"
ĐĂNG NHẬP: GET /auth/kdf-params?email → lấy lại kdfSalt → dẫn xuất lại masterKey/authHash → POST /auth/login
MỞ KHÓA KHO: GET /auth/keys → {verifier,kdfSalt,kdfIterations} → nhập master password → checkVerifier → mở
```

---

## 2. Lịch sử đã làm (tóm tắt theo giai đoạn)

### Backend (NestJS + TypeORM + Neon)
| GĐ | Nội dung |
|----|----------|
| 1 | Kết nối DB: `ConfigModule` + `TypeOrmModule.forRootAsync` + `data-source.ts` (CLI) + SSL Neon. **Không `synchronize`, dùng migrations.** |
| 2 | Entities UUID: `User`, `Credential`, `SecurityLog` (quan hệ `@ManyToOne` CASCADE/SET NULL, cột `jsonb`). |
| 3 | Migration đầu tiên (`CREATE EXTENSION uuid-ossp` + 3 bảng) → `migration:run`. |
| 4 | Auth session: `express-session`, `bcryptjs`, `class-validator`. register/login/logout/me/profile + `SessionAuthGuard`. Chống session fixation (`regenerate`). |
| 5 | Module credential (CRUD, IDOR-safe scope userId), `VaultGuard` (login + vaultGate + autoLock 440), `StepUpGuard` (xóa cần mã 2FA). |
| 6.1–6.3 | Security log: `record()` → **HMAC chain** (`prevHash`/`hash`, khóa `AUDIT_LOG_KEY` ngoài DB) + `verifyChain`; module admin (dashboard/integrity/ciphertext) + `AdminGuard` (RBAC). |
| Recipe | Cổng ngụy trang: `POST /recipe/search` (mã thật bcrypt / mã giả timing-safe / recipe giả), `GET /recipe/fake`. |
| 2FA | TOTP (otplib v13 API hàm: `generateSecret/generateURI/generate/verify`), setup/enable/verify/status/disable, backup codes (bcrypt), secret mã hóa AES-256-GCM at rest. |
| urlrep | `POST /url/reputation` (Google Safe Browsing + VirusTotal), cache 6h, timeout 5s, **trích domain từ URL** (chống lệch), không SSRF. |
| Hardening | Rate-limit (`@nestjs/throttler`), Helmet, CORS, session store **connect-pg-simple (Neon)**, health `/api/health`, global prefix `/api`. |

### Frontend (Next.js)
| Bước | Nội dung |
|------|----------|
| Nền | Proxy rewrites + `Providers` (QueryClient SSR-safe) + `lib/api.ts` (axios, interceptor 440→lock) + `types.ts` (id → UUID string). |
| Crypto | Port `libs/crypto/*` (kdf/aead/vault/encoding) + `KeyStore` (zustand, khóa chỉ ở RAM). |
| Auth 3a | `auth.api` + `useSession` (TanStack) + mutations login/register/logout/verify2fa + **middleware** chặn `/vault` `/admin` ở server. |
| Auth 3b | Cover (Server Component + island `RecipeSearch`), Login/Register (server shell + client form), vault stub, fake stub. `(app)/` route group + `error.tsx` + `loading.tsx`. |
| 4 | Vault thật: server-fetch ciphertext → `VaultClient` (unlock + giải mã + CRUD). `UnlockScreen`, `CredentialForm`, `DeleteConfirm`. |
| RHF+Zod | Refactor LoginForm/RegisterForm/CredentialForm sang React Hook Form + Zod. |
| 5 (A1) | Admin RSC (server fetch `/admin` + `/admin/log-integrity`, render bảng; `RefreshButton` client `router.refresh()`). |
| A2 | Fake vault (Server Component, redirect nếu chưa mở cổng giả). |
| B3 | TwoFactorSettings UI (QR + enable/disable + backup codes). |
| B4 | Password generator (CSPRNG, chống modulo-bias) + độ mạnh (`assessStrength`). |
| B5 | Breach check HIBP (k-anonymity) + reuse detection (vân tay SHA-256) + badge card. |
| B6 | URL safety cục bộ (homograph/nhái brand/DGA, không gửi đi) + "kiểm tra sâu" (urlrep). |
| B7 | Vault Health (điểm sức khỏe + quét rò rỉ cả kho, ghi breachCount ngược vào ciphertext). |
| B8 | Clipboard tự xóa + auto-lock timer client. |
| Fix | Tách `VaultClient`/`VaultContent` → bỏ `setState` đồng bộ trong effect (unmount wipe plaintext). Sửa bug GENESIS (env → hằng `'GENESIS'`). |

---

## 3. Feature-parity so với recipe-vault

### Đã đủ ✅
Auth session + 2FA/TOTP · Credential CRUD zero-knowledge + step-up · Cổng ngụy trang (real/fake) + kho mồi · Log HMAC chống giả mạo + admin (dashboard/integrity) + RBAC · urlrep + URL safety · Breach HIBP + reuse + độ mạnh + generator + vault health · Clipboard auto-clear + auto-lock · Rate-limit + session fixation + Helmet + session store DB.

### Còn thiếu ❌
| Thiếu | Ở đâu | Mức |
|---|---|---|
| **Phát hiện thiết bị lạ** (`isNewDevice` + `newDeviceAlert`) | BE + FE | Nghiệp vụ |
| `POST /auth/alert/dismiss` | BE + FE | Nghiệp vụ |
| Ghi log `login_failed` | BE (login sai ném lỗi trước khi ghi) | → admin hiện 0 |
| Ghi log `suspicious_search_burst` | BE (throttler không ghi) | → admin hiện 0 |
| Tab đổi danh mục ở cover | FE | Mỹ quan |
| File scaffold chết (dto/entity `recipe`,`security-log`,`credential/update`) | BE | Dọn dẹp |

---

## 4. Đánh giá bảo mật

### 4.1 Điểm mạnh (nên trình bày kỹ — phần "được điểm")
- **Zero-knowledge đúng chuẩn Bitwarden:** PBKDF2 600k → masterKey → tách authHash/encryptionKey không suy ngược nhau; vault AES-256-GCM; verifier. Server bcrypt(authHash). → **Server + admin không đọc được nội dung** (chứng minh qua trang admin ciphertext).
- **Audit log chống giả mạo (tamper-evident):** HMAC-SHA256 móc xích, khóa `AUDIT_LOG_KEY` **ngoài DB** → kẻ chiếm DB không vá lại được hash; `verifyChain` phát hiện sửa/xóa/chèn.
- **2FA/TOTP:** secret mã hóa AES-256-GCM at rest, backup codes bcrypt; **step-up** (nhập mã 2FA tươi) cho thao tác không hồi lại được (xóa).
- **Plausible deniability:** kho thật / kho mồi (mã thật vs mã giả) — phòng thủ khi bị ép.
- **Chống dò email:** `/auth/kdf-params` trả salt giả tất định (HMAC) cho email chưa đăng ký.
- **IDOR-safe:** mọi truy vấn credential scope theo `userId` + `findOwned`.
- **Phòng thủ khác:** rate-limit; chống session fixation (`regenerate`); cookie `httpOnly` + `sameSite=lax`; session store ở DB; Helmet; BFF proxy (cookie first-party); auto-lock (server 440 + client timer); clipboard tự xóa; HIBP **k-anonymity** (chỉ gửi 5 ký tự SHA-1); urlrep **không SSRF** (trích domain ở server).

### 4.2 Điểm yếu / nâng cấp được (phần "chưa an toàn → nâng cấp")
| # | Vấn đề | Mức | Hướng nâng cấp |
|---|---|---|---|
| 1 | **Chưa có CSP (Content-Security-Policy)** ở frontend | 🔴 Cao | Password manager: **XSS = đánh cắp khóa trong RAM = mất sạch.** CSP strict là lá chắn quan trọng nhất. |
| 2 | **`rejectUnauthorized: false`** (TLS tới Neon, ở `data-source.ts`, `app.module`, `main.ts` pool) | 🔴 Cao | Tắt kiểm chứng chứng chỉ → MITM kết nối DB. Dùng **CA của Neon** thay vì tắt. |
| 3 | **CSRF** chỉ dựa `sameSite=lax` | 🟠 TB | BFF same-origin đã giảm rủi ro; thêm **CSRF token** (double-submit) là defense-in-depth. |
| 4 | KDF **PBKDF2** | 🟠 TB | **Argon2id** (memory-hard, chống GPU). Giới hạn: cần WASM ở browser — nêu như hướng tương lai. |
| 5 | Audit chưa đủ (new-device, login_failed, search_burst) | 🟠 TB | Làm nốt → admin có số thật + cảnh báo chiếm tài khoản. |
| 6 | Rate-limit **in-memory** | 🟡 Thấp | Nhiều instance thì bypass → store Redis. |
| 7 | Cookie `secure` chỉ bật ở production | 🟡 Thấp | Bắt buộc HTTPS khi deploy. |
| 8 | Ordering chuỗi log theo `createdAt` (vì dùng UUID) | 🟡 Thấp | Chắc hơn: thêm cột `seq` bigint tự tăng để móc xích. |

---

## 5. Hướng làm chi tiết (ưu tiên cho báo cáo)

### Ưu tiên A — Chốt feature-parity 100%

#### A1. Phát hiện thiết bị lạ (BE)
1. `AuthService`: thêm `isNewDevice(userId, ip, userAgent)` — tìm trong `security_logs` có bản ghi `login_success` nào cùng (ip, userAgent) chưa; chưa từng + đã từng login thành công = thiết bị lạ.
2. `AuthController.login`/`verify2fa`: sau khi `establishSession`, nếu `isNewDevice` → đặt `session.newDeviceAlert = { at, ip, userAgent }` + `record('new_device_login', ...)`.
3. `me`: trả `newDeviceAlert` thật (đang trả `null`).
4. Thêm `POST /auth/alert/dismiss` → `session.newDeviceAlert = undefined`.
- **FE:** trong `(app)/layout.tsx` hoặc VaultContent đọc `session.newDeviceAlert` → banner cảnh báo + nút "Đã hiểu" gọi dismiss.

#### A2. Ghi `login_failed` (BE)
- Trong `AuthController.login`: bắt nhánh sai mật khẩu → `record('login_failed', { ip, userAgent })` **trước khi** ném `UnauthorizedException` (hoặc chuyển kiểm tra vào controller để log được). → admin hiển thị "Login thất bại" đúng.

#### A3. Ghi `suspicious_search_burst` (tùy chọn)
- Viết `ThrottlerGuard` tùy biến cho route `/recipe/search` → khi vượt ngưỡng, `record('suspicious_search_burst', ...)`.

### Ưu tiên B — Nâng cấp bảo mật (điểm nhấn báo cáo)

#### B1. 🔴 CSP cho frontend (chống XSS)
Thêm `headers()` trong `frontend/next.config.ts`:
```ts
async headers() {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",                 // không 'unsafe-inline' cho script
    "style-src 'self' 'unsafe-inline'",  // Tailwind cần inline style
    "img-src 'self' data:",              // QR 2FA là data URL
    "connect-src 'self' https://api.pwnedpasswords.com", // HIBP gọi thẳng
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  return [{ source: '/:path*', headers: [{ key: 'Content-Security-Policy', value: csp }] }];
}
```
> Lưu ý: Next dev/HMR có thể cần nới `script-src`; nên siết chặt ở bản production. Nêu rõ trade-off trong báo cáo.

#### B2. 🔴 TLS cert đúng (bỏ `rejectUnauthorized:false`)
- Tải CA của Neon, truyền `ssl: { ca: fs.readFileSync(...), rejectUnauthorized: true }` ở `data-source.ts`, `app.module` (TypeORM) và pool session trong `main.ts`.
- Nếu môi trường học không tiện: **nêu rõ đây là giới hạn** và cách khắc phục ở production.

#### B3. 🟠 CSRF token (defense-in-depth)
- Phát một token (ví dụ `csurf` thay thế hoặc tự làm double-submit cookie): server đặt cookie `XSRF-TOKEN`, client gửi lại ở header `X-XSRF-TOKEN` cho mọi POST/PUT/DELETE; server đối chiếu.

#### B4. 🟠 Argon2id (hướng tương lai)
- Thay PBKDF2 ở browser bằng Argon2id (thư viện WASM như `argon2-browser` / `hash-wasm`). Lưu `kdfType`/params để tương thích ngược. Nêu như "nâng cấp tương lai" (không bắt buộc).

### Ưu tiên C — Hoàn thiện & dọn dẹp
1. Xóa file scaffold chết (BE): `recipe/dto/*`, `recipe/entities/recipe.entity.ts`, `security-log/dto/*`, `credential/dto/update-credential.dto.ts`; dọn import thừa.
2. `pnpm format` (BE+FE) để hết cảnh báo Prettier; cân nhắc `endOfLine: auto` trên Windows.
3. Tab đổi danh mục ở cover (FE, nhỏ) — nếu muốn giống hệt recipe-vault.
4. Chạy `pnpm build` cả BE + FE → chụp bằng chứng build sạch cho báo cáo.
5. (Nếu còn thời gian) viết vài test Jest cho luồng auth/credential.

---

## 6. Checklist cho báo cáo

**Chức năng (câu 1 — "đủ recipe-vault chưa"):**
- [ ] A1 new-device detection (BE+FE)
- [ ] A2 login_failed logging
- [ ] (A3 search_burst — tùy chọn)
- [ ] Tab danh mục cover (mỹ quan)

**An toàn (câu 2 — "an toàn chưa / nâng cấp"):**
- [ ] B1 CSP frontend (🔴 quan trọng nhất)
- [ ] B2 TLS cert tới Neon (🔴)
- [ ] B3 CSRF token (🟠)
- [ ] (B4 Argon2id — nêu là hướng tương lai)

**Hoàn thiện:**
- [ ] C1 dọn scaffold chết
- [ ] C2 `pnpm format`
- [ ] C4 build sạch BE+FE (chụp màn hình)

---

## 7. Kết luận

- **Đủ chức năng?** Gần đủ (~95%). Làm **Ưu tiên A** là đạt 100% so với recipe-vault.
- **An toàn?** Nền tảng bảo mật **tốt, nhiều lớp phòng thủ đúng chuẩn** (zero-knowledge, tamper-evident log, 2FA, step-up, plausible deniability...). Hai điểm yếu **đáng nâng cấp nhất**: **CSP (chống XSS)** và **TLS cert tới DB**; phần còn lại trình bày như "hướng nâng cấp / defense-in-depth".
- Điểm độc đáo để nhấn trong báo cáo: **chứng minh zero-knowledge** (trang admin ciphertext) và **chứng minh chống giả mạo log** (sửa 1 dòng DB → verifyChain bắt được).
