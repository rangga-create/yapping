import { IsString, IsOptional, IsInt, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInviteDto {
  @ApiPropertyOptional({ example: 3600, description: 'Expiration in seconds (default: 24h)' })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(2592000) // 30 days
  expiresIn?: number = 86400;

  @ApiPropertyOptional({ example: 10, description: 'Max uses (default: unlimited)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  maxUses?: number;
}

export class InviteResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  groupId: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  inviteUrl: string;

  @ApiProperty()
  expiresAt: Date | null;

  @ApiProperty()
  maxUses: number | null;

  @ApiProperty()
  useCount: number;

  @ApiProperty()
  createdAt: Date;
}

export class InvitePreviewDto {
  @ApiProperty()
  group: {
    id: string;
    name: string;
    description: string | null;
    avatarUrl: string | null;
    memberCount: number;
  };

  @ApiProperty()
  invite: {
    id: string;
    code: string;
    expiresAt: Date | null;
    maxUses: number | null;
    useCount: number;
    valid: boolean;
  };
}