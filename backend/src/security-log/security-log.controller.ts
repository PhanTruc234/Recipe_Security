import { Controller } from '@nestjs/common';
import { SecurityLogService } from './security-log.service';

@Controller('security-log')
export class SecurityLogController {
  constructor(private readonly securityLogService: SecurityLogService) {}
}
