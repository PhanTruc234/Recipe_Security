import { Injectable } from '@nestjs/common';

interface Attempt {
  fails: number;
  lockedUntil: number;
  lastFailAt: number;
}

const MAX_FAILS = 5;
const LOCK_MS = 2 * 60 * 1000; // khóa 2 phút
const WINDOW_MS = 2 * 60 * 1000; // cửa sổ đếm 5 lần sai

// Khóa đăng nhập theo tài khoản: sai >= 5 lần trong cửa sổ -> khóa 2 phút.
// Trong lúc khóa, MỌI lần thử (kể cả mật khẩu đúng) đều bị chặn ở server.
// LƯU Ý: lưu trong RAM -> reset khi service khởi động lại và không chia sẻ giữa
// nhiều instance. Đủ cho demo; production nên chuyển sang Redis/DB.
@Injectable()
export class LoginThrottleService {
  private readonly attempts = new Map<string, Attempt>();

  // Số giây còn bị khóa (0 nếu không khóa).
  lockedSeconds(key: string): number {
    const a = this.attempts.get(key);
    if (!a || a.lockedUntil <= Date.now()) {
      return 0;
    }
    return Math.ceil((a.lockedUntil - Date.now()) / 1000);
  }

  recordFailure(key: string): void {
    const now = Date.now();
    const a = this.attempts.get(key) ?? {
      fails: 0,
      lockedUntil: 0,
      lastFailAt: 0,
    };
    // Lần sai trước đã quá cửa sổ -> bắt đầu đếm lại
    if (now - a.lastFailAt > WINDOW_MS) {
      a.fails = 0;
    }
    a.fails += 1;
    a.lastFailAt = now;
    if (a.fails >= MAX_FAILS) {
      a.lockedUntil = now + LOCK_MS;
      a.fails = 0;
    }
    this.attempts.set(key, a);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}
