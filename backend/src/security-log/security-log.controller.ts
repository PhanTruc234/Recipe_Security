import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SecurityLogService } from './security-log.service';
import { CreateSecurityLogDto } from './dto/create-security-log.dto';
import { UpdateSecurityLogDto } from './dto/update-security-log.dto';

@Controller('security-log')
export class SecurityLogController {
  constructor(private readonly securityLogService: SecurityLogService) { }

}
