'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import type { Recipe } from '@/types';
import { recipeApi } from '../api/recipe.api';

export function RecipeSearch() {
    const [query, setQuery] = useState('');
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [message, setMessage] = useState('');
    const router = useRouter();

    const search = useMutation({
        mutationFn: (q: string) => recipeApi.search(q),
        onSuccess: (res) => {
            if (res.status === 429) {
                return setMessage('Bạn tìm hơi nhanh, thử lại sau ít phút.');
            }
            if (!res.ok || !res.data) {
                return setMessage('Không tìm thấy món phù hợp.');
            }
            const data = res.data;
            if (data.unlocked === 'real') {
                return void router.push('/login');
            }
            if (data.unlocked === 'fake') {
                return void router.push('/fake');
            }
            if (data.notFound || !data.recipe) {
                setRecipe(null);
                return setMessage(`Không tìm thấy món "${query}". Thử: phở, bún, chè...`);
            }
            setRecipe(data.recipe);
            setMessage('');
        },
    });

    function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const q = query.trim();
        if (!q) return;
        setMessage('');
        search.mutate(q);
    }

    return (
        <div className="w-full max-w-xl">
            <form onSubmit={onSubmit} className="flex gap-2">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm món ăn... (vd: phở bò)"
                    autoComplete="off"
                    className="flex-1 rounded-lg border border-amber-200 bg-white px-4 py-3 outline-none focus:border-amber-500"
                />
                <button
                    type="submit"
                    disabled={search.isPending}
                    className="rounded-lg bg-amber-600 px-6 py-3 font-medium text-white disabled:opacity-60"
                >
                    {search.isPending ? 'Đang tìm...' : 'Tìm'}
                </button>
            </form>
            {message && <p className="mt-3 text-sm text-red-600">{message}</p>}

            {recipe && (
                <section className="mt-6 rounded-xl bg-white p-5 text-left shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-amber-600">{recipe.cuisine}</p>
                    <h2 className="text-xl font-semibold">{recipe.name}</h2>
                    <div className="mt-1 flex gap-4 text-sm text-stone-500">
                        <span>{recipe.timeMinutes} phút</span><span>{recipe.servings} người</span><span>{recipe.level}</span>
                    </div>
                    <div className="mt-4 grid gap-6 sm:grid-cols-2">
                        <div>
                            <h3 className="font-medium">Nguyên liệu</h3>
                            <ul className="mt-1 list-disc pl-5 text-sm text-stone-700">
                                {recipe.ingredients.map((i, k) => <li key={k}>{i}</li>)}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-medium">Các bước</h3>
                            <ol className="mt-1 list-decimal pl-5 text-sm text-stone-700">
                                {recipe.steps.map((s, k) => <li key={k}>{s}</li>)}
                            </ol>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}