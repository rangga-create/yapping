export type GroupRole = "admin" | "member";

export interface User {
  id: string;
  name: string;
  username: string;
  bio: string;
  avatar: string;
  online: boolean;
}

export interface GroupMember {
  userId: string;
  role: GroupRole;
}

export interface Message {
  id: string;
  groupId: string;
  senderId: string;
  text: string;
  time: string;
  reactions: string[];
  pinned?: boolean;
  replyTo?: string;
}

export interface ChatGroup {
  id: string;
  name: string;
  description: string;
  avatar: string;
  members: GroupMember[];
  inviteCode: string;
}

export interface InviteLink {
  id: string;
  groupId: string;
  code: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
}
