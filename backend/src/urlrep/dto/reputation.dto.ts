import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class ReputationDto {
    @IsString()
    @MaxLength(2048)
    @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
    url: string;

    // Client cũ gửi kèm `domain`; CHẤP NHẬN cho qua validation nhưng BỎ QUA nó —
    // controller tự trích domain từ url (an toàn hơn, chống lệch domain/url).
    @IsOptional()
    @IsString()
    @MaxLength(253)
    domain?: string;
}