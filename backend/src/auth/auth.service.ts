import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { createHmac } from 'crypto';
import { User } from './entities/auth.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TotpService } from './totp.service';
import { CryptoService } from './crypto.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly totp: TotpService,
    private readonly crypto: CryptoService,
    // eslint-disable-next-line prettier/prettier
  ) { }
  private sessionResult(user: User) {
    return {
      id: user.id,
      role: user.role,
      verifier: user.verifier,
      kdfSalt: user.kdfSalt,
    };
  }
  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();

    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email đã được đăng ký');
    }

    const user = this.userRepo.create({
      name: dto.name.trim(),
      email,
      authHash: await bcrypt.hash(dto.authHash, 12),
      kdfSalt: dto.kdfSalt,
      verifier: dto.verifier,
      role: 'user',
    });
    await this.userRepo.save(user);
    return this.sessionResult(user);
  }
  async login(dto: LoginDto) {
    const email = dto.email.toLowerCase();
    const user = await this.userRepo.findOne({ where: { email } });

    const valid = user && (await bcrypt.compare(dto.authHash, user.authHash));
    if (!user || !valid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    return { ...this.sessionResult(user), totpEnabled: user.totpEnabled };
  }

  async getKdfParams(email: string) {
    const norm = email.toLowerCase();
    const user = await this.userRepo.findOne({ where: { email: norm } });
    if (user) {
      return { kdfSalt: user.kdfSalt };
    }
    const fake = createHmac('sha256', process.env.SESSION_SECRET ?? '')
      .update('kdf-salt:' + norm)
      .digest()
      .subarray(0, 16)
      .toString('base64');
    return { kdfSalt: fake };
  }

  findById(id: string) {
    return this.userRepo.findOne({ where: { id } });
  }

  // Step-up khi chưa bật 2FA: so authHash dẫn xuất lại với bản bcrypt đã lưu
  verifyAuthHash(user: User, authHash: string): Promise<boolean> {
    if (!authHash || authHash.length > 128) return Promise.resolve(false);
    return bcrypt.compare(authHash, user.authHash);
  }

  async enableTotp(
    userId: string,
    secret: string,
    step: number,
  ): Promise<string[]> {
    const codes = this.totp.generateBackupCodes(8);
    await this.userRepo.update(userId, {
      totpSecret: this.crypto.encryptServer(secret),
      totpEnabled: true,
      totpLastStep: step, // mã vừa dùng để bật cũng không được dùng lại
      backupCodes: JSON.stringify(this.totp.hashCodes(codes)),
    });
    return codes;
  }

  async verifyTwoFactor(userId: string, code: string) {
    const user = await this.findById(userId);
    if (!user || !user.totpEnabled || !user.totpSecret) return null;

    let ok = false;
    const step = await this.totp.verifyStep(
      code,
      this.crypto.decryptServer(user.totpSecret),
      user.totpLastStep,
    );
    if (step !== null) {
      // Ghi có điều kiện: 2 request song song cùng mã -> chỉ 1 cái cập nhật được
      const r = await this.userRepo
        .createQueryBuilder()
        .update(User)
        .set({ totpLastStep: step })
        .where('id = :id', { id: userId })
        .andWhere('("totpLastStep" IS NULL OR "totpLastStep" < :step)', {
          step,
        })
        .execute();
      ok = (r.affected ?? 0) === 1;
    }

    if (!ok && user.backupCodes) {
      const rest = this.totp.matchAndConsume(
        code,
        JSON.parse(user.backupCodes) as string[],
      );
      if (rest) {
        // Chỉ thắng nếu danh sách chưa bị request khác tiêu thụ trước
        const r = await this.userRepo
          .createQueryBuilder()
          .update(User)
          .set({ backupCodes: JSON.stringify(rest) })
          .where('id = :id', { id: userId })
          .andWhere('"backupCodes" = :old', { old: user.backupCodes })
          .execute();
        ok = (r.affected ?? 0) === 1;
      }
    }

    if (!ok) return null;

    return {
      role: user.role,
      verifier: user.verifier,
      kdfSalt: user.kdfSalt,
    };
  }
  async disableTotp(userId: string): Promise<void> {
    await this.userRepo.update(userId, {
      totpEnabled: false,
      totpSecret: null,
      totpLastStep: null,
      backupCodes: null,
    });
  }
}
