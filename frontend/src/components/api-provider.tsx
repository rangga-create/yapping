"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { updateProfile as updateFirebaseProfile } from "firebase/auth";
import {
  api,
  authApi,
  contactsApi,
  groupsApi,
  invitesApi,
  messagesApi,
} from "@/lib/api";
import { getFirebaseAuth, listenToGroupMessages } from "@/lib/firebase";
import type { ContactRequest } from "@/lib/api/contacts";
import type { Invite } from "@/lib/api/invites";
import type { Message as ApiMessage } from "@/lib/api/messages";
import type { ChatGroup, GroupRole, InviteLink, Message, User } from "@/lib/types";

interface ApiContextValue {
  groups: ChatGroup[];
  invites: InviteLink[];
  messages: Message[];
  users: User[];
  contacts: User[];
  pendingRequests: Array<{ id: string; user: User }>;
  activeGroupId: string;
  profile: User | null;
  authenticated: boolean;
  loading: boolean;
  error: string | null;
  setActiveGroupId: (id: string) => void;
  sendMessage: (text: string, replyTo?: string) => Promise<void>;
  updateMessage: (id: string, text: string) => Promise<void>;
  removeMessage: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  addReaction: (id: string, emoji: string) => void;
  createGroup: (name: string, description: string, memberIds: string[]) => Promise<ChatGroup>;
  updateGroup: (groupId: string, name: string, description: string) => Promise<void>;
  removeGroup: (groupId: string) => Promise<void>;
  addGroupMember: (groupId: string, userId: string) => Promise<void>;
  updateProfile: (name: string, bio: string) => Promise<void>;
  addContact: (username: string) => Promise<void>;
  removeContact: (userId: string) => Promise<void>;
  respondToContactRequest: (requestId: string, accept: boolean) => Promise<void>;
  updateRole: (groupId: string, userId: string, role: GroupRole | null) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  loadInvites: (groupId: string) => Promise<void>;
  createInvite: (groupId: string, expiresIn: number | null, maxUses: number | null) => Promise<void>;
  revokeInvite: (groupId: string, inviteId: string) => Promise<void>;
  useInvite: (code: string) => Promise<string>;
  logout: () => Promise<void>;
}

const ApiContext = createContext<ApiContextValue | null>(null);

function toUser(user: {
  id: string;
  username: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  online?: boolean;
}): User {
  return {
    id: user.id,
    username: user.username,
    name: user.displayName,
    bio: user.bio ?? "",
    avatar: user.avatarUrl ?? user.displayName.slice(0, 2).toUpperCase(),
    online: user.online ?? false,
  };
}

function toGroup(group: Awaited<ReturnType<typeof groupsApi.getAll>>[number]): ChatGroup {
  return {
    id: group.id,
    name: group.name,
    description: group.description ?? "",
    avatar: group.avatarUrl ?? group.name.slice(0, 2).toUpperCase(),
    inviteCode: group.id,
    members: (group.members ?? []).map((member) => ({
      userId: member.user.id,
      role: member.role === "ADMIN" ? "admin" : "member",
    })),
  };
}

function toInvite(invite: Invite): InviteLink {
  return {
    id: invite.id,
    groupId: invite.groupId,
    code: invite.code,
    expiresAt: invite.expiresAt,
    maxUses: invite.maxUses,
    useCount: invite.useCount,
  };
}

function toMessage(message: ApiMessage): Message {
  return {
    id: message.id,
    groupId: message.groupId,
    senderId: message.sender.id,
    text: message.content,
    time: new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    reactions: [],
    pinned: message.isPinned,
    replyTo: message.replyTo?.id,
  };
}

function toContactRequest(request: ContactRequest) {
  return { id: request.id, user: toUser(request.requester) };
}

function mergeUsers(...lists: User[][]): User[] {
  return [...new Map(lists.flat().map((user) => [user.id, user])).values()];
}

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [invites, setInvites] = useState<InviteLink[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Array<{ id: string; user: User }>>([]);
  const [knownUsers, setKnownUsers] = useState<User[]>([]);
  const [profile, setProfile] = useState<User | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const refreshContacts = useCallback(async (currentUserId: string) => {
    const [contactRows, requests] = await Promise.all([
      contactsApi.getContacts(),
      contactsApi.getPendingRequests(),
    ]);
    const accepted = contactRows.map((contact) => {
      const peer = contact.requester.id === currentUserId ? contact.recipient : contact.requester;
      return toUser(peer);
    });
    setContacts(accepted);
    setPendingRequests(requests.map(toContactRequest));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
        if (!firebaseUser) {
          api.clearTokens();
          setAuthenticated(false);
          setProfile(null);
          setGroups([]);
          setContacts([]);
          setPendingRequests([]);
          setMessages([]);
          setKnownUsers([]);
          setLoading(false);
          setInitialized(true);
          return;
        }

        setAuthenticated(true);
        setLoading(true);
        setError(null);
        try {
          api.setAccessToken(await firebaseUser.getIdToken());
          const [profileResult, groupResults, contactResults, requestResults] = await Promise.all([
            authApi.getProfile(),
            groupsApi.getAll(),
            contactsApi.getContacts(),
            contactsApi.getPendingRequests(),
          ]);
          if (cancelled) return;

          const currentUser = toUser(profileResult);
          const groupList = groupResults.map(toGroup);
          const acceptedContacts = contactResults.map((contact) =>
            toUser(contact.requester.id === profileResult.id ? contact.recipient : contact.requester)
          );
          setProfile(currentUser);
          setGroups(groupList);
          setKnownUsers(mergeUsers(...groupResults.map((group) =>
            (group.members ?? []).map((member) => toUser(member.user))
          )));
          setContacts(acceptedContacts);
          setPendingRequests(requestResults.map(toContactRequest));
          setActiveGroupId((current) => groupList.some((group) => group.id === current)
            ? current
            : groupList[0]?.id ?? "");
        } catch (cause) {
          if (cancelled) return;
          setError(cause instanceof Error ? cause.message : "Could not load your account.");
          setProfile(null);
          setGroups([]);
          setContacts([]);
          setPendingRequests([]);
          setMessages([]);
          setKnownUsers([]);
        } finally {
          if (!cancelled) {
            setLoading(false);
            setInitialized(true);
          }
        }
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not initialize Firebase.");
      setLoading(false);
      setInitialized(true);
    }

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!activeGroupId || !profile) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    const unsubscribe = listenToGroupMessages(activeGroupId, (results) => {
      if (!cancelled) setMessages(results.map(toMessage));
    }, (cause) => {
      if (!cancelled) setError(cause.message);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [activeGroupId, profile?.id]);

  useEffect(() => {
    if (!activeGroupId || !api.getAccessToken()) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    messagesApi.getMessages(activeGroupId, { limit: 100 })
      .then((result) => {
        if (!cancelled) setMessages((current) => current.length ? current : result.messages.map(toMessage));
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load messages.");
      });
    return () => {
      cancelled = true;
    };
  }, [activeGroupId, initialized]);

  const refreshGroup = useCallback(async (groupId: string) => {
    const result = await groupsApi.getById(groupId);
    const updated = toGroup(result);
    setKnownUsers((current) => mergeUsers(current, result.members?.map((member) => toUser(member.user)) ?? []));
    setGroups((current) => current.map((group) => group.id === groupId ? updated : group));
    return updated;
  }, []);

  const sendMessage = useCallback(async (text: string, replyTo?: string) => {
    if (!activeGroupId) throw new Error("Choose a group before sending a message.");
    const created = await messagesApi.sendMessage(activeGroupId, {
      content: text,
      ...(replyTo ? { replyToId: replyTo } : {}),
    });
    setMessages((current) => [...current, toMessage(created)]);
  }, [activeGroupId]);

  const updateMessage = useCallback(async (id: string, text: string) => {
    const message = messages.find((item) => item.id === id);
    if (!message) throw new Error("Message not found.");
    const updated = await messagesApi.editMessage(message.groupId, id, { content: text });
    setMessages((current) => current.map((item) => item.id === id ? toMessage(updated) : item));
  }, [messages]);

  const removeMessage = useCallback(async (id: string) => {
    const message = messages.find((item) => item.id === id);
    if (!message) throw new Error("Message not found.");
    await messagesApi.deleteMessage(message.groupId, id);
    setMessages((current) => current.filter((item) => item.id !== id));
  }, [messages]);

  const togglePin = useCallback(async (id: string) => {
    const message = messages.find((item) => item.id === id);
    if (!message) throw new Error("Message not found.");
    const result = await messagesApi.pinMessage(message.groupId, id, { isPinned: !message.pinned });
    setMessages((current) => current.map((item) => item.id === id ? { ...item, pinned: result.isPinned } : item));
  }, [messages]);

  const createGroup = useCallback(async (name: string, description: string, memberIds: string[]) => {
    const created = await groupsApi.create({ name, description, memberIds });
    const group = toGroup(await groupsApi.getById(created.id));
    setGroups((current) => [group, ...current]);
    setActiveGroupId(group.id);
    return group;
  }, []);

  const updateGroup = useCallback(async (groupId: string, name: string, description: string) => {
    await groupsApi.update(groupId, { name, description });
    await refreshGroup(groupId);
  }, [refreshGroup]);

  const removeGroup = useCallback(async (groupId: string) => {
    await groupsApi.remove(groupId);
    setGroups((current) => {
      const remaining = current.filter((group) => group.id !== groupId);
      setActiveGroupId((active) => active === groupId ? remaining[0]?.id ?? "" : active);
      return remaining;
    });
    setMessages((current) => current.filter((message) => message.groupId !== groupId));
    setInvites((current) => current.filter((invite) => invite.groupId !== groupId));
  }, []);

  const addGroupMember = useCallback(async (groupId: string, userId: string) => {
    await groupsApi.addMember(groupId, { userId });
    await refreshGroup(groupId);
  }, [refreshGroup]);

  const updateProfile = useCallback(async (name: string, bio: string) => {
    const updated = await authApi.updateProfile({ displayName: name, bio });
    const firebaseUser = getFirebaseAuth().currentUser;
    if (firebaseUser) await updateFirebaseProfile(firebaseUser, { displayName: name });
    setProfile(toUser(updated));
  }, []);

  const addContact = useCallback(async (username: string) => {
    if (!profile) throw new Error("You must be signed in to add contacts.");
    await contactsApi.sendRequest(username.replace(/^@/, "").trim());
    await refreshContacts(profile.id);
  }, [profile, refreshContacts]);

  const removeContact = useCallback(async (userId: string) => {
    await contactsApi.removeContact(userId);
    setContacts((current) => current.filter((contact) => contact.id !== userId));
  }, []);

  const respondToContactRequest = useCallback(async (requestId: string, accept: boolean) => {
    if (!profile) throw new Error("You must be signed in to manage contact requests.");
    await contactsApi.respondToRequest(requestId, accept ? "ACCEPTED" : "REJECTED");
    await refreshContacts(profile.id);
  }, [profile, refreshContacts]);

  const updateRole = useCallback(async (groupId: string, userId: string, role: GroupRole | null) => {
    if (role === null) {
      await groupsApi.removeMember(groupId, userId);
    } else {
      await groupsApi.updateRole(groupId, userId, { role: role === "admin" ? "ADMIN" : "MEMBER" });
    }
    await refreshGroup(groupId);
  }, [refreshGroup]);

  const leaveGroup = useCallback(async (groupId: string) => {
    await groupsApi.leave(groupId);
    setGroups((current) => {
      const remaining = current.filter((group) => group.id !== groupId);
      setActiveGroupId((active) => active === groupId ? remaining[0]?.id ?? "" : active);
      return remaining;
    });
    setMessages((current) => current.filter((message) => message.groupId !== groupId));
  }, []);

  const loadInvites = useCallback(async (groupId: string) => {
    const result = await invitesApi.getAll(groupId);
    const mapped = result.map(toInvite);
    setInvites((current) => [...current.filter((invite) => invite.groupId !== groupId), ...mapped]);
  }, []);

  const createInvite = useCallback(async (groupId: string, expiresIn: number | null, maxUses: number | null) => {
    const invite = await invitesApi.create(groupId, {
      ...(expiresIn === null ? {} : { expiresIn }),
      ...(maxUses === null ? {} : { maxUses }),
    });
    setInvites((current) => [toInvite(invite), ...current.filter((item) => item.id !== invite.id)]);
  }, []);

  const revokeInvite = useCallback(async (groupId: string, inviteId: string) => {
    await invitesApi.revoke(groupId, inviteId);
    setInvites((current) => current.filter((invite) => invite.id !== inviteId));
  }, []);

  const useInvite = useCallback(async (code: string) => {
    const result = await invitesApi.join(code);
    const group = toGroup(await groupsApi.getById(result.groupId));
    setGroups((current) => current.some((item) => item.id === group.id)
      ? current.map((item) => item.id === group.id ? group : item)
      : [group, ...current]);
    setActiveGroupId(group.id);
    return group.id;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      await signOut(getFirebaseAuth());
      api.clearTokens();
      setProfile(null);
      setGroups([]);
      setContacts([]);
      setPendingRequests([]);
      setMessages([]);
      setKnownUsers([]);
      setInvites([]);
      setActiveGroupId("");
    }
  }, []);

  const users = useMemo(() => {
    return mergeUsers(knownUsers, [ ...(profile ? [profile] : []), ...contacts ]);
  }, [contacts, knownUsers, profile]);

  const value = useMemo<ApiContextValue>(() => ({
    groups,
    invites,
    messages,
    users,
    contacts,
    pendingRequests,
    activeGroupId,
    profile,
    authenticated,
    loading,
    error,
    setActiveGroupId,
    sendMessage,
    updateMessage,
    removeMessage,
    togglePin,
    addReaction: (id, emoji) => setMessages((current) => current.map((message) =>
      message.id === id ? { ...message, reactions: [...message.reactions, emoji] } : message
    )),
    createGroup,
    updateGroup,
    removeGroup,
    addGroupMember,
    updateProfile,
    addContact,
    removeContact,
    respondToContactRequest,
    updateRole,
    leaveGroup,
    loadInvites,
    createInvite,
    revokeInvite,
    useInvite,
    logout,
  }), [
    activeGroupId, addContact, addGroupMember, authenticated, contacts, createGroup, createInvite, error, groups, invites,
    leaveGroup, loadInvites, loading, logout, messages, pendingRequests, profile, removeContact, removeGroup,
    removeMessage, respondToContactRequest, revokeInvite, sendMessage, togglePin, updateGroup, updateMessage,
    updateProfile, updateRole, useInvite, users,
  ]);

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApi() {
  const context = useContext(ApiContext);
  if (!context) throw new Error("useApi must be used inside ApiProvider");
  return context;
}
