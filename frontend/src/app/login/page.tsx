import { LoginForm } from "@/features/auth/components/LoginForm";
import Link from "next/link";
import { connection } from "next/server";

export default async function LoginPage() {
    await connection();
    return (
        <main className="flex min-h-screen flex-1 flex-col items-center justify-center bg-linear-to-b from-amber-50 via-amber-50/70 to-orange-50/40 px-4 py-12">
            <div className="w-full max-w-md">
                <section className="rounded-3xl border border-amber-200/70 bg-white/95 p-8 shadow-2xl shadow-amber-900/10 backdrop-blur-sm sm:p-10">
                    <div className="mb-6 flex items-center justify-between">
                        <Link
                            href="/"
                            className="group flex items-center gap-2 text-sm font-semibold text-amber-800 transition hover:text-amber-950"
                        >
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100/90 text-lg shadow-sm transition group-hover:scale-105">
                                🍲
                            </span>
                            <span className="text-base font-bold text-amber-800">Bếp Nhà</span>
                        </Link>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-100/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Khu vực riêng tư
                        </span>
                    </div>

                    <LoginForm />
                </section>

                <p className="mt-6 text-center text-xs text-stone-500">
                    Bảo mật đầu cuối Zero-Knowledge &middot; Khóa giải mã chỉ lưu trên máy của bạn
                </p>
            </div>
        </main>
    );
}