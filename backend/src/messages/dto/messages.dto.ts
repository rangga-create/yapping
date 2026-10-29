import { IsString, MinLength, MaxLength, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'Hello everyone!' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({ example: 'message-id-to-reply-to' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  replyToId?: string;
}

export class EditMessageDto {
  @ApiProperty({ example: 'Updated message content' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}

export class MessageQueryDto {
  @ApiPropertyOptional({ example: '50' })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00.000Z' })
  @IsOptional()
  @IsString()
  before?: string;

  @ApiPropertyOptional({ example: 'search term' })
  @IsOptional()
  @IsString()
  search?: string;
}

export class PinMessageDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isPinned: boolean;
}

export class MessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  groupId: string;

  @ApiProperty()
  sender: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };

  @ApiProperty()
  content: string;

  @ApiProperty()
  replyTo: {
    id: string;
    content: string;
    sender: {
      id: string;
      displayName: string;
    };
  } | null;

  @ApiProperty()
  isPinned: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  mentions: {
    id: string;
    mentionedUser: {
      id: string;
      username: string;
      displayName: string;
    };
  }[];
}

export class PaginatedMessagesResponseDto {
  @ApiProperty({ type: [MessageResponseDto] })
  messages: MessageResponseDto[];

  @ApiProperty()
  hasMore: boolean;

  @ApiProperty()
  nextCursor: string | null;
}