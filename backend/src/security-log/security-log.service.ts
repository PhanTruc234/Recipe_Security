import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityLog } from './entities/security-log.entity';
import { createHash, createHmac } from 'crypto';

const GENESIS = process.env.GENESIS
export interface RecordInput {
  event: string;
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  context?: Record<string, any> | null;
}
interface Hashable {
  event: string;
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  context: unknown;
  prevHash: string | null;
}
@Injectable()
export class SecurityLogService {
  private readonly logger = new Logger(SecurityLogService.name);
  private writeChain: Promise<void> = Promise.resolve();

  constructor(
    @InjectRepository(SecurityLog)
    private readonly repo: Repository<SecurityLog>,
  ) { }
  private auditKey(): Buffer {
    return createHash('sha256').update(process.env.AUDIT_LOG_KEY).digest()
  }
  private stableStringify(v: unknown): string {
    if (v === null || typeof v !== 'object') {
      return JSON.stringify(v);
    }
    if (Array.isArray(v)) {
      return '[' + v.map((x) => this.stableStringify(x)).join(',') + ']';
    }
    const obj = v as Record<string, unknown>;
    return '{' + Object.keys(obj).sort()
      .map((k) => JSON.stringify(k) + ':' + this.stableStringify(obj[k]))
      .join(',') + '}';
  }
  private computeHash(e: Hashable) {
    const content = this.stableStringify({
      event: e.event,
      userId: e.userId,
      ipAddress: e.ipAddress,
      userAgent: e.userAgent,
      context: e.context ?? null,
      prevHash: e.prevHash,
    });
    return createHmac('sha256', this.auditKey()).update(content).digest('hex')
  }
  async record(input: RecordInput): Promise<void> {
    const task = this.writeChain.then(async () => {
      try {
        const [last] = await this.repo.find({ order: { createdAt: 'DESC' }, take: 1 });
        const prevHash = last?.hash ?? GENESIS;

        const fields: Hashable = {
          event: input.event,
          userId: input.userId ?? null,
          ipAddress: input.ip ?? null,
          userAgent: input.userAgent ?? null,
          context: input.context && Object.keys(input.context).length ? input.context : null,
          prevHash
        };
        const hash = this.computeHash(fields);

        await this.repo.save(
          this.repo.create({
            event: fields.event,
            userId: fields.userId,
            ipAddress: fields.ipAddress,
            userAgent: fields.userAgent,
            context: fields.context as Record<string, any> | null,
            prevHash,
            hash,
          }),
        );
      } catch (err) {
        this.logger.error(`Ghi security log thất bại: ${String(err)}`);
      }
    });
    this.writeChain = task.catch(() => { });
    return task;
  }
  async verifyChain() {
    const rows = await this.repo.find({ order: { createdAt: 'ASC' } });
    const issues: { id: string; type: string; message: string }[] = [];
    let expectedPrev: string | null = GENESIS;

    for (const row of rows) {
      if (!row.hash) {
        issues.push({ id: row.id, type: 'missing_hash', message: `#${row.id} thiếu hash` });
        continue;
      }
      const recomputed = this.computeHash({
        event: row.event,
        userId: row.userId,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        context: row.context ?? null,
        prevHash: row.prevHash,
      });
      if (recomputed !== row.hash) {
        issues.push({ id: row.id, type: 'content_modified', message: `#${row.id} bị sửa nội dung` });
      }
      if (row.prevHash !== expectedPrev) {
        issues.push({ id: row.id, type: 'chain_broken', message: `#${row.id} liên kết chuỗi bị gãy` });
      }
      expectedPrev = row.hash;
    }
    return { ok: issues.length === 0, total: rows.length, issues };
  }
}