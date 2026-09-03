import { Credential } from "../../credential/entities/credential.entity";
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

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

    @Column({ type: 'int', default: 600000 })
    kdfIterations: number;

    @Column()
    verifier: string;

    @Column({ default: 'user' })
    role: string;

    @Column({ type: 'text', nullable: true })
    totpSecret: string | null;

    @Column({ default: false })
    totpEnabled: boolean;

    @Column({ type: 'text', nullable: true })
    backupCodes: string | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => Credential, (credential) => credential.user)
    credentials: Credential[];
}
