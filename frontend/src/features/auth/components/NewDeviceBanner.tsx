'use client';

import { useSession } from '@/features/auth/hooks/use-session';
import { useDismissAlert } from '@/features/auth/hooks/use-auth';

export function NewDeviceBanner() {
    const { session } = useSession();
    const dismiss = useDismissAlert();
    const alert = session?.newDeviceAlert;
    if (!alert) return null;

    const ua = alert.userAgent ?? '';
    const device = /Edg/.test(ua) ? 'Edge' : /Chrome/.test(ua) ? 'Chrome'
        : /Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'trình duyệt lạ';
    const ip = (alert.ip ?? '—').replace(/^::ffff:/, '');

    return (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <div>
                <strong className="text-red-700">Phát hiện đăng nhập từ thiết bị lạ</strong>
                <p className="text-sm text-stone-600">
                    Lúc {new Date(alert.at).toLocaleString('vi-VN')} · IP {ip} · {device}. Nếu không phải bạn, hãy đổi mật khẩu ngay.
                </p>
            </div>
            <button onClick={() => dismiss.mutate()} disabled={dismiss.isPending}
                className="shrink-0 rounded-lg border border-stone-300 px-3 py-1.5 text-sm">
                Đã hiểu
            </button>
        </div>
    );
}