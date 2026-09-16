import { RecipeSearch } from "@/features/recipe/components/RecipeSearch";

const CATEGORIES: Record<string, { name: string; desc: string; time: number; level: string }[]> = {
  'Món chính': [
    { name: 'Phở bò', desc: 'Nước dùng ninh xương, thịt bò tái.', time: 120, level: 'Trung bình' },
    { name: 'Cơm tấm sườn', desc: 'Sườn nướng, bì chả, cơm tấm.', time: 45, level: 'Trung bình' },
    { name: 'Bún chả', desc: 'Chả nướng than, nước chấm chua ngọt.', time: 50, level: 'Khó' },
    { name: 'Bò kho', desc: 'Bò hầm mềm, ăn kèm bánh mì.', time: 90, level: 'Trung bình' },
  ],
  'Món chay': [
    { name: 'Đậu hũ sốt cà', desc: 'Đậu hũ chiên rưới sốt cà.', time: 25, level: 'Dễ' },
    { name: 'Rau muống xào tỏi', desc: 'Rau muống giòn xào tỏi.', time: 15, level: 'Dễ' },
    { name: 'Canh chua chay', desc: 'Thanh mát với thơm, cà, đậu bắp.', time: 30, level: 'Dễ' },
    { name: 'Nấm kho tiêu', desc: 'Nấm kho đậm đà, cay nhẹ.', time: 35, level: 'Trung bình' },
  ],
  'Tráng miệng': [
    { name: 'Chè khúc bạch', desc: 'Mát lạnh, hạnh nhân, vải.', time: 40, level: 'Trung bình' },
    { name: 'Bánh flan', desc: 'Mềm mịn, caramel đắng nhẹ.', time: 60, level: 'Trung bình' },
  ],
};

export default function CoverPage() {
  return (
    <div className="min-h-full bg-amber-50 text-stone-800">
      <nav className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-bold text-amber-700">🍲 Bếp Nhà</span>
        <div className="flex gap-4 text-sm text-stone-500">
          {Object.keys(CATEGORIES).map((t) => <span key={t}>{t}</span>)}
        </div>
      </nav>

      <header className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <p className="text-xs uppercase tracking-widest text-amber-600">Kho công thức mỗi ngày</p>
        <h1 className="text-3xl font-bold">Hôm nay nấu món gì?</h1>
        <p className="text-stone-500">Nhập tên món ăn để xem công thức, nguyên liệu và các bước.</p>
        <RecipeSearch />
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-16">
        {Object.entries(CATEGORIES).map(([cat, items]) => (
          <section key={cat} className="mb-10">
            <h2 className="mb-4 text-xl font-semibold">{cat}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((r) => (
                <article key={r.name} className="rounded-xl bg-white p-4 shadow-sm">
                  <h3 className="font-medium">{r.name}</h3>
                  <p className="mt-1 text-sm text-stone-500">{r.desc}</p>
                  <div className="mt-3 flex justify-between text-xs text-stone-400">
                    <span>⏱ {r.time}′</span><span>{r.level}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </main>

      <footer className="border-t border-amber-100 py-6 text-center text-sm text-stone-400">
        Bếp Nhà · Công thức nấu ăn Việt
      </footer>
    </div>
  );
}