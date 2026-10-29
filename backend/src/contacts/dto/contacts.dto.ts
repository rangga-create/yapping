import { IsString, MinLength, MaxLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
type ContactStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export class SendContactRequestDto {
  @ApiProperty({ example: 'jane_doe' })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username: string;
}

export class UpdateContactRequestDto {
  @ApiProperty({ enum: ['ACCEPTED', 'REJECTED'] })
  @IsEnum(['ACCEPTED', 'REJECTED'])
  status: 'ACCEPTED' | 'REJECTED';
}

export class ContactResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  requester: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };

  @ApiProperty()
  recipient: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };

  @ApiProperty({ enum: ['PENDING', 'ACCEPTED', 'REJECTED'] })
  status: ContactStatus;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class ContactRequestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  requester: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };

  @ApiProperty({ enum: ['PENDING', 'ACCEPTED', 'REJECTED'] })
  status: ContactStatus;

  @ApiProperty()
  createdAt: string;
}