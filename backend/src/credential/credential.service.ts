import { ForbiddenException, Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Credential } from './entities/credential.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateCredentialDto } from './dto/create-credential.dto';

@Injectable()
export class CredentialService {
  constructor(
    @InjectRepository(Credential)
    private readonly credentialRepo: Repository<Credential>) { }
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
      order: { updatedAt: "DESC" },
      select: {
        id: true,
        ciphertext: true,
        iv: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }
  async create(userId: string, dto: CreateCredentialDto) {
    const item = this.credentialRepo.create({ userId, ...dto });
    const saved = await this.credentialRepo.save(item);
    return {
      id: saved.id,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt
    };
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
