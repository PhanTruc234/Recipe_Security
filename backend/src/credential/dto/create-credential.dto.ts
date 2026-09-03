import { IsBase64, IsString, MaxLength } from 'class-validator';

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