import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SendContactRequestDto, UpdateContactRequestDto } from './dto/contacts.dto';

@ApiTags('contacts')
@Controller({ path: 'contacts', version: '1' })
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all accepted contacts' })
  @ApiResponse({ status: 200, description: 'List of contacts' })
  async getContacts(@CurrentUser('id') userId: string) {
    return this.contactsService.getContacts(userId);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get pending incoming contact requests' })
  @ApiResponse({ status: 200, description: 'List of pending requests' })
  async getPendingRequests(@CurrentUser('id') userId: string) {
    return this.contactsService.getPendingRequests(userId);
  }

  @Post('requests')
  @ApiOperation({ summary: 'Send a contact request' })
  @ApiResponse({ status: 201, description: 'Contact request sent' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Request already exists' })
  async sendContactRequest(
    @CurrentUser('id') userId: string,
    @Body() dto: SendContactRequestDto,
  ) {
    return this.contactsService.sendContactRequest(userId, dto);
  }

  @Patch('requests/:id')
  @ApiOperation({ summary: 'Accept or reject a contact request' })
  @ApiParam({ name: 'id', description: 'Contact request ID' })
  @ApiResponse({ status: 200, description: 'Request processed' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async respondToRequest(
    @CurrentUser('id') userId: string,
    @Param('id') requestId: string,
    @Body() dto: UpdateContactRequestDto,
  ) {
    return this.contactsService.respondToRequest(userId, requestId, dto);
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Remove a contact' })
  @ApiParam({ name: 'userId', description: 'Contact user ID to remove' })
  @ApiResponse({ status: 200, description: 'Contact removed' })
  @ApiResponse({ status: 404, description: 'Contact not found' })
  async removeContact(@CurrentUser('id') userId: string, @Param('userId') contactUserId: string) {
    return this.contactsService.removeContact(userId, contactUserId);
  }
}