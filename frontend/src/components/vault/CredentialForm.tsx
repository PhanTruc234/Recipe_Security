'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMemo, useState } from 'react';
import { emptyCredential, type CredentialData } from '@/libs/crypto/vault';
import { assessStrength } from '@/libs/crypto/passwordGen';
import { checkPassword, breachLabel } from '@/libs/crypto/breachCheck';
import { PasswordGenerator } from './PasswordGenerator';
import { registrableDomainOf } from '@/libs/url-safety';
import { UrlSafetyField } from './UrlSafetyField';

const credentialSchema = z.object({
    service: z.string().min(1, 'Cần tên dịch vụ').max(80),
    url: z.string().max(200),
    username: z.string().max(120),
    password: z.string().min(1, 'Cần mật khẩu').max(256),
    note: z.string().max(1000),
    requireRevealAuth: z.enum(['none', 'quick', 'pin', 'bio']),
});
type CredentialValues = z.infer<typeof credentialSchema>;

const STRENGTH_COLOR: Record<string, string> = {
    yeu: 'text-red-600', trungbinh: 'text-amber-600', manh: 'text-green-600', ratmanh: 'text-green-700',
};

export function CredentialForm({ initial, busy, onSave, onCancel }: {
    initial?: CredentialData; busy: boolean;
    onSave: (d: CredentialData) => Promise<boolean>; onCancel: () => void;
}) {
    const [showPw, setShowPw] = useState(false);
    const [showGen, setShowGen] = useState(false);
    const base = initial ?? emptyCredential();

    const [breach, setBreach] = useState<number | null>(base.breachCount ?? null);
    const [checkedAt, setCheckedAt] = useState<string | null>(base.checkedAt ?? null);
    const [checkedPw, setCheckedPw] = useState<string>(base.password);
    const [checking, setChecking] = useState(false);
    const [breachError, setBreachError] = useState('');

    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CredentialValues>({
        resolver: zodResolver(credentialSchema),
        defaultValues: {
            service: base.service,
            url: base.url,
            username: base.username,
            password: base.password,
            note: base.note,
            requireRevealAuth: base.requireRevealAuth ?? 'none',
        },
    });

    const password = watch('password');

    const url = watch('url');
    const boundDomain = useMemo(() => (initial ? registrableDomainOf(initial.url) : null), [initial]);
    const strength = password ? assessStrength(password) : null;
    const breachValid = breach !== null && password === checkedPw;
    async function onCheckBreach() {
        if (!password) return;
        setChecking(true); setBreachError('');
        try {
            const r = await checkPassword(password);
            setBreach(r.count); setCheckedAt(r.checkedAt); setCheckedPw(password);
        } catch {
            setBreachError('Không gọi được dịch vụ kiểm tra rò rỉ (kiểm tra mạng).');
        } finally {
            setChecking(false);
        }
    }

    const onSubmit = handleSubmit(async (values: CredentialValues) => {
        const valid = breach !== null && values.password === checkedPw;
        await onSave({
            service: values.service,
            url: values.url,
            username: values.username,
            password: values.password,
            note: values.note,
            requireRevealAuth: values.requireRevealAuth,
            breachCount: valid ? breach : null,
            checkedAt: valid ? checkedAt : null,
        });
    });

    const input = 'w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500';
    const err = 'mt-1 text-xs text-red-600';

    return (
        <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-amber-100 bg-amber-50/50 p-4">
            <div>
                <label className="text-sm">Tên dịch vụ *</label>
                <input className={input} {...register('service')} />
                {errors.service && <p className={err}>{errors.service.message}</p>}
            </div>
            <div>
                <label className="text-sm">Địa chỉ web</label>
                <input className={input} placeholder="vd: facebook.com" {...register('url')} />
                <UrlSafetyField url={url} boundDomain={boundDomain} />
            </div>
            <div>
                <label className="text-sm">Tên đăng nhập</label>
                <input className={input} {...register('username')} />
            </div>
            <div>
                <label className="text-sm">Mật khẩu *</label>
                <div className="flex gap-2">
                    <input type={showPw ? 'text' : 'password'} className={input} {...register('password')} />
                    <button type="button" onClick={() => setShowPw((s) => !s)} className="rounded-lg border border-stone-300 px-3 text-sm">{showPw ? 'Ẩn' : 'Hiện'}</button>
                </div>
                {errors.password && <p className={err}>{errors.password.message}</p>}
                {strength && (
                    <p className="mt-1 text-xs">
                        Độ mạnh: <strong className={STRENGTH_COLOR[strength.level]}>{strength.label}</strong>
                    </p>
                )}

                <div className="mt-2 flex flex-wrap gap-3 text-xs">
                    <button type="button" onClick={() => setShowGen((s) => !s)} className="text-amber-700">
                        {showGen ? 'Đóng máy sinh' : 'Sinh mật khẩu mạnh'}
                    </button>
                    <button type="button" onClick={onCheckBreach} disabled={checking || !password} className="text-amber-700 disabled:opacity-50">
                        {checking ? 'Đang kiểm tra...' : 'Kiểm tra rò rỉ'}
                    </button>
                </div>
                {breachError && <p className={err}>{breachError}</p>}
                {breachValid && (
                    <p className={`mt-1 text-xs ${breach! > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {breachLabel(breach!)}{breach! > 0 && ' — nên đổi mật khẩu này.'}
                    </p>
                )}

                {showGen && (
                    <PasswordGenerator onUse={(pw) => { setValue('password', pw, { shouldValidate: true }); setShowGen(false); }} />
                )}
            </div>
            <div>
                <label className="text-sm">Bảo vệ khi xem mật khẩu</label>
                <select className={input} {...register('requireRevealAuth')}>
                    <option value="none">Không yêu cầu</option>
                    <option value="quick">Mở khóa nhanh (Vân tay / Face ID / PIN)</option>
                    <option value="pin">Mã PIN</option>
                    <option value="bio">Vân tay / Face ID</option>
                </select>
                <p className="mt-1 text-xs text-stone-400">Yêu cầu xác minh mỗi lần xem mật khẩu.</p>
            </div>
            <div>
                <label className="text-sm">Ghi chú</label>
                <textarea rows={2} className={input} {...register('note')} />
            </div>
            <div className="flex gap-2">
                <button type="submit" disabled={busy} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
                    {busy ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button type="button" onClick={onCancel} className="rounded-lg border border-stone-300 px-4 py-2 text-sm">Hủy</button>
            </div>
        </form>
    );
}