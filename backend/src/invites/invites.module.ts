import { Module } from '@nestjs/common';
import { InvitesController, PublicInvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  controllers: [InvitesController, PublicInvitesController],
  providers: [InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}