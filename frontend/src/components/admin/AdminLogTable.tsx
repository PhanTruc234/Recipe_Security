import type { LogEntry } from '@/types';
import { eventLabel, formatIp, parseDevice, contextLabel, formatDate } from '@/libs/format';

export function AdminLogTable({ logs }: { logs: LogEntry[] }) {
    return (
        <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
            <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 text-stone-500">
                    <tr><th className="p-3">Sự kiện</th><th className="p-3">User</th><th className="p-3">Thiết bị</th><th className="p-3">IP</th><th className="p-3">Chi tiết</th><th className="p-3">Thời gian</th></tr>
                </thead>
                <tbody>
                    {logs.map((log) => (
                        <tr key={log.id} className="border-t border-stone-100">
                            <td className="p-3">{eventLabel(log.event)}</td>
                            <td className="p-3">{log.user?.email ?? 'Khách'}</td>
                            <td className="p-3">{parseDevice(log.userAgent)}</td>
                            <td className="p-3">{formatIp(log.ipAddress)}</td>
                            <td className="p-3 text-stone-500">{contextLabel(log.context)}</td>
                            <td className="p-3 text-stone-500">{formatDate(log.createdAt)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}