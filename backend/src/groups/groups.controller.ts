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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateGroupDto, UpdateGroupDto, AddMemberDto, UpdateMemberRoleDto } from './dto/groups.dto';

@ApiTags('groups')
@Controller({ path: 'groups', version: '1' })
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  async createGroup(@CurrentUser('id') userId: string, @Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all groups for current user' })
  @ApiResponse({ status: 200, description: 'List of groups' })
  async getGroups(@CurrentUser('id') userId: string) {
    return this.groupsService.getGroups(userId);
  }

  @Get(':groupId')
  @ApiOperation({ summary: 'Get group details with members' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'Group details' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 403, description: 'Not a member of this group' })
  async getGroupById(@CurrentUser('id') userId: string, @Param('groupId') groupId: string) {
    return this.groupsService.getGroupById(userId, groupId);
  }

  @Get(':groupId/preview')
  @ApiOperation({ summary: 'Get group preview (for invite flow)' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'Group preview' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  async getGroupPreview(@CurrentUser('id') userId: string, @Param('groupId') groupId: string) {
    return this.groupsService.getGroupForPreview(userId, groupId);
  }

  @Patch(':groupId')
  @ApiOperation({ summary: 'Update group information (admin only)' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'Group updated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async updateGroup(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.updateGroup(userId, groupId, dto);
  }

  @Delete(':groupId')
  @ApiOperation({ summary: 'Delete a group (admin only)' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'Group deleted' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async deleteGroup(@CurrentUser('id') userId: string, @Param('groupId') groupId: string) {
    return this.groupsService.deleteGroup(userId, groupId);
  }

  @Get(':groupId/members')
  @ApiOperation({ summary: 'Get group members' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'List of members' })
  async getMembers(@CurrentUser('id') userId: string, @Param('groupId') groupId: string) {
    return this.groupsService.getMembers(userId, groupId);
  }

  @Post(':groupId/members')
  @ApiOperation({ summary: 'Add a member to group (admin only)' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'Member added' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  @ApiResponse({ status: 409, description: 'Already a member' })
  async addMember(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.groupsService.addMember(userId, groupId, dto);
  }

  @Delete(':groupId/members/:userId')
  @ApiOperation({ summary: 'Remove a member from group' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiParam({ name: 'userId', description: 'User ID to remove' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async removeMember(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.groupsService.removeMember(userId, groupId, targetUserId);
  }

  @Patch(':groupId/members/:userId/role')
  @ApiOperation({ summary: 'Update member role (admin only)' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiParam({ name: 'userId', description: 'User ID to update' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 403, description: 'Not authorized' })
  async updateMemberRole(
    @CurrentUser('id') userId: string,
    @Param('groupId') groupId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.groupsService.updateMemberRole(userId, groupId, targetUserId, dto);
  }

  @Post(':groupId/leave')
  @ApiOperation({ summary: 'Leave a group' })
  @ApiParam({ name: 'groupId', description: 'Group ID' })
  @ApiResponse({ status: 200, description: 'Left group successfully' })
  @ApiResponse({ status: 400, description: 'Cannot leave as last admin without transfer' })
  async leaveGroup(@CurrentUser('id') userId: string, @Param('groupId') groupId: string) {
    return this.groupsService.leaveGroup(userId, groupId);
  }
}