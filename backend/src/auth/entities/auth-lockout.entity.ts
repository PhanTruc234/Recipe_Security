import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

// Khóa đăng nhập / 2FA lưu trong DB -> sống qua F5, qua restart server, và
// khóa theo "key" (email hoặc 2fa:userId) nên đổi IP cũng không bypass được.
@Entity('auth_lockouts')
export class AuthLockout {
  @PrimaryColumn()
  key: string;

  @Column({ type: 'int', default: 0 })
  fails: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastFailAt: Date | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
