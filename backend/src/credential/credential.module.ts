import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CredentialService } from './credential.service';
import { CredentialController } from './credential.controller';
import { Credential } from './entities/credential.entity';
import { AuthModule } from 'src/auth/auth.module';
import { SecurityLogModule } from 'src/security-log/security-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Credential]),
    AuthModule,
    SecurityLogModule
  ],
  controllers: [CredentialController],
  providers: [CredentialService],
})
export class CredentialModule { }