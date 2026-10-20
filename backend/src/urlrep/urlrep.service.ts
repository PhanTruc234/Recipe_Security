import { Injectable } from '@nestjs/common';

export type RepLevel = 'clean' | 'warn' | 'danger' | 'unknown';
export interface ProviderResult {
  configured: boolean;
  ok: boolean;
  flagged: boolean;
  warn: boolean;
  detail: string;
}
export interface ReputationResult {
  domain: string;
  level: RepLevel;
  safeBrowsing: ProviderResult;
  virusTotal: ProviderResult;
  cached: boolean;
}

const TTL_MS = 6 * 60 * 60 * 1000;
// Số engine VirusTotal tối thiểu để coi là độc hại (1 engine lẻ -> chỉ nghi ngờ)
const VT_DANGER_MIN = 2;

interface VtFound {
  status: 'ok';
  malicious: number;
  suspicious: number;
  total: number;
  analyzedAt: Date | null;
}
type VtLookup =
  VtFound | { status: 'notfound' } | { status: 'error'; message: string };

// ID báo cáo URL của VirusTotal = base64url(URL) không có dấu "=" ở cuối
const vtUrlId = (url: string) =>
  Buffer.from(new URL(url).href).toString('base64url');

const formatDate = (d: Date) =>
  d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

@Injectable()
export class UrlrepService {
  private cache = new Map<string, { at: number; result: ReputationResult }>();

  private notConfigured(): ProviderResult {
    return {
      configured: false,
      ok: false,
      flagged: false,
      warn: false,
      detail: 'Chưa cấu hình API key',
    };
  }
  private failed(msg: string): ProviderResult {
    return {
      configured: true,
      ok: false,
      flagged: false,
      warn: false,
      detail: msg,
    };
  }

  anyProviderConfigured(): boolean {
    return !!(process.env.SAFE_BROWSING_KEY || process.env.VIRUSTOTAL_KEY);
  }

  private async checkSafeBrowsing(
    url: string,
    domain: string,
  ): Promise<ProviderResult> {
    const key = process.env.SAFE_BROWSING_KEY;
    if (!key) return this.notConfigured();
    try {
      const targets = [
        ...new Set([url, 'http://' + domain + '/', 'https://' + domain + '/']),
      ];
      const res = await fetch(
        'https://safebrowsing.googleapis.com/v4/threatMatches:find?key=' +
          encodeURIComponent(key),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000),
          body: JSON.stringify({
            client: { clientId: 'recipe-security', clientVersion: '1.0' },
            threatInfo: {
              threatTypes: [
                'MALWARE',
                'SOCIAL_ENGINEERING',
                'UNWANTED_SOFTWARE',
                'POTENTIALLY_HARMFUL_APPLICATION',
              ],
              platformTypes: ['ANY_PLATFORM'],
              threatEntryTypes: ['URL'],
              threatEntries: targets.map((u) => ({ url: u })),
            },
          }),
        },
      );
      if (!res.ok) return this.failed(`Safe Browsing lỗi HTTP ${res.status}`);
      const json = (await res.json()) as { matches?: unknown[] };
      const flagged = Array.isArray(json.matches) && json.matches.length > 0;
      return {
        configured: true,
        ok: true,
        flagged,
        warn: false,
        detail: flagged
          ? 'Google đánh dấu ĐỘC HẠI'
          : 'Google Safe Browsing: chưa bị báo xấu',
      };
    } catch {
      return this.failed('Không gọi được Safe Browsing');
    }
  }

  // Tra 1 đối tượng VirusTotal (báo cáo URL hoặc báo cáo tên miền)
  private async vtLookup(path: string, key: string): Promise<VtLookup> {
    try {
      const res = await fetch('https://www.virustotal.com/api/v3/' + path, {
        headers: { 'x-apikey': key },
        signal: AbortSignal.timeout(5000),
      });
      if (res.status === 404) return { status: 'notfound' };
      if (!res.ok) return { status: 'error', message: `HTTP ${res.status}` };
      const json = (await res.json()) as {
        data?: {
          attributes?: {
            last_analysis_stats?: Record<string, number>;
            last_analysis_date?: number;
          };
        };
      };
      const attrs = json.data?.attributes ?? {};
      const stats = attrs.last_analysis_stats ?? {};
      return {
        status: 'ok',
        malicious: stats.malicious ?? 0,
        suspicious: stats.suspicious ?? 0,
        total: Object.values(stats).reduce((s, n) => s + (n ?? 0), 0),
        analyzedAt: attrs.last_analysis_date
          ? new Date(attrs.last_analysis_date * 1000)
          : null,
      };
    } catch {
      return { status: 'error', message: 'không gọi được' };
    }
  }

  private describeVt(label: string, r: VtLookup): string {
    if (r.status === 'notfound') return `${label}: chưa có dữ liệu`;
    if (r.status === 'error') return `${label}: lỗi (${r.message})`;
    const sus = r.suspicious > 0 ? `, ${r.suspicious} nghi ngờ` : '';
    const when = r.analyzedAt ? ` · phân tích ${formatDate(r.analyzedAt)}` : '';
    return `${label} ${r.malicious}/${r.total} engine gắn cờ${sus}${when}`;
  }

  // VirusTotal lưu danh tiếng URL và tên miền RIÊNG RẼ (1 URL có thể bị gắn cờ
  // trong khi tên miền vẫn 0) -> tra cả hai, lấy kết quả xấu hơn.
  private async checkVirusTotal(
    url: string,
    domain: string,
  ): Promise<ProviderResult> {
    const key = process.env.VIRUSTOTAL_KEY;
    if (!key) return this.notConfigured();

    const [byUrl, byDomain] = await Promise.all([
      this.vtLookup('urls/' + vtUrlId(url), key),
      this.vtLookup('domains/' + encodeURIComponent(domain), key),
    ]);
    const found = [byUrl, byDomain].filter(
      (r): r is VtFound => r.status === 'ok',
    );
    const detail = `VirusTotal: ${this.describeVt('URL', byUrl)} · ${this.describeVt('tên miền', byDomain)}`;

    if (found.length === 0) {
      const bothErrored =
        byUrl.status === 'error' && byDomain.status === 'error';
      return bothErrored
        ? this.failed(detail)
        : { configured: true, ok: false, flagged: false, warn: false, detail };
    }

    const mal = Math.max(...found.map((r) => r.malicious));
    const sus = Math.max(...found.map((r) => r.suspicious));
    // 1 engine lẻ thường là báo nhầm -> chỉ nghi ngờ; từ 2 engine mới coi là độc hại
    const flagged = mal >= VT_DANGER_MIN;
    return {
      configured: true,
      ok: true,
      flagged,
      warn: !flagged && mal + sus > 0,
      detail,
    };
  }

  async checkReputation(
    url: string,
    domain: string,
  ): Promise<ReputationResult> {
    const cacheKey = url.toLowerCase();
    const dkey = domain.toLowerCase();
    const hit = this.cache.get(cacheKey);
    if (hit && Date.now() - hit.at < TTL_MS)
      return { ...hit.result, cached: true };

    const [safeBrowsing, virusTotal] = await Promise.all([
      this.checkSafeBrowsing(url, dkey),
      this.checkVirusTotal(url, dkey),
    ]);

    let level: RepLevel = 'unknown';
    if (safeBrowsing.flagged || virusTotal.flagged) {
      level = 'danger';
    } else if (safeBrowsing.warn || virusTotal.warn) {
      level = 'warn';
    } else if (safeBrowsing.ok || virusTotal.ok) {
      level = 'clean';
    }

    const result: ReputationResult = {
      domain: dkey,
      level,
      safeBrowsing,
      virusTotal,
      cached: false,
    };
    if (safeBrowsing.ok || virusTotal.ok) {
      if (this.cache.size > 5000) this.cache.clear();
      this.cache.set(cacheKey, { at: Date.now(), result });
    }
    return result;
  }
}
