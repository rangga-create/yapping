import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SendMessageDto, EditMessageDto, MessageQueryDto, PinMessageDto } from './dto/messages.dto';

@ApiTags('messages')
@Controller({ path: 'groups/:groupId/messages', version: '1' })
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({ summary: 'Get group messages with pagination' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of messages (max 100)' })
  @ApiQuery({ name: 'before', required: false, type: String, description: 'ISO date string for cursor pagination' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search term' })
  @ApiResponse({ status: 200, description: 'Messages retrieved' })
  @ApiResponse({ status: 403, description: 'Not a member of this group' })
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Query() query: MessageQueryDto,
  ) {
    return this.messagesService.getMessages(userId, groupId, query);
  }

  @Get('pinned')
  @ApiOperation({ summary: 'Get pinned messages' })
  @ApiResponse({ status: 200, description: 'Pinned messages' })
  @ApiResponse({ status: 403, description: 'Not a member of this group' })
  async getPinnedMessages(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.messagesService.getPinnedMessages(userId, groupId);
  }

  @Post()
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiResponse({ status: 403, description: 'Not a member of this group' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.messagesService.sendMessage(userId, groupId, dto);
  }

  @Patch(':messageId')
  @ApiOperation({ summary: 'Edit a message' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message updated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async editMessage(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Param('messageId') messageId: string,
    @Body() dto: EditMessageDto,
  ) {
    return this.messagesService.editMessage(userId, groupId, messageId, dto);
  }

  @Delete(':messageId')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message deleted' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async deleteMessage(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.messagesService.deleteMessage(userId, groupId, messageId);
  }

  @Patch(':messageId/pin')
  @ApiOperation({ summary: 'Pin or unpin a message (admin only)' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message pin status updated' })
  @ApiResponse({ status: 403, description: 'Not authorized (admin only)' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async pinMessage(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Param('messageId') messageId: string,
    @Body() dto: PinMessageDto,
  ) {
    return this.messagesService.pinMessage(userId, groupId, messageId, dto);
  }
}