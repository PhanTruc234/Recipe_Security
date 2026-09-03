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
  domain: string; level: RepLevel;
  safeBrowsing: ProviderResult;
  virusTotal: ProviderResult;
  cached: boolean;
}

const TTL_MS = 6 * 60 * 60 * 1000;

@Injectable()
export class UrlrepService {
  private cache = new Map<string, { at: number; result: ReputationResult }>();

  private notConfigured(): ProviderResult {
    return {
      configured: false,
      ok: false,
      flagged: false,
      warn: false,
      detail: 'Chưa cấu hình API key'
    };
  }
  private failed(msg: string): ProviderResult {
    return {
      configured: true,
      ok: false,
      flagged: false,
      warn: false,
      detail: msg
    };
  }

  anyProviderConfigured(): boolean {
    return !!(process.env.SAFE_BROWSING_KEY || process.env.VIRUSTOTAL_KEY);
  }

  private async checkSafeBrowsing(url: string, domain: string): Promise<ProviderResult> {
    const key = process.env.SAFE_BROWSING_KEY;
    if (!key) return this.notConfigured();
    try {
      const targets = [...new Set([url, 'http://' + domain + '/', 'https://' + domain + '/'])];
      const res = await fetch(
        'https://safebrowsing.googleapis.com/v4/threatMatches:find?key=' + encodeURIComponent(key),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(5000),
          body: JSON.stringify({
            client: { clientId: 'recipe-security', clientVersion: '1.0' },
            threatInfo: {
              threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
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
        detail: flagged ? 'Google đánh dấu ĐỘC HẠI' : 'Google Safe Browsing: sạch'
      };
    } catch {
      return this.failed('Không gọi được Safe Browsing');
    }
  }

  private async checkVirusTotal(domain: string): Promise<ProviderResult> {
    const key = process.env.VIRUSTOTAL_KEY;
    if (!key) return this.notConfigured();
    try {
      const res = await fetch('https://www.virustotal.com/api/v3/domains/' + encodeURIComponent(domain), {
        headers: { 'x-apikey': key },
        signal: AbortSignal.timeout(5000),
      });
      if (res.status === 404) {
        return {
          configured: true,
          ok: false,
          flagged: false,
          warn: false,
          detail: 'VirusTotal: chưa có dữ liệu'
        };
      }
      if (!res.ok) return this.failed(`VirusTotal lỗi HTTP ${res.status}`);
      const json = (await res.json()) as { data?: { attributes?: { last_analysis_stats?: Record<string, number> } } };
      const stats = json.data?.attributes?.last_analysis_stats ?? {};
      const mal = stats.malicious ?? 0;
      const sus = stats.suspicious ?? 0;
      return {
        configured: true,
        ok: true,
        flagged: mal > 0,
        warn: mal === 0 && sus > 0,
        detail: mal + sus > 0 ? `VirusTotal: ${mal} máy quét báo độc hại, ${sus} nghi ngờ` : 'VirusTotal: sạch',
      };
    } catch {
      return this.failed('Không gọi được VirusTotal');
    }
  }

  async checkReputation(url: string, domain: string): Promise<ReputationResult> {
    const cacheKey = url.toLowerCase();
    const dkey = domain.toLowerCase();
    const hit = this.cache.get(cacheKey);
    if (hit && Date.now() - hit.at < TTL_MS) return { ...hit.result, cached: true };

    const [safeBrowsing, virusTotal] = await Promise.all([
      this.checkSafeBrowsing(url, dkey),
      this.checkVirusTotal(dkey),
    ]);

    let level: RepLevel = 'unknown';
    if (safeBrowsing.flagged || virusTotal.flagged) {
      level = 'danger';
    }
    else if (safeBrowsing.warn || virusTotal.warn) {
      level = 'warn';
    }
    else if (safeBrowsing.ok || virusTotal.ok) {
      level = 'clean';
    }

    const result: ReputationResult = { domain: dkey, level, safeBrowsing, virusTotal, cached: false };
    if (safeBrowsing.ok || virusTotal.ok) {
      if (this.cache.size > 5000) this.cache.clear();
      this.cache.set(cacheKey, { at: Date.now(), result });
    }
    return result;
  }
}