import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../auth/entities/auth.entity';
import { Credential } from '../credential/entities/credential.entity';
import { SecurityLog } from '../security-log/entities/security-log.entity';
import { SecurityLogModule } from '../security-log/security-log.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Credential, SecurityLog]),
        SecurityLogModule,
    ],
    controllers: [AdminController],
    providers: [AdminService],
})
export class AdminModule { }