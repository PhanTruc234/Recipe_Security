import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SearchDto {
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @IsNotEmpty({ message: 'Cần nhập tên món ăn' })
    @MaxLength(80, { message: 'Từ khóa quá dài' })
    query: string;
}