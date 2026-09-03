export interface FakeRecipe {
    name: string; cuisine: string; level: string;
    timeMinutes: number; servings: number;
    ingredients: string[]; steps: string[];
}

const seedFrom = (str: string): number => {
    let h = 2166136261;
    const s = str.toLowerCase();
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
};
const titleCase = (s: string) =>
    s.trim().split(/\s+/).map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');

const CUISINES = ['Món Việt', 'Món Á', 'Món Âu', 'Món chay', 'Món tráng miệng', 'Món nướng'];
const LEVELS = ['Dễ', 'Trung bình', 'Khó'];
const INGREDIENTS = ['Hành tím', 'Tỏi', 'Gừng', 'Nước mắm', 'Đường', 'Muối', 'Tiêu', 'Dầu ăn', 'Trứng', 'Cà chua', 'Hành lá', 'Rau thơm', 'Ớt', 'Chanh', 'Bột năng', 'Nước dừa', 'Sả', 'Ngò rí', 'Đậu phộng', 'Nấm hương'];
const STEPS = ['Sơ chế và rửa sạch nguyên liệu.', 'Ướp gia vị trong 15 phút cho thấm.', 'Phi thơm hành tỏi trên lửa vừa.', 'Cho nguyên liệu chính vào đảo đều.', 'Thêm nước và đun đến khi chín mềm.', 'Nêm nếm lại cho vừa ăn.', 'Bày ra đĩa và rắc rau thơm lên trên.', 'Dùng nóng cùng cơm trắng.'];

const pick = (arr: string[], seed: number, count: number) => {
    const out: string[] = [];
    for (let i = 0; i < count; i++) out.push(arr[(seed + i * 7) % arr.length]);
    return [...new Set(out)];
};
const normalize = (s: string) =>
    String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

const DISH_KEYWORDS = ['pho', 'bun', 'com', 'banh', 'cha', 'nem', 'goi', 'cuon', 'canh', 'chao', 'mi', 'mien', 'xoi', 'che', 'tra', 'nuoc', 'rau', 'thit', 'ga', 'bo', 'heo', 'tom', 'ca', 'cua', 'muc', 'trung', 'dau', 'nam', 'lau', 'nuong', 'kho', 'xao', 'chien', 'hap', 'luoc', 'salad', 'pizza', 'pasta', 'sup', 'sua', 'suon', 'caphe', 'sinh', 'hu', 'tieu', 'oc'];

export const looksLikeDish = (name: string): boolean => {
    const tokens = normalize(name).split(/[^a-z0-9]+/).filter(Boolean);
    return tokens.some((t) =>
        DISH_KEYWORDS.some((k) => t === k || t.startsWith(k) || (t.length >= 3 && k.startsWith(t))),
    );
};

export const generateRecipe = (name: string): FakeRecipe => {
    const seed = seedFrom(name);
    return {
        name: titleCase(name),
        cuisine: CUISINES[seed % CUISINES.length],
        level: LEVELS[seed % LEVELS.length],
        timeMinutes: 15 + (seed % 40),
        servings: 2 + (seed % 4),
        ingredients: pick(INGREDIENTS, seed, 6),
        steps: pick(STEPS, seed, 6),
    };
};

export const fakeVaultNotes = () => [
    { title: 'Danh sách đi chợ', body: 'Rau, thịt, trứng, gạo, gia vị.' },
    { title: 'Món cuối tuần', body: 'Thử làm bún bò và chè khúc bạch.' },
    { title: 'Ghi chú', body: 'Đây là kho mẫu mở bằng mã phụ.' },
];