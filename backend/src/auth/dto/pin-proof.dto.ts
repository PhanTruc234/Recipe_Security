import { IsBase64, IsString, Length } from 'class-validator';

export class PinProofDto {
  // HKDF(PBKDF2(PIN)) 32 byte -> base64 44 ký tự; PIN không bao giờ gửi lên
  @IsString()
  @IsBase64()
  @Length(44, 44)
  proof: string;
}
