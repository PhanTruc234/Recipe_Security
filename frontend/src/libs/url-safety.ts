function entropy(s: string): number {
  const freq: Record<string, number> = {};
  for (const c of s) freq[c] = (freq[c] || 0) + 1;
  return Object.values(freq).reduce((h, n) => {
    const p = n / s.length;
    return h - p * Math.log2(p);
  }, 0);
}

const CONFUSABLES: Record<string, string> = {
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', у: 'y', х: 'x', і: 'i',
  ο: 'o', α: 'a', ν: 'v', ρ: 'p', ε: 'e',
  '0': 'o', '1': 'l', '3': 'e', '5': 's', '4': 'a', '7': 't',
};
const skeleton = (s: string): string => [...s.toLowerCase()].map((c) => CONFUSABLES[c] ?? c).join('');
const isMixedScript = (host: string): boolean => /[a-z]/i.test(host) && /[Ѐ-ӿͰ-Ͽ]/.test(host);
const PHISH_WORDS = new Set([
  'login', 'signin', 'logon', 'secure', 'security', 'verify', 'verification', 'account',
  'update', 'confirm', 'wallet', 'password', 'webscr', 'support', 'recover', 'unlock',
  'billing', 'invoice', 'gift', 'bonus', 'free', 'claim', 'auth', 'validate',
]);
const tokenize = (s: string): string[] => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

const BRAND_CORES = [
  'google', 'facebook', 'paypal', 'apple', 'microsoft', 'amazon', 'gmail', 'youtube',
  'instagram', 'netflix', 'twitter', 'linkedin', 'shopee', 'tiki', 'lazada', 'momo',
  'zalopay', 'vietcombank', 'techcombank', 'sacombank', 'mbbank', 'bidv', 'agribank',
  'tpbank', 'acb',
];

const RISKY_TLDS = new Set(['tk', 'zip', 'top', 'gq', 'ml', 'cf', 'ga', 'xyz', 'work', 'click', 'link']);
const SHORTENERS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'cutt.ly', 'ow.ly', 'rb.gy']);

const PUBLIC_SUFFIXES = new Set([
  'com', 'net', 'org', 'io', 'co', 'gov', 'edu', 'info', 'biz', 'xyz', 'top', 'tk', 'zip',
  'gq', 'ml', 'cf', 'ga', 'work', 'click', 'link', 'app', 'dev', 'online', 'site', 'vn',
  'com.vn', 'net.vn', 'org.vn', 'edu.vn', 'gov.vn', 'co.uk', 'org.uk', 'com.au',
]);

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

interface Reg { reg: string; core: string; suffix: string; subCount: number }

function registrable(host: string): Reg | null {
  const labels = host.split('.').filter(Boolean);
  if (labels.length < 2) return null;
  for (let i = 0; i < labels.length; i++) {
    const suffix = labels.slice(i).join('.');
    if (PUBLIC_SUFFIXES.has(suffix)) {
      if (i === 0) return null;
      return { reg: labels.slice(i - 1).join('.'), core: labels[i - 1], suffix, subCount: i - 1 };
    }
  }
  const n = labels.length;
  return { reg: labels.slice(-2).join('.'), core: labels[n - 2], suffix: labels[n - 1], subCount: n - 2 };
}
function rawHost(input: string): string {
  const afterScheme = input.trim().replace(/^[a-zA-Z][\w+.-]*:\/\//, '');
  const hostPart = afterScheme.split(/[/?#]/)[0].split('@');
  return hostPart[hostPart.length - 1].split(':')[0].toLowerCase();
}

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;
const hasScheme = (s: string) => /^[a-zA-Z][\w+.-]*:\/\//.test(s);

export type Level = 'safe' | 'warn' | 'danger';
export interface UrlVerdict {
  registrableDomain: string | null;
  level: Level;
  score: number;
  matchedBrand?: string;
  reasons: string[];
}


export function registrableDomainOf(input: string): string | null {
  if (!input.trim()) return null;
  const reg = registrable(rawHost(input));
  return reg ? reg.reg : null;
}


export function assessUrl(input: string, boundDomain?: string | null): UrlVerdict {
  const reasons: string[] = [];
  let score = 0;
  const add = (pts: number, why: string) => { score += pts; reasons.push(why); };

  let url: URL;
  try {
    url = new URL(hasScheme(input) ? input : 'https://' + input);
  } catch {
    return { registrableDomain: null, level: 'danger', score: 100, reasons: ['URL không phân tích được'] };
  }

  const host = rawHost(input);
  const isIp = IPV4.test(url.hostname);
  const reg = isIp ? null : registrable(host);
  let matchedBrand: string | undefined;


  if (url.protocol !== 'https:') add(20, 'Không dùng HTTPS');
  if (url.username) add(45, `Có "@" đánh lừa — host thật là "${url.hostname}"`);
  if (isIp) add(45, 'Dùng địa chỉ IP thay cho tên miền');
  if (url.port && !['', '80', '443'].includes(url.port)) add(15, `Cổng lạ :${url.port}`);
  if (url.hostname.includes('xn--')) add(15, 'Tên miền IDN (Unicode) — cần soi kỹ');
  if (isMixedScript(host)) add(45, 'Trộn nhiều bảng chữ (homograph)');

  if (reg) {
    const core = reg.core;

    const digitRatio = (core.match(/\d/g) || []).length / core.length;
    const longest = core.split('-').reduce((a, b) => (b.length > a.length ? b : a), '');
    const vowelRatio = longest.length ? (longest.match(/[aeiou]/g) || []).length / longest.length : 1;
    if (longest.length >= 8 && entropy(longest) >= 3.2 && (vowelRatio < 0.25 || digitRatio >= 0.33))
      add(25, 'Tên miền trông như chuỗi sinh ngẫu nhiên');
    if (core.length >= 6 && digitRatio >= 0.33) add(15, 'Tên miền lẫn nhiều chữ số bất thường');

    const hostWords = tokenize(host).filter((t) => PHISH_WORDS.has(t));
    const pathWords = tokenize(url.pathname).filter((t) => PHISH_WORDS.has(t));
    const allWords = [...new Set([...hostWords, ...pathWords])];
    if (hostWords.length >= 2) add(25, `Tên miền nhồi từ khóa: ${hostWords.join(', ')}`);
    else if (allWords.length >= 2) add(12, `Chứa từ khóa dụ nhập tài khoản: ${allWords.join(', ')}`);

    if (reg.subCount >= 3) add(15, `Quá nhiều subdomain (${reg.subCount})`);
    if ((host.match(/-/g) || []).length >= 3) add(10, 'Quá nhiều dấu gạch nối');
    const tld = reg.suffix.split('.')[reg.suffix.split('.').length - 1];
    if (RISKY_TLDS.has(tld)) add(15, `Đuôi ".${reg.suffix}" hay bị dùng để lừa đảo`);
    if (SHORTENERS.has(reg.reg)) add(20, 'URL rút gọn — đích đến bị che giấu');

    const sk = skeleton(core);
    for (const b of BRAND_CORES) {
      if (core === b) break;
      if (sk === skeleton(b)) { add(50, `Nhìn GIỐNG "${b}" bằng ký tự đánh lừa`); matchedBrand = b; break; }
      const d = levenshtein(core, b);
      if (d > 0 && d <= 2 && Math.abs(core.length - b.length) <= 2) {
        add(40, `Gõ NHÁI "${b}" (chỉ khác ${d} ký tự)`); matchedBrand = b; break;
      }
    }
    if (!matchedBrand) {
      const hit = BRAND_CORES.find((b) => host.includes(b) && core !== b);
      if (hit) { add(45, `"${hit}" chỉ nằm ở subdomain — tên miền thật là "${reg.reg}"`); matchedBrand = hit; }
    }
  }

  if (boundDomain && reg && reg.reg !== boundDomain) add(60, `Khác tên miền đã lưu "${boundDomain}"`);

  const level: Level = score >= 40 ? 'danger' : score >= 15 ? 'warn' : 'safe';
  return { registrableDomain: reg ? reg.reg : null, level, score, matchedBrand, reasons };
}
