import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/auth.entity';
import { Credential } from '../credential/entities/credential.entity';
import { SecurityLog } from '../security-log/entities/security-log.entity';
import { SecurityLogService } from '../security-log/security-log.service';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(User) private readonly userRepo: Repository<User>,
        @InjectRepository(Credential) private readonly credentialRepo: Repository<Credential>,
        @InjectRepository(SecurityLog) private readonly securityLogRepo: Repository<SecurityLog>,
        private readonly securityLog: SecurityLogService,
    ) { }

    async dashboard() {
        const [users, admins, credentials, loginFailures, searchBursts] = await Promise.all([
            this.userRepo.count({ where: { role: 'user' } }),
            this.userRepo.count({ where: { role: 'admin' } }),
            this.credentialRepo.count(),
            this.securityLogRepo.count({ where: { event: 'login_failed' } }),
            this.securityLogRepo.count({ where: { event: 'suspicious_search_burst' } }),
        ]);

        const recentUsers = await this.userRepo.find({
            take: 20,
            order: { createdAt: 'DESC' },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });
        const countRows = await this.credentialRepo
            .createQueryBuilder('c')
            .select('c.userId', 'userId')
            .addSelect('COUNT(*)', 'count')
            .groupBy('c.userId')
            .getRawMany<{ userId: string; count: string }>();
        const countMap = new Map(countRows.map((r) => [r.userId, Number(r.count)]));

        const usersWithCount = recentUsers.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt,
            _count: { credentials: countMap.get(u.id) ?? 0 },
        }));
        const logRows = await this.securityLogRepo.find({
            take: 30,
            order: { createdAt: 'DESC' },
            relations: { user: true },
        });
        const logs = logRows.map((l) => ({
            id: l.id,
            event: l.event,
            userId: l.userId,
            ipAddress: l.ipAddress,
            userAgent: l.userAgent,
            context: l.context,
            createdAt: l.createdAt,
            user: l.user ? { email: l.user.email } : null,
        }));
        const eventRows = await this.securityLogRepo
            .createQueryBuilder('s')
            .select('s.event', 'event')
            .addSelect('COUNT(*)', 'total')
            .groupBy('s.event')
            .orderBy('total', 'DESC')
            .limit(10)
            .getRawMany<{ event: string; total: string }>();
        const events = eventRows.map((e) => ({ event: e.event, total: Number(e.total) }));

        return {
            stats: { users, admins, credentials, loginFailures, searchBursts },
            users: usersWithCount,
            logs,
            events,
        };
    }

    verifyLogIntegrity() {
        return this.securityLog.verifyChain();
    }
    async ciphertextSamples(limit = 10) {
        const rows = await this.credentialRepo.find({
            take: limit,
            order: { updatedAt: 'DESC' },
            relations: { user: true },
        });
        return rows.map((r) => ({
            id: r.id,
            owner: r.user?.email ?? null,
            updatedAt: r.updatedAt,
            ciphertext: r.ciphertext,
            iv: r.iv,
        }));
    }
}
