
import { AdminUserTable } from '@/components/admin/AdminUserTable';
import { RefreshButton } from '@/components/admin/RefreshButton';
import type { AdminData, IntegrityResult } from '@/types';
import { AdminLogTable } from '@/components/admin/AdminLogTable';
import { serverFetch } from '@/libs/server-api';
import { eventLabel } from '@/libs/format';

export default async function AdminPage() {
    const [data, integrity] = await Promise.all([
        serverFetch<AdminData>('/admin'),
        serverFetch<IntegrityResult>('/admin/log-integrity'),
    ]);

    if (!data) return <p className="text-stone-500">Không tải được bảng quản trị (cần quyền admin).</p>;
    const { stats, users, events, logs } = data;

    return (
        <div className="space-y-6">
            <header>
                <p className="text-xs uppercase tracking-widest text-amber-600">Giám sát hệ thống</p>
                <h1 className="text-2xl font-bold">Quản trị bảo mật</h1>
            </header>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {([['User', stats.users], ['Admin', stats.admins], ['Mục kho', stats.credentials],
                ['Login thất bại', stats.loginFailures], ['Nghi vấn dò mã', stats.searchBursts]] as const).map(([label, n]) => (
                    <div key={label} className="rounded-xl bg-white p-4 shadow-sm">
                        <div className="text-xs text-stone-500">{label}</div>
                        <div className="text-2xl font-bold">{n}</div>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <h2 className="mb-2 font-semibold">{users.length} tài khoản gần nhất</h2>
                    <AdminUserTable users={users} />
                </div>
                <div>
                    <h2 className="mb-2 font-semibold">Thống kê sự kiện</h2>
                    <div className="rounded-xl bg-white p-4 text-sm shadow-sm">
                        {events.map((e: any) => (
                            <div key={e.event} className="flex justify-between border-b border-stone-100 py-1 last:border-0">
                                <span>{eventLabel(e.event)}</span><span className="text-stone-400">{e.total}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <section className="rounded-xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold">Toàn vẹn nhật ký</h2>
                    <RefreshButton />
                </div>
                {integrity && (
                    <div className={`mt-3 rounded-lg p-3 text-sm ${integrity.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {integrity.ok
                            ? <p>Toàn vẹn — {integrity.total} bản ghi, chuỗi hash nguyên vẹn.</p>
                            : <><p>PHÁT HIỆN CAN THIỆP! {integrity.total} bản ghi, {integrity.issues.length} vấn đề:</p>
                                <ul className="mt-1 list-disc pl-5">{integrity.issues.map((i: any, k: any) => <li key={k}>{i.message}</li>)}</ul></>}
                    </div>
                )}
            </section>

            <section>
                <h2 className="mb-2 font-semibold">Nhật ký bảo mật gần nhất</h2>
                <AdminLogTable logs={logs} />
            </section>
        </div>
    );
}