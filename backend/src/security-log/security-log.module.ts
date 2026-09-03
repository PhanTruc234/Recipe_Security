import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityLogService } from './security-log.service';
import { SecurityLogController } from './security-log.controller';
import { SecurityLog } from './entities/security-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SecurityLog])],
  controllers: [SecurityLogController],
  providers: [SecurityLogService],
  exports: [SecurityLogService],
})
export class SecurityLogModule { }