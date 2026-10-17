'use client';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div className="mx-auto max-w-md p-8 text-center">
            <h2 className="text-lg font-semibold">Có lỗi xảy ra</h2>
            <p className="mt-2 text-sm text-stone-500">{error.message}</p>
            <button onClick={reset} className="mt-4 rounded-lg bg-amber-600 px-4 py-2 text-white">
                Thử lại
            </button>
        </div>
    );
}