import { IsBase64, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateCredentialDto {
  @IsString()
  @IsBase64()
  @MaxLength(16384)
  ciphertext: string;

  @IsString()
  @IsBase64()
  @MaxLength(32)
  iv: string;
}

export class NewCredentialDto extends CreateCredentialDto {
  // Client tự sinh id để mã hóa với AAD gắn id ngay từ đầu
  @IsUUID('4')
  id: string;
}
