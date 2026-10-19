'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import type { Recipe } from '@/types';
import { recipeApi } from '../api/recipe.api';

type Dish = { name: string; desc: string; time: number; level: string };

export function RecipeSearch({
    categories,
    activeCategory,
}: {
    categories?: Record<string, Dish[]>;
    activeCategory?: string | null;
}) {
    const [query, setQuery] = useState('');
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [message, setMessage] = useState('');
    const router = useRouter();

    const search = useMutation({
        mutationFn: async (q: string) => {
            let res = await recipeApi.search(q);
            if (res.status === 403) {
                res = await recipeApi.search(q);
            }
            return res;
        },
        onSuccess: (res) => {
            if (res.status === 429) return setMessage('Bạn tìm hơi nhanh, thử lại sau ít phút.');
            if (!res.ok || !res.data) return setMessage('Không tìm thấy món phù hợp.');
            const data = res.data;
            if (data.unlocked === 'real') return void router.push('/login');
            if (data.unlocked === 'fake') return void router.push('/fake');
            if (data.notFound || !data.recipe) {
                setRecipe(null);
                return setMessage('Không tìm thấy món phù hợp. Thử: phở, bún, chè...');
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

    const openDish = (name: string) => {
        setMessage('');
        search.mutate(name);
    };

    return (
        <div className="w-full px-6 pb-16">
            <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-xl gap-2">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm món ăn... (vd: phở bò)"
                    autoComplete="off"
                    className="flex-1 rounded-lg border border-amber-200 bg-white px-4 py-3 text-stone-800 outline-none focus:border-amber-500"
                />
                <button
                    type="submit"
                    disabled={search.isPending}
                    className="rounded-lg bg-amber-600 px-6 py-3 font-medium text-white disabled:opacity-60"
                >
                    {search.isPending ? 'Đang tìm...' : 'Tìm'}
                </button>
            </form>
            {message && (
                <p className="mx-auto mt-3 max-w-xl text-center text-sm text-red-600">{message}</p>
            )}

            {categories && (
                <div className="mx-auto mt-10 max-w-5xl text-left">
                    {Object.entries(categories)
                        .filter(([cat]) => !activeCategory || cat === activeCategory)
                        .map(([cat, items]) => (
                        <section key={cat} className="mb-10">
                            <h2 className="mb-4 text-xl font-semibold text-stone-800">{cat}</h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {items.map((r) => (
                                    <button
                                        key={r.name}
                                        type="button"
                                        onClick={() => openDish(r.name)}
                                        className="rounded-xl bg-white p-4 text-left shadow-sm transition hover:shadow-md hover:ring-2 hover:ring-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    >
                                        <h3 className="font-medium text-stone-800">{r.name}</h3>
                                        <p className="mt-1 text-sm text-stone-500">{r.desc}</p>
                                        <div className="mt-3 flex justify-between text-xs text-stone-400">
                                            <span>⏱ {r.time}′</span>
                                            <span>{r.level}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}

            {recipe && (
                <div
                    className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
                    onClick={() => setRecipe(null)}
                >
                    <section
                        className="mt-16 w-full max-w-lg rounded-2xl bg-white p-6 text-left text-stone-800 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-wide text-amber-600">{recipe.cuisine}</p>
                                <h2 className="text-xl font-semibold">{recipe.name}</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRecipe(null)}
                                aria-label="Đóng"
                                className="rounded-lg px-2 py-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="mt-1 flex gap-4 text-sm text-stone-500">
                            <span>{recipe.timeMinutes} phút</span>
                            <span>{recipe.servings} người</span>
                            <span>{recipe.level}</span>
                        </div>
                        <div className="mt-4 grid gap-6 sm:grid-cols-2">
                            <div>
                                <h3 className="font-medium">Nguyên liệu</h3>
                                <ul className="mt-1 list-disc pl-5 text-sm text-stone-700">
                                    {recipe.ingredients.map((i, k) => (
                                        <li key={k}>{i}</li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-medium">Các bước</h3>
                                <ol className="mt-1 list-decimal pl-5 text-sm text-stone-700">
                                    {recipe.steps.map((s, k) => (
                                        <li key={k}>{s}</li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
