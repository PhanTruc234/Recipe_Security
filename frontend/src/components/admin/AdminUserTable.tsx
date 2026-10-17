import type { AdminUser } from '@/types';

export function AdminUserTable({ users }: { users: AdminUser[] }) {
    return (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 text-stone-500">
                    <tr><th className="p-3">Tên</th><th className="p-3">Email</th><th className="p-3">Vai trò</th><th className="p-3">Số mục</th></tr>
                </thead>
                <tbody>
                    {users.map((u) => (
                        <tr key={u.id} className="border-t border-stone-100">
                            <td className="p-3">{u.name}</td>
                            <td className="p-3">{u.email}</td>
                            <td className="p-3"><span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{u.role}</span></td>
                            <td className="p-3">{u._count.credentials}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}