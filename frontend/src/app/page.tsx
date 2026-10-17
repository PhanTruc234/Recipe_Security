import Link from "next/link";
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

export default async function CoverPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const activeCat = cat && cat in CATEGORIES ? cat : null;

  const tabClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 transition ${active ? 'bg-amber-600 text-white' : 'text-stone-500 hover:bg-amber-100'}`;

  return (
    <div className="min-h-screen bg-amber-50 text-stone-800">
      <nav className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-bold text-amber-700">🍲 Bếp Nhà</span>
        <div className="flex gap-1 text-sm">
          <Link href="/" className={tabClass(activeCat === null)}>Tất cả</Link>
          {Object.keys(CATEGORIES).map((t) => (
            <Link key={t} href={`/?cat=${encodeURIComponent(t)}`} className={tabClass(activeCat === t)}>
              {t}
            </Link>
          ))}
        </div>
      </nav>

      <header className="flex flex-col items-center gap-4 px-6 pt-12 pb-2 text-center">
        <p className="text-xs uppercase tracking-widest text-amber-600">Kho công thức mỗi ngày</p>
        <h1 className="text-3xl font-bold">Hôm nay nấu món gì?</h1>
        <p className="text-stone-500">Nhập tên món hoặc bấm vào món để xem công thức, nguyên liệu và các bước.</p>
      </header>

      <RecipeSearch categories={CATEGORIES} activeCategory={activeCat} />

      <footer className="border-t border-amber-100 py-6 text-center text-sm text-stone-400">
        Bếp Nhà · Công thức nấu ăn Việt
      </footer>
    </div>
  );
}
