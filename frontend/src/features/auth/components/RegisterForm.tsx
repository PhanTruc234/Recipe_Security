'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/features/auth/hooks/use-session';
import { useRegister } from '@/features/auth/hooks/use-auth';

const registerSchema = z
    .object({
        name: z.string().min(1, 'Nhập tên hiển thị').max(80),
        email: z.string().email('Email không hợp lệ'),
        password: z
            .string()
            .min(8, 'Tối thiểu 8 ký tự')
            .regex(/[A-Za-z]/, 'Cần có chữ')
            .regex(/[0-9]/, 'Cần có số'),
        confirm: z.string(),
    })
    .refine((d) => d.password === d.confirm, { message: 'Mật khẩu nhập lại không khớp', path: ['confirm'] });
type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
    const [serverError, setServerError] = useState('');
    const router = useRouter();
    const { session } = useSession();
    const register = useRegister();
    const { register: field, handleSubmit, formState: { errors } } = useForm<RegisterValues>(
        {
            resolver: zodResolver(registerSchema)

        });
    useEffect(() => {
        if (session && session.vaultGate !== 'real') {
            router.replace('/');
        }
    }, [session, router]);

    const onSubmit = handleSubmit(async ({ name, email, password }) => {
        setServerError('');
        const res = await register.mutateAsync({ name, email, password });
        if (res.status === 404) return void router.replace('/');
        if (res.status === 409) {
            return setServerError('Email đã được sử dụng.');
        }
        if (!res.ok) {
            return setServerError('Không tạo được tài khoản.');
        }
        router.replace('/vault');
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const inputClass =
        'w-full rounded-xl border border-stone-200 bg-stone-50/60 px-3.5 py-2.5 text-stone-800 placeholder-stone-400 transition focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10';
    const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-stone-600 mb-1.5';
    const errClass = 'mt-1.5 text-xs font-medium text-red-600 flex items-center gap-1';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">Tạo tài khoản</h1>
                <p className="mt-1 text-sm text-stone-500">
                    Khởi tạo kho mật khẩu cá nhân được mã hóa zero-knowledge.
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

            <form method="post" onSubmit={onSubmit} className="space-y-4">
                <div>
                    <label className={labelClass}>Tên hiển thị</label>
                    <input
                        autoFocus
                        placeholder="Nguyễn Văn A"
                        className={inputClass}
                        {...field('name')}
                    />
                    {errors.name && <p className={errClass}>{errors.name.message}</p>}
                </div>

                <div>
                    <label className={labelClass}>Email</label>
                    <input
                        type="email"
                        placeholder="name@example.com"
                        className={inputClass}
                        {...field('email')}
                    />
                    {errors.email && <p className={errClass}>{errors.email.message}</p>}
                </div>

                <div>
                    <label className={labelClass}>Mật khẩu chính (Master Password)</label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Tối thiểu 8 ký tự, gồm chữ & số"
                            className={`${inputClass} pr-10`}
                            {...field('password')}
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
                    {errors.password && <p className={errClass}>{errors.password.message}</p>}
                </div>

                <div>
                    <label className={labelClass}>Nhập lại mật khẩu</label>
                    <div className="relative">
                        <input
                            type={showConfirm ? 'text' : 'password'}
                            placeholder="Nhập lại đúng mật khẩu trên"
                            className={`${inputClass} pr-10`}
                            {...field('confirm')}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none transition p-1"
                            tabIndex={-1}
                            title={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                            {showConfirm ? (
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
                    {errors.confirm && <p className={errClass}>{errors.confirm.message}</p>}
                </div>

                <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                    <svg className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                    </svg>
                    <span>
                        <strong>Lưu ý quan trọng:</strong> Quên mật khẩu là mất kho dữ liệu vĩnh viễn vì toàn bộ dữ liệu được mã hóa bằng chính mật khẩu này trên máy bạn.
                    </span>
                </div>

                <button
                    type="submit"
                    disabled={register.isPending}
                    className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 py-3 font-semibold text-white shadow-md shadow-amber-600/20 transition hover:from-amber-700 hover:to-amber-600 hover:shadow-lg active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {register.isPending ? (
                        <>
                            <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            <span>Đang sinh cặp khóa trên máy bạn...</span>
                        </>
                    ) : (
                        <span>Tạo tài khoản</span>
                    )}
                </button>
            </form>

            <div className="border-t border-stone-100 pt-4 text-center text-sm text-stone-600">
                Đã có tài khoản?{' '}
                <Link href="/login" className="font-semibold text-amber-700 transition hover:text-amber-800 hover:underline">
                    Đăng nhập
                </Link>
            </div>
        </div>
    );
}