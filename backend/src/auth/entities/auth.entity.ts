import { Credential } from '../../credential/entities/credential.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  authHash: string;

  @Column()
  kdfSalt: string;

  @Column()
  verifier: string;

  @Column({ default: 'user' })
  role: string;

  @Column({ type: 'text', nullable: true })
  totpSecret: string | null;

  @Column({ default: false })
  totpEnabled: boolean;

  // time-step TOTP đã dùng gần nhất (chống replay); ~5.9e7 nên integer đủ tới năm ~4000
  @Column({ type: 'integer', nullable: true })
  totpLastStep: number | null;

  @Column({ type: 'text', nullable: true })
  backupCodes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Credential, (credential) => credential.user)
  credentials: Credential[];
}
