import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminGuard } from 'src/auth/guards/admin.guard';

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get()
    dashboard() {
        return this.adminService.dashboard();
    }

    @Get('log-integrity')
    logIntegrity() {
        return this.adminService.verifyLogIntegrity();
    }

    @Get('ciphertext')
    async ciphertext() {
        const samples = await this.adminService.ciphertextSamples(10);
        return { samples };
    }
}