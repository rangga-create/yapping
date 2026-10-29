import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { SendContactRequestDto, UpdateContactRequestDto } from './dto/contacts.dto';

type ContactStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
interface ContactRecord {
  id: string;
  requesterId: string;
  recipientId: string;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ContactsService {
  constructor(private readonly firebase: FirebaseService) {}

  async sendContactRequest(currentUserId: string, dto: SendContactRequestDto) {
    const username = dto.username.toLowerCase().trim().replace(/^@/, '');
    if (!username) throw new BadRequestException('Username is required');

    const usernameSnapshot = await this.firebase.db.collection('usernames').doc(username).get();
    const recipientId = usernameSnapshot.data()?.uid as string | undefined;
    if (!recipientId) throw new NotFoundException('User not found');
    if (recipientId === currentUserId) throw new BadRequestException('Cannot send contact request to yourself');

    const contacts = this.firebase.db.collection('contacts');
    const forwardId = `${currentUserId}__${recipientId}`;
    const reverseId = `${recipientId}__${currentUserId}`;
    const forwardRef = contacts.doc(forwardId);
    const reverseRef = contacts.doc(reverseId);

    return this.firebase.db.runTransaction(async (transaction) => {
      const [forward, reverse] = await Promise.all([
        transaction.get(forwardRef),
        transaction.get(reverseRef),
      ]);
      const existing = forward.exists ? forward : reverse.exists ? reverse : null;
      if (existing) {
        const status = existing.data()?.status;
        if (status === 'PENDING') throw new ConflictException('Contact request already pending');
        if (status === 'ACCEPTED') throw new ConflictException('Already contacts');
        transaction.delete(existing.ref);
      }

      const now = new Date().toISOString();
      const record: ContactRecord = {
        id: forwardId,
        requesterId: currentUserId,
        recipientId,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      };
      transaction.set(forwardRef, record);
      return this.formatContact(record);
    });
  }

  async getContacts(currentUserId: string) {
    const contacts = this.firebase.db.collection('contacts');
    const [requested, received] = await Promise.all([
      contacts.where('requesterId', '==', currentUserId).where('status', '==', 'ACCEPTED').get(),
      contacts.where('recipientId', '==', currentUserId).where('status', '==', 'ACCEPTED').get(),
    ]);

    return Promise.all([...requested.docs, ...received.docs]
      .sort((a, b) => String(b.data().updatedAt).localeCompare(String(a.data().updatedAt)))
      .map(async (snapshot) => this.formatContact(snapshot.data() as ContactRecord)));
  }

  async getPendingRequests(currentUserId: string) {
    const requests = await this.firebase.db.collection('contacts')
      .where('recipientId', '==', currentUserId)
      .where('status', '==', 'PENDING')
      .get();

    return Promise.all(requests.docs.map(async (snapshot) => {
      const request = snapshot.data() as ContactRecord;
      const requester = await this.getPublicUser(request.requesterId);
      return {
        id: request.id,
        requester,
        status: request.status,
        createdAt: request.createdAt,
      };
    }));
  }

  async respondToRequest(currentUserId: string, requestId: string, dto: UpdateContactRequestDto) {
    const requestRef = this.firebase.db.collection('contacts').doc(requestId);
    const result = await this.firebase.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(requestRef);
      if (!snapshot.exists) throw new NotFoundException('Contact request not found');
      const request = snapshot.data() as ContactRecord;
      if (request.recipientId !== currentUserId) throw new BadRequestException('Not authorized to respond to this request');
      if (request.status !== 'PENDING') throw new BadRequestException('Request already processed');

      if (dto.status === 'REJECTED') {
        transaction.delete(requestRef);
        return null;
      }

      const updated = { ...request, status: 'ACCEPTED' as const, updatedAt: new Date().toISOString() };
      transaction.update(requestRef, { status: updated.status, updatedAt: updated.updatedAt });
      return updated;
    });

    return result ? this.formatContact(result) : { message: 'Contact request rejected' };
  }

  async removeContact(currentUserId: string, contactUserId: string) {
    const contactRefs = [
      this.firebase.db.collection('contacts').doc(`${currentUserId}__${contactUserId}`),
      this.firebase.db.collection('contacts').doc(`${contactUserId}__${currentUserId}`),
    ];
    const [forward, reverse] = await Promise.all(contactRefs.map((ref) => ref.get()));
    const existing = forward.exists ? forward : reverse.exists ? reverse : null;
    if (!existing || existing.data()?.status !== 'ACCEPTED') throw new NotFoundException('Contact not found');
    await existing.ref.delete();
    return { message: 'Contact removed' };
  }

  private async formatContact(contact: ContactRecord) {
    const [requester, recipient] = await Promise.all([
      this.getPublicUser(contact.requesterId),
      this.getPublicUser(contact.recipientId),
    ]);
    return {
      id: contact.id,
      requester,
      recipient,
      status: contact.status,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  }

  private async getPublicUser(userId: string) {
    const snapshot = await this.firebase.db.collection('users').doc(userId).get();
    if (!snapshot.exists) throw new NotFoundException('User not found');
    const user = snapshot.data()!;
    return {
      id: snapshot.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
    };
  }
}
