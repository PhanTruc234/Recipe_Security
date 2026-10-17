'use client';

import { useMemo, useState } from 'react';
import { assessUrl, type Level } from '@/libs/url-safety';
import { useUrlReputation } from '@/features/urlrep/use-urlrep';
import type { UrlReputation, RepLevel } from '@/features/urlrep/urlrep.api';

const LEVEL_BOX: Record<Level, string> = {
    safe: 'bg-green-50 text-green-700', warn: 'bg-amber-50 text-amber-700', danger: 'bg-red-50 text-red-700',
};
const LEVEL_LABEL: Record<Level, string> = {
    safe: 'Cấu trúc bình thường',
    warn: 'Tên miền nghi ngờ', danger: 'CẢNH BÁO: tên miền nguy hiểm',
};
const REP_LABEL: Record<RepLevel, string> = {
    clean: 'Sạch — không dịch vụ nào báo xấu', warn: 'Có dấu hiệu nghi ngờ',
    danger: 'BỊ BÁO LÀ ĐỘC HẠI', unknown: 'Chưa có dữ liệu danh tiếng',
};
const repBox = (l: RepLevel) =>
    l === 'danger' ? 'bg-red-50 text-red-700' : l === 'warn' ? 'bg-amber-50 text-amber-700'
        : l === 'clean' ? 'bg-green-50 text-green-700' : 'bg-stone-100';

export function UrlSafetyField({ url, boundDomain }: { url: string; boundDomain: string | null }) {
    const [rep, setRep] = useState<UrlReputation | null>(null);
    const [checkedUrl, setCheckedUrl] = useState('');
    const [error, setError] = useState('');
    const deepCheck = useUrlReputation();

    const trimmed = url.trim();
    const verdict = useMemo(() => (trimmed ? assessUrl(trimmed, boundDomain) : null), [trimmed, boundDomain]);
    const repValid = rep && trimmed === checkedUrl;

    async function onDeepCheck() {
        const domain = verdict?.registrableDomain;
        if (!domain) return;
        setError('');
        const fullUrl = /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
        const res = await deepCheck.mutateAsync({ url: fullUrl, domain });
        if (res.ok && res.data) { setRep(res.data); setCheckedUrl(trimmed); }
        else setError('Không tra được danh tiếng URL.');
    }

    if (!verdict) return null;

    return (
        <div className="mt-1 space-y-1 text-xs">
            <div className={`rounded-lg px-2 py-1 ${LEVEL_BOX[verdict.level]}`}>
                <strong>{LEVEL_LABEL[verdict.level]}{verdict.matchedBrand ? ` — coi chừng nhái "${verdict.matchedBrand}"` : ''}</strong>
                {verdict.reasons.length > 0 && <ul className="mt-0.5 list-disc pl-4">{verdict.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>}
                {verdict.level === 'safe' && verdict.registrableDomain && <div>Tên miền: {verdict.registrableDomain}</div>}
            </div>

            {verdict.registrableDomain && (
                <button type="button" onClick={onDeepCheck} disabled={deepCheck.isPending} className="text-amber-700 disabled:opacity-50">
                    {deepCheck.isPending ? 'Đang tra...' : 'Kiểm tra sâu'}
                </button>
            )}
            {error && <p className="text-red-600">{error}</p>}

            {repValid && rep && !rep.configured && (
                <div className="rounded-lg bg-stone-100 px-2 py-1">{rep.message || 'Server chưa bật kiểm tra sâu.'}</div>
            )}
            {repValid && rep && rep.configured && rep.level && (
                <div className={`rounded-lg px-2 py-1 ${repBox(rep.level)}`}>
                    <strong>{REP_LABEL[rep.level]}</strong>
                    <ul className="mt-0.5 list-disc pl-4">
                        {rep.safeBrowsing?.configured && <li>{rep.safeBrowsing.detail}</li>}
                        {rep.virusTotal?.configured && <li>{rep.virusTotal.detail}</li>}
                    </ul>
                </div>
            )}
        </div>
    );
}