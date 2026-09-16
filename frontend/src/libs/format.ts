export function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
}

const EVENT_LABELS: Record<string, string> = {
    account_created: 'Tạo tài khoản', login_success: 'Đăng nhập', login_failed: 'Đăng nhập thất bại',
    logout: 'Đăng xuất', credential_created: 'Thêm mục', credential_updated: 'Sửa mục',
    credential_deleted: 'Xóa mục', real_gate_unlocked: 'Mở cổng thật', fake_gate_unlocked: 'Mở cổng giả',
    '2fa_enabled': 'Bật 2FA', '2fa_disabled': 'Tắt 2FA', stepup_failed: 'Step-up thất bại',
    url_reputation_checked: 'Tra danh tiếng URL',
};
export const eventLabel = (e: string) => EVENT_LABELS[e] ?? e;
export const formatIp = (ip?: string | null) => (ip ? ip.replace(/^::ffff:/, '') : '—');
export const parseDevice = (ua?: string | null) =>
    !ua ? '—' : /Edg/.test(ua) ? 'Edge' : /Chrome/.test(ua) ? 'Chrome'
        : /Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'Khác';
export const contextLabel = (ctx?: Record<string, unknown> | null) =>
    !ctx || Object.keys(ctx).length === 0 ? '—' : Object.entries(ctx).map(([k, v]) => `${k}: ${String(v)}`).join(', ');