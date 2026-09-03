import { PartialType } from '@nestjs/mapped-types';
import { CreateSecurityLogDto } from './create-security-log.dto';

export class UpdateSecurityLogDto extends PartialType(CreateSecurityLogDto) {}
