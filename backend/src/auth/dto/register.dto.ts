import { IsEmail, IsInt, IsString, Min, MinLength } from 'class-validator';

export class RegisterDto {
    @IsString()
    @MinLength(1)
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    authHash: string;

    @IsString()
    kdfSalt: string;

    @IsInt()
    @Min(1)
    kdfIterations: number;

    @IsString()
    verifier: string;
}