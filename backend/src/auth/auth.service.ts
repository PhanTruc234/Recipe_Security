import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
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
  ) { }
  private sessionResult(user: User) {
    return {
      id: user.id,
      role: user.role,
      verifier: user.verifier,
      kdfSalt: user.kdfSalt,
      kdfIterations: user.kdfIterations,
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
      kdfIterations: dto.kdfIterations,
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
      return { kdfSalt: user.kdfSalt, kdfIterations: user.kdfIterations };
    }
    const fake = createHmac('sha256', process.env.SESSION_SECRET ?? '')
      .update('kdf-salt:' + norm)
      .digest()
      .subarray(0, 16)
      .toString('base64');
    return { kdfSalt: fake, kdfIterations: 600000 };
  }

  findById(id: string) {
    return this.userRepo.findOne({ where: { id } });
  }

  async enableTotp(userId: string, secret: string): Promise<string[]> {
    const codes = this.totp.generateBackupCodes(8);
    await this.userRepo.update(userId, {
      totpSecret: this.crypto.encryptServer(secret),
      totpEnabled: true,
      backupCodes: JSON.stringify(this.totp.hashCodes(codes)),
    });
    return codes;
  }

  async verifyTwoFactor(userId: string, code: string) {
    const user = await this.findById(userId);
    if (!user || !user.totpEnabled || !user.totpSecret) return null;
    let ok = await this.totp.verify(code, this.crypto.decryptServer(user.totpSecret));
    if (!ok && user.backupCodes) {
      const rest = this.totp.matchAndConsume(code, JSON.parse(user.backupCodes));
      if (rest) {
        ok = true;
        await this.userRepo.update(userId, { backupCodes: JSON.stringify(rest) });
      }
    }

    if (!ok) return null;

    return {
      role: user.role,
      verifier: user.verifier,
      kdfSalt: user.kdfSalt,
      kdfIterations: user.kdfIterations,
    };
  }
  async disableTotp(userId: string): Promise<void> {
    await this.userRepo.update(userId, {
      totpEnabled: false,
      totpSecret: null,
      backupCodes: null,
    });
  }
}