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
        if (res.status === 409) {
            return setServerError('Email đã được sử dụng.');
        }
        if (!res.ok) {
            return setServerError('Không tạo được tài khoản.');
        }
        router.replace('/vault');
    });

    const input = 'w-full rounded-lg border border-stone-300 px-3 py-2 outline-none focus:border-amber-500';
    const err = 'mt-1 text-xs text-red-600';

    return (
        <>
            <h1 className="text-2xl font-bold">Tạo tài khoản</h1>
            {serverError && <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{serverError}</div>}
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
                <div>
                    <label className="text-sm">Tên hiển thị</label>
                    <input autoFocus className={input} {...field('name')} />
                    {errors.name && <p className={err}>{errors.name.message}</p>}
                </div>
                <div>
                    <label className="text-sm">Email</label>
                    <input type="email" className={input} {...field('email')} />
                    {errors.email && <p className={err}>{errors.email.message}</p>}
                </div>
                <div>
                    <label className="text-sm">Mật khẩu</label>
                    <input type="password" className={input} {...field('password')} />
                    {errors.password && <p className={err}>{errors.password.message}</p>}
                </div>
                <div>
                    <label className="text-sm">Nhập lại mật khẩu</label>
                    <input type="password" className={input} {...field('confirm')} />
                    {errors.confirm && <p className={err}>{errors.confirm.message}</p>}
                </div>
                <button type="submit" disabled={register.isPending}
                    className="w-full rounded-lg bg-amber-600 py-2.5 font-medium text-white disabled:opacity-60">
                    {register.isPending ? 'Đang sinh cặp khóa...' : 'Tạo tài khoản'}
                </button>
            </form>
            <p className="mt-3 text-xs text-stone-500"><strong>Quên mật khẩu là mất kho</strong> — khóa mã hóa bằng chính mật khẩu.</p>
            <p className="mt-2 text-sm">Đã có tài khoản? <Link href="/login" className="text-amber-700 underline">Đăng nhập</Link></p>
        </>
    );
}