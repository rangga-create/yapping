import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { InvitesService } from './invites.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CreateInviteDto } from './dto/invites.dto';

@ApiTags('invites')
@Controller({ path: 'groups/:groupId/invites', version: '1' })
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an invite link (admin only)' })
  @ApiResponse({ status: 201, description: 'Invite created' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async createInvite(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Body() dto: CreateInviteDto,
  ) {
    return this.invitesService.createInvite(userId, groupId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all invite links for group (admin only)' })
  @ApiResponse({ status: 200, description: 'List of invites' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async getInvites(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.invitesService.getInvites(userId, groupId);
  }

  @Delete(':inviteId')
  @ApiOperation({ summary: 'Revoke an invite link (admin only)' })
  @ApiParam({ name: 'inviteId', description: 'Invite ID' })
  @ApiResponse({ status: 200, description: 'Invite revoked' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 404, description: 'Invite not found' })
  async revokeInvite(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.invitesService.revokeInvite(userId, groupId, inviteId);
  }
}

// Public invite preview and join endpoints
@Controller({ path: 'invites', version: '1' })
export class PublicInvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Get(':code')
  @Public()
  @ApiOperation({ summary: 'Preview an invite link (public)' })
  @ApiParam({ name: 'code', description: 'Invite code' })
  @ApiResponse({ status: 200, description: 'Invite preview' })
  @ApiResponse({ status: 404, description: 'Invalid invite' })
  async previewInvite(@Param('code') code: string) {
    return this.invitesService.previewInvite(code);
  }

  @Post(':code/join')
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join group via invite link' })
  @ApiParam({ name: 'code', description: 'Invite code' })
  @ApiResponse({ status: 200, description: 'Joined group' })
  @ApiResponse({ status: 400, description: 'Invalid or expired invite' })
  @ApiResponse({ status: 409, description: 'Already a member' })
  async joinViaInvite(
    @CurrentUser('id') userId: string,
    @Param('code') code: string,
  ) {
    return this.invitesService.joinViaInvite(userId, code);
  }
}