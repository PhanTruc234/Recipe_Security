import { IsString, MaxLength, MinLength } from 'class-validator';

export class LabelDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  label: string;
}
