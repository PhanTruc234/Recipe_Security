

export interface GenOptions {
    length: number;
    lowercase: boolean;
    uppercase: boolean;
    digits: boolean;
    symbols: boolean;
    avoidAmbiguous: boolean;
}

export const DEFAULT_OPTIONS: GenOptions = {
    length: 16,
    lowercase: true,
    uppercase: true,
    digits: true,
    symbols: true,
    avoidAmbiguous: false,
};

const SETS = {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    digits: '0123456789',
    symbols: '!@#$%^&*()-_=+[]{};:,.?',
};
const AMBIGUOUS = 'lI1O0';

export function buildCharset(opts: GenOptions): string {
    let chars = '';
    if (opts.lowercase) chars += SETS.lowercase;
    if (opts.uppercase) chars += SETS.uppercase;
    if (opts.digits) chars += SETS.digits;
    if (opts.symbols) chars += SETS.symbols;
    if (opts.avoidAmbiguous) chars = [...chars].filter((c) => !AMBIGUOUS.includes(c)).join('');
    return chars;
}

function randomBelow(max: number): number {
    const limit = Math.floor(256 / max) * max;
    const buf = new Uint8Array(1);
    let v: number;
    do {
        crypto.getRandomValues(buf);
        v = buf[0];
    } while (v >= limit);
    return v % max;
}

export function generatePassword(opts: GenOptions = DEFAULT_OPTIONS): string {
    const chars = buildCharset(opts);
    if (!chars) return '';
    let out = '';
    for (let i = 0; i < opts.length; i++) out += chars[randomBelow(chars.length)];
    return out;
}

export function entropyBits(password: string, charsetSize?: number): number {
    if (!password) return 0;
    const size = charsetSize ?? guessCharsetSize(password);
    return Math.round(password.length * Math.log2(size));
}

function guessCharsetSize(password: string): number {
    let size = 0;
    if (/[a-z]/.test(password)) size += 26;
    if (/[A-Z]/.test(password)) size += 26;
    if (/[0-9]/.test(password)) size += 10;
    if (/[^a-zA-Z0-9]/.test(password)) size += 23;
    return size || 1;
}

const COMMON = [
    'password', 'matkhau', '123456', '12345678', 'qwerty', 'abc123', 'iloveyou',
    'admin', 'welcome', 'letmein', 'monkey', 'dragon', '111111', '000000',
];

export type Strength = 'yeu' | 'trungbinh' | 'manh' | 'ratmanh';

export interface StrengthResult {
    bits: number;
    level: Strength;
    label: string;
    reasons: string[];
}

export function assessStrength(password: string): StrengthResult {
    const reasons: string[] = [];
    const bits = entropyBits(password);
    const lower = password.toLowerCase();

    const inDictionary = COMMON.some((c) => lower.includes(c));
    if (inDictionary) reasons.push('Chứa từ/dãy phổ biến trong từ điển tấn công');
    if (password.length < 12) reasons.push('Ngắn hơn 12 ký tự');
    if (/^[a-z]+$/.test(password) || /^[0-9]+$/.test(password)) reasons.push('Chỉ dùng một loại ký tự');
    if (/(.)\1{2,}/.test(password)) reasons.push('Có ký tự lặp liên tiếp');
    if (/(012|123|234|345|456|567|678|789|abc|qwe)/i.test(password)) reasons.push('Có dãy tăng dần dễ đoán');
    let level: Strength;
    if (inDictionary || bits < 40) level = 'yeu';
    else if (bits < 60) level = 'trungbinh';
    else if (bits < 80) level = 'manh';
    else level = 'ratmanh';

    const labels: Record<Strength, string> = {
        yeu: 'Yếu',
        trungbinh: 'Trung bình',
        manh: 'Mạnh',
        ratmanh: 'Rất mạnh',
    };

    return { bits, level, label: labels[level], reasons };
}

export function crackTime(bits: number): string {
    const seconds = Math.pow(2, bits) / 1e10;
    if (seconds < 1) return 'tức thì';
    if (seconds < 60) return `${Math.round(seconds)} giây`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} phút`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} giờ`;
    if (seconds < 31536000) return `${Math.round(seconds / 86400)} ngày`;
    const years = seconds / 31536000;
    if (years < 1000) return `${Math.round(years)} năm`;
    if (years < 1e6) return `${Math.round(years / 1000)} nghìn năm`;
    if (years < 1e9) return `${Math.round(years / 1e6)} triệu năm`;
    return `${(years / 1e9).toExponential(1)} tỷ năm`;
}
