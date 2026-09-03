import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/auth.entity';

@Entity('security_logs')
export class SecurityLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', nullable: true })
    userId: string | null;

    @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'userId' })
    user: User | null;

    @Column()
    event: string;

    @Column({ type: 'text', nullable: true })
    ipAddress: string | null;

    @Column({ type: 'text', nullable: true })
    userAgent: string | null;

    @Column({ type: 'jsonb', nullable: true })
    context: Record<string, any> | null;

    @Column({ type: 'text', nullable: true })
    prevHash: string | null;

    @Column({ type: 'text', nullable: true })
    hash: string | null;

    @CreateDateColumn()
    createdAt: Date;
}