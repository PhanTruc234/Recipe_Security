import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthLockout } from './entities/auth-lockout.entity';

const MAX_FAILS = 5;
const LOCK_MS = 2 * 60 * 1000; // khóa 2 phút
const WINDOW_MS = 2 * 60 * 1000; // cửa sổ đếm 5 lần sai

// Khóa đăng nhập / 2FA theo "key" (email hoặc 2fa:userId): sai >= 5 lần trong
// cửa sổ -> khóa 2 phút. Lưu trong DB nên sống qua F5, qua restart server, và
// không bypass được bằng đổi IP (vì khóa theo tài khoản). Trong lúc khóa MỌI
// lần thử (kể cả mật khẩu/mã đúng) đều bị chặn ở server.
@Injectable()
export class LoginThrottleService {
  constructor(
    @InjectRepository(AuthLockout)
    private readonly repo: Repository<AuthLockout>,
  ) {}

  // Số giây còn bị khóa (0 nếu không khóa).
  async lockedSeconds(key: string): Promise<number> {
    const a = await this.repo.findOne({ where: { key } });
    if (!a || !a.lockedUntil || a.lockedUntil.getTime() <= Date.now()) {
      return 0;
    }
    return Math.ceil((a.lockedUntil.getTime() - Date.now()) / 1000);
  }

  async recordFailure(key: string): Promise<void> {
    const now = Date.now();
    const a =
      (await this.repo.findOne({ where: { key } })) ??
      this.repo.create({ key, fails: 0, lockedUntil: null, lastFailAt: null });

    // Lần sai trước đã quá cửa sổ -> bắt đầu đếm lại
    if (a.lastFailAt && now - a.lastFailAt.getTime() > WINDOW_MS) {
      a.fails = 0;
    }
    a.fails += 1;
    a.lastFailAt = new Date(now);
    if (a.fails >= MAX_FAILS) {
      a.lockedUntil = new Date(now + LOCK_MS);
      a.fails = 0;
    }
    await this.repo.save(a);
  }

  async reset(key: string): Promise<void> {
    await this.repo.delete({ key });
  }
}
