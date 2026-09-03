import { Module } from '@nestjs/common';
import { UrlrepService } from './urlrep.service';
import { UrlrepController } from './urlrep.controller';
import { SecurityLogModule } from '../security-log/security-log.module';

@Module({
  imports: [SecurityLogModule],
  controllers: [UrlrepController],
  providers: [UrlrepService],
})
export class UrlrepModule { }