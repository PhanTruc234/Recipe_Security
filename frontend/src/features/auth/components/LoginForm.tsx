'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/features/auth/hooks/use-session';
import { useLogin, useVerify2fa } from '@/features/auth/hooks/use-auth';

const loginSchema = z.object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(1, 'Nhập mật khẩu'),
});
const codeSchema = z.object({
    code: z.string().min(6, 'Mã tối thiểu 6 ký tự'),
});
type LoginValues = z.infer<typeof loginSchema>;
type CodeValues = z.infer<typeof codeSchema>;

export function LoginForm() {
    const [step, setStep] = useState<'password' | 'twofa'>('password');
    const [pendingPassword, setPendingPassword] = useState('');
    const [serverError, setServerError] = useState('');
    const router = useRouter();

    const { session } = useSession();
    const login = useLogin();
    const verify = useVerify2fa();

    const loginForm = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
    const codeForm = useForm<CodeValues>({ resolver: zodResolver(codeSchema) });

    useEffect(() => {
        if (!session) return;
        if (session.vaultGate !== 'real') { router.replace('/'); return; }
        if (session.authenticated) router.replace(session.role === 'admin' ? '/admin' : '/vault');
    }, [session, router]);

    const goByRole = (role?: string) => router.replace(role === 'admin' ? '/admin' : '/vault');

    const onPassword = loginForm.handleSubmit(async ({ email, password }) => {
        setServerError('');
        const res = await login.mutateAsync({ email, password });
        if (res.status === 429) {
            return setServerError('Quá nhiều lần thử. Đợi một phút.');
        }
        if (!res.ok) {
            return setServerError('Sai email hoặc mật khẩu.');
        }
        if (res.data?.twofa) {
            setPendingPassword(password); setStep('twofa'); return;
        }
        goByRole(res.data?.role);
    });

    const onCode = codeForm.handleSubmit(async ({ code }) => {
        setServerError('');
        const res = await verify.mutateAsync({ code, password: pendingPassword });
        if (res.status === 429) {
            return setServerError('Quá nhiều lần thử mã. Đợi một phút.');
        }
        if (res.status === 401) {
            setStep('password');
            return setServerError('Phiên xác thực hết hạn, đăng nhập lại.');
        }
        if (!res.ok) {
            return setServerError('Mã không đúng (hoặc dùng mã dự phòng).');
        }
        goByRole(res.data?.role);
    });

    const input = 'w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500';
    const err = 'mt-1 text-xs text-red-600';

    return (
        <>
            <h1 className="text-2xl font-bold">{step === 'password' ? 'Đăng nhập kho mật khẩu' : 'Xác thực 2 lớp'}</h1>
            {serverError && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</div>}

            {step === 'password' ? (
                <>
                    <form onSubmit={onPassword} className="mt-4 space-y-3">
                        <div>
                            <label className="text-sm">Email</label>
                            <input type="email" autoFocus className={input} {...loginForm.register('email')} />
                            {loginForm.formState.errors.email && <p className={err}>{loginForm.formState.errors.email.message}</p>}
                        </div>
                        <div>
                            <label className="text-sm">Mật khẩu</label>
                            <input type="password" className={input} {...loginForm.register('password')} />
                            {loginForm.formState.errors.password && <p className={err}>{loginForm.formState.errors.password.message}</p>}
                        </div>
                        <button type="submit" disabled={login.isPending}
                            className="w-full rounded-lg bg-amber-600 py-2.5 font-medium text-white disabled:opacity-60">
                            {login.isPending ? 'Đang tạo khóa trên máy bạn...' : 'Tiếp tục'}
                        </button>
                    </form>
                    <p className="mt-2 text-sm">Chưa có tài khoản? <Link href="/register" className="text-amber-700 underline">Tạo tài khoản</Link></p>
                </>
            ) : (
                <form onSubmit={onCode} className="mt-4 space-y-3">
                    <p className="text-sm text-stone-500">Nhập mã 6 số từ app Authenticator, hoặc một mã dự phòng.</p>
                    <input inputMode="numeric" autoFocus placeholder="123456" className={input} {...codeForm.register('code')} />
                    {codeForm.formState.errors.code && <p className={err}>{codeForm.formState.errors.code.message}</p>}
                    <button type="submit" disabled={verify.isPending}
                        className="w-full rounded-lg bg-amber-600 py-2.5 font-medium text-white disabled:opacity-60">Mở kho</button>
                    <button type="button" onClick={() => { setStep('password'); setServerError(''); }}
                        className="w-full text-sm text-stone-500">Quay lại</button>
                </form>
            )}
        </>
    );
}