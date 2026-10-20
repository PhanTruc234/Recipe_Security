import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { Credential } from './entities/credential.entity';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CreateCredentialDto,
  NewCredentialDto,
} from './dto/create-credential.dto';

@Injectable()
export class CredentialService {
  constructor(
    @InjectRepository(Credential)
    private readonly credentialRepo: Repository<Credential>,
  ) {}
  private async findOwned(id: string, userId: string): Promise<Credential> {
    const item = await this.credentialRepo.findOne({ where: { id } });
    if (!item || item.userId !== userId) {
      throw new ForbiddenException('Mục không thuộc về bạn');
    }
    return item;
  }
  async listByUser(userId: string) {
    return await this.credentialRepo.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
      select: {
        id: true,
        ciphertext: true,
        iv: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
  async create(userId: string, dto: NewCredentialDto) {
    try {
      // insert() luôn là INSERT: trùng id -> lỗi, KHÔNG bao giờ ghi đè
      // (save() sẽ UPDATE nếu id đã tồn tại)
      const r = await this.credentialRepo.insert({
        id: dto.id,
        userId,
        ciphertext: dto.ciphertext,
        iv: dto.iv,
      });
      const g = (r.generatedMaps[0] ?? {}) as Partial<Credential>;
      return { id: dto.id, createdAt: g.createdAt, updatedAt: g.updatedAt };
    } catch (e) {
      if (
        e instanceof QueryFailedError &&
        (e.driverError as { code?: string } | undefined)?.code === '23505'
      ) {
        throw new ConflictException('Mục đã tồn tại');
      }
      throw e;
    }
  }
  async update(id: string, userId: string, dto: CreateCredentialDto) {
    const item = await this.findOwned(id, userId);
    item.ciphertext = dto.ciphertext;
    item.iv = dto.iv;
    const saved = await this.credentialRepo.save(item);
    return { id: saved.id, updatedAt: saved.updatedAt };
  }

  async remove(id: string, userId: string) {
    await this.findOwned(id, userId);
    await this.credentialRepo.delete(id);
    return { ok: true };
  }
}
