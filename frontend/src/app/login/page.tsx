import { LoginForm } from "@/features/auth/components/LoginForm";


export default function LoginPage() {
    return (
        <div className="flex min-h-full items-center justify-center bg-amber-50 px-4">
            <section className="w-full max-w-sm rounded-2xl bg-white p-6 shadow">
                <span className="text-lg font-bold text-amber-700">Bếp Nhà</span>
                <p className="mb-4 text-xs uppercase tracking-widest text-amber-600">Khu vực riêng tư</p>
                <LoginForm />
            </section>
        </div>
    );
}