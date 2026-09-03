import { Controller, Get, Post, Body, Patch, Param, Delete, Session, UseGuards, ParseUUIDPipe, Put, Ip, Headers } from '@nestjs/common';
import { CredentialService } from './credential.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
import { SessionData } from 'express-session';
import { SessionAuthGuard } from 'src/auth/guards/session-auth.guard';
import { VaultGuard } from 'src/auth/guards/vault.guard';
import { StepUpGuard } from 'src/auth/guards/step-up.guard';
import { SecurityLogService } from 'src/security-log/security-log.service';


@UseGuards(VaultGuard)
@Controller('credentials')
export class CredentialController {
  constructor(private readonly credentialService: CredentialService,
    private readonly securityLog: SecurityLogService,
  ) { }

  @Get()
  async list(@Session() session: SessionData) {
    const credentials = await this.credentialService.listByUser(session.userId!);
    return { credentials };
  }

  @Post()
  async create(
    @Session() session: SessionData,
    @Body() dto: CreateCredentialDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.credentialService.create(session.userId!, dto);
    await this.securityLog.record({
      event: 'credential_created', userId: session.userId, ip, userAgent,
      context: { credentialId: result.id },
    });
    return result;
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Session() session: SessionData,
    @Body() dto: CreateCredentialDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.credentialService.update(id, session.userId!, dto);
    await this.securityLog.record({
      event: 'credential_updated', userId: session.userId, ip, userAgent,
      context: { credentialId: id },
    });
    return result;
  }

  @UseGuards(StepUpGuard)
  @Delete(':id')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Session() session: SessionData,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const result = await this.credentialService.remove(id, session.userId!);
    await this.securityLog.record({
      event: 'credential_deleted', userId: session.userId, ip, userAgent,
      context: { credentialId: id },
    });
    return result;
  }
}
