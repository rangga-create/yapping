import { IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export const UserRole = { ADMIN: 'ADMIN', MEMBER: 'MEMBER' } as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

export class CreateGroupDto {
  @ApiProperty({ example: 'Project Team' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Collaboration for our project' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: ['user-id-1', 'user-id-2'] })
  @IsOptional()
  @IsString({ each: true })
  memberIds?: string[];
}

export class UpdateGroupDto {
  @ApiPropertyOptional({ example: 'Updated Group Name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;
}

export class AddMemberDto {
  @ApiProperty({ example: 'user-id' })
  @IsString()
  userId: string;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ['ADMIN', 'MEMBER'] })
  @IsEnum(UserRole)
  role: UserRole;
}

export class GroupResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string | null;

  @ApiProperty()
  avatarUrl: string | null;

  @ApiProperty()
  createdById: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  @ApiProperty()
  memberCount: number;

  @ApiProperty()
  currentUserRole: UserRole | null;
}

export class GroupMemberResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };

  @ApiProperty({ enum: ['ADMIN', 'MEMBER'] })
  role: UserRole;

  @ApiProperty()
  joinedAt: string;
}

export class GroupWithMembersDto extends GroupResponseDto {
  @ApiProperty({ type: [GroupMemberResponseDto] })
  members: GroupMemberResponseDto[];
}