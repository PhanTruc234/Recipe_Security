'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/features/auth/hooks/use-session';
import { useLogin, useVerify2fa } from '@/features/auth/hooks/use-auth';
import { ApiError } from '@/libs/api';

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
    const [lockRemaining, setLockRemaining] = useState(0);
    const router = useRouter();
    // true chỉ SAU khi hydrate ở client (hydration-safe, không setState trong effect)
    const mounted = useSyncExternalStore(
        () => () => { },
        () => true,
        () => false,
    );

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

    useEffect(() => {
        if (lockRemaining <= 0) return;
        const id = setTimeout(() => setLockRemaining((s) => s - 1), 1000);
        return () => clearTimeout(id);
    }, [lockRemaining]);

    const startLock = (message: string) => {
        const m = /(\d+)\s*giây/.exec(message);
        setLockRemaining(m ? Number(m[1]) : 120);
    };
    const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

    const goByRole = (role?: string) => router.replace(role === 'admin' ? '/admin' : '/vault');

    const onPassword = loginForm.handleSubmit(async ({ email, password }) => {
        if (lockRemaining > 0) return;
        setServerError('');
        let res: Awaited<ReturnType<typeof login.mutateAsync>>;
        try {
            res = await login.mutateAsync({ email, password });
        } catch (e) {
            // kdf-params trả 404 = cổng đã hết hạn
            if (e instanceof ApiError && e.status === 404) return void router.replace('/');
            return setServerError('Không kết nối được máy chủ, thử lại.');
        }
        if (res.status === 404) return void router.replace('/');
        if (res.status === 429) {
            startLock(res.error ?? '');
            return setServerError(res.error ?? 'Đăng nhập tạm khóa, thử lại sau.');
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
        if (lockRemaining > 0) return;
        setServerError('');
        const res = await verify.mutateAsync({ code, password: pendingPassword });
        if (res.status === 404) return void router.replace('/');
        if (res.status === 429) {
            startLock(res.error ?? '');
            return setServerError(res.error ?? 'Nhập 2FA sai quá nhiều, thử lại sau.');
        }
        if (res.status === 401 && (res.error ?? '').includes('hết hạn')) {
            setStep('password');
            return setServerError('Phiên xác thực hết hạn, đăng nhập lại.');
        }
        if (!res.ok) {
            return setServerError(res.error ?? 'Mã 2FA không đúng, thử lại.');
        }
        goByRole(res.data?.role);
    });

    const [showPassword, setShowPassword] = useState(false);

    const inputClass =
        'w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3.5 py-2.5 text-stone-800 placeholder-stone-400 transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10';
    const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5';
    const errClass = 'mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                    {step === 'password' ? 'Đăng nhập kho mật khẩu' : 'Xác thực 2 lớp'}
                </h1>
                <p className="mt-1 text-sm text-stone-500">
                    {step === 'password'
                        ? 'Nhập tài khoản để giải mã và truy cập kho mật khẩu.'
                        : 'Nhập mã 6 số từ app Authenticator hoặc mã dự phòng.'}
                </p>
            </div>

            {serverError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-sm text-red-700 animate-in fade-in">
                    <svg className="h-5 w-5 shrink-0 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">{serverError}</span>
                </div>
            )}

            {step === 'password' ? (
                <>
                    <form method="post" onSubmit={onPassword} className="space-y-4">
                        <div>
                            <label className={labelClass}>Email</label>
                            <input
                                type="email"
                                autoFocus
                                placeholder="name@example.com"
                                className={inputClass}
                                {...loginForm.register('email')}
                            />
                            {loginForm.formState.errors.email && (
                                <p className={errClass}>{loginForm.formState.errors.email.message}</p>
                            )}
                        </div>

                        <div>
                            <label className={labelClass}>Mật khẩu</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    className={`${inputClass} pr-10`}
                                    {...loginForm.register('password')}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none transition p-1"
                                    tabIndex={-1}
                                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                >
                                    {showPassword ? (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                        </svg>
                                    ) : (
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {loginForm.formState.errors.password && (
                                <p className={errClass}>{loginForm.formState.errors.password.message}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={!mounted || login.isPending || lockRemaining > 0}
                            className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-3 font-semibold text-white shadow-md shadow-amber-600/20 transition hover:from-amber-700 hover:to-amber-600 hover:shadow-lg active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {lockRemaining > 0 ? (
                                <span>Tạm khóa ({mmss(lockRemaining)})</span>
                            ) : login.isPending ? (
                                <>
                                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    <span>Đang tạo khóa trên máy bạn...</span>
                                </>
                            ) : (
                                <span>Tiếp tục</span>
                            )}
                        </button>
                    </form>

                    <div className="border-t border-stone-100 pt-4 text-center text-sm text-stone-600">
                        Chưa có tài khoản?{' '}
                        <Link href="/register" className="font-semibold text-amber-700 transition hover:text-amber-800 hover:underline">
                            Tạo tài khoản mới
                        </Link>
                    </div>
                </>
            ) : (
                <form method="post" onSubmit={onCode} className="space-y-4">
                    <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-3.5 text-xs text-amber-900 leading-relaxed">
                        Nhập mã 6 số từ app <strong>Authenticator</strong>, hoặc một mã dự phòng 8 ký tự.
                    </div>
                    <div>
                        <label className={labelClass}>Mã xác thực 2FA</label>
                        <input
                            inputMode="numeric"
                            autoFocus
                            placeholder="123456"
                            className={`${inputClass} text-center font-mono text-xl tracking-widest`}
                            {...codeForm.register('code')}
                        />
                        {codeForm.formState.errors.code && (
                            <p className={errClass}>{codeForm.formState.errors.code.message}</p>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={!mounted || verify.isPending || lockRemaining > 0}
                        className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-3 font-semibold text-white shadow-md shadow-amber-600/20 transition hover:from-amber-700 hover:to-amber-600 hover:shadow-lg active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {lockRemaining > 0 ? (
                            <span>Tạm khóa ({mmss(lockRemaining)})</span>
                        ) : verify.isPending ? (
                            <>
                                <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span>Đang mở kho...</span>
                            </>
                        ) : (
                            <span>Mở kho mật khẩu</span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setStep('password');
                            setServerError('');
                        }}
                        className="w-full rounded-xl py-2.5 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                    >
                        &larr; Quay lại nhập mật khẩu
                    </button>
                </form>
            )}
        </div>
    );
}
