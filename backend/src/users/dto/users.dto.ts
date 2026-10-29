import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchUsersDto {
  @ApiProperty({ example: 'john' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  username: string;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  displayName: string;

  @ApiProperty()
  bio: string | null;

  @ApiProperty()
  avatarUrl: string | null;

  @ApiProperty()
  online: boolean;

  @ApiProperty()
  createdAt: string;
}