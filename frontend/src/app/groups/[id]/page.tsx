"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import { AppShell, Avatar, Toast } from "@/components/app-shell";
import { useApi } from "@/components/api-provider";

type GroupTab = "Overview" | "Media" | "Files" | "Links";

export default function GroupDetailsPage() {
  const params = useParams<{ id: string }>();
  const {
    groups,
    invites,
    users,
    contacts,
    profile,
    updateGroup,
    addGroupMember,
    updateRole,
    leaveGroup,
    removeGroup,
    loadInvites,
    createInvite,
    revokeInvite,
  } = useApi();
  const group = groups.find((item) => item.id === params.id);
  const router = useRouter();
  const [tab, setTab] = useState<GroupTab>("Overview");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberId, setMemberId] = useState("");
  const [expiresIn, setExpiresIn] = useState("86400");
  const [maxUses, setMaxUses] = useState("");
  const isAdmin = group?.members.some((member) => member.userId === profile?.id && member.role === "admin") ?? false;
  const currentUserIsMember = group?.members.some((member) => member.userId === profile?.id) ?? false;
  const adminCount = group?.members.filter((member) => member.role === "admin").length ?? 0;
  const canLeave = currentUserIsMember && (!isAdmin || adminCount > 1);
  const groupInvites = useMemo(
    () => invites.filter((invite) => invite.groupId === group?.id),
    [group?.id, invites]
  );
  const availableContacts = contacts.filter(
    (contact) => !group?.members.some((member) => member.userId === contact.id)
  );

  const members = useMemo(
    () =>
      (group?.members ?? []).filter((member) =>
        users.find((user) => user.id === member.userId)?.name.toLowerCase().includes(query.toLowerCase())
      ),
    [group, query, users]
  );

  useEffect(() => {
    if (!group || !isAdmin) return;
    void loadInvites(group.id).catch((cause: unknown) => {
      setToast(cause instanceof Error ? cause.message : "Could not load invite links.");
    });
  }, [group?.id, isAdmin, loadInvites]);

  if (!group) {
    return (
      <AppShell>
        <h1 className="page-title">Group not found</h1>
        <Link className="link" href="/chat">
          Return to chats
        </Link>
      </AppShell>
    );
  }

  const manage = async (userId: string, role: "admin" | "member" | null, name: string) => {
    if (role === null && !window.confirm(`Remove ${name} from ${group.name}?`)) return;
    try {
      await updateRole(group.id, userId, role);
      setToast(role === null ? `${name} removed` : `${name} is now ${role}`);
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Could not update group member.");
    }
  };

  const saveGroup = async () => {
    if (name.trim().length < 2) {
      setToast("Group name must be at least 2 characters.");
      return;
    }
    try {
      await updateGroup(group.id, name.trim(), description.trim());
      setEditing(false);
      setToast("Group updated");
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Could not update group.");
    }
  };

  const addMember = async () => {
    if (!memberId) {
      setToast("Choose a contact to add.");
      return;
    }
    const contact = contacts.find((item) => item.id === memberId);
    try {
      await addGroupMember(group.id, memberId);
      setToast(`${contact?.name ?? "Contact"} added to the group`);
      setMemberId("");
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Could not add group member.");
    }
  };

  const copyInvite = async (code: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/invite/${code}`);
      setToast("Invite link copied");
    } catch (error) {
      console.error("Could not copy invite link.", error);
      setToast("Could not copy invite link");
    }
  };

  const addInvite = async () => {
    const uses = maxUses.trim() ? Number(maxUses) : null;
    if (uses !== null && (!Number.isInteger(uses) || uses < 1 || uses > 1000)) {
      setToast("Maximum uses must be between 1 and 1000.");
      return;
    }
    try {
      await createInvite(group.id, expiresIn === "never" ? null : Number(expiresIn), uses);
      setMaxUses("");
      setToast("Invite link created");
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Could not create invite link.");
    }
  };

  const deleteGroup = async () => {
    if (!window.confirm(`Delete ${group.name} and its messages? This cannot be undone.`)) return;
    try {
      await removeGroup(group.id);
      router.push("/chat");
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Could not delete group.");
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm(`Leave ${group.name}?`)) return;
    try {
      await leaveGroup(group.id);
      router.push("/chat");
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Could not leave group.");
    }
  };

  return (
    <AppShell>
      <Link className="link back-link" href="/chat">
        ← Back to chat
      </Link>

      <div className="group-details-heading">
        <Avatar text={group.avatar} group size="xl" />
        <div>
          <h1 className="page-title">{group.name}</h1>
          <p className="page-description">{group.members.length} members · {group.description}</p>
        </div>
        {isAdmin && (
          <button
            className="secondary-button"
            onClick={() => {
              setName(group.name);
              setDescription(group.description);
              setEditing((current) => !current);
            }}
          >
            {editing ? <X size={15} /> : <Pencil size={15} />}
            {editing ? "Cancel" : "Edit group"}
          </button>
        )}
      </div>

      <div className="content-card group-details-card">
        <div className="tabs">
          {(["Overview", "Media", "Files", "Links"] as GroupTab[]).map((item) => (
            <button
              key={item}
              className={`tab-button${tab === item ? " active" : ""}`}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === "Overview" && (
          <>
            {editing && isAdmin && (
              <div className="detail-block">
                <h2>Edit group</h2>
                <div className="field">
                  <label htmlFor="edit-group-name">Group name</label>
                  <input
                    id="edit-group-name"
                    className="input"
                    maxLength={100}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="edit-group-description">Description</label>
                  <textarea
                    id="edit-group-description"
                    className="textarea"
                    maxLength={500}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
                <button className="primary-button" onClick={saveGroup}>Save changes</button>
              </div>
            )}
            <div className="detail-block">
              <h2>Description</h2>
              <p className="muted">{group.description || "This group doesn't have a description yet."}</p>
            </div>
            {isAdmin && <div className="detail-block">
              <div className="members-title">
                <h2>Invite links ({groupInvites.length})</h2>
              </div>
              <div className="add-contact-row">
                <select className="select" value={expiresIn} onChange={(event) => setExpiresIn(event.target.value)} aria-label="Invite expiration">
                  <option value="3600">Expires in 1 hour</option>
                  <option value="86400">Expires in 24 hours</option>
                  <option value="604800">Expires in 7 days</option>
                  <option value="2592000">Expires in 30 days</option>
                  <option value="never">Never expires</option>
                </select>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={1000}
                  placeholder="Max uses (optional)"
                  value={maxUses}
                  onChange={(event) => setMaxUses(event.target.value)}
                />
                <button className="primary-button" onClick={addInvite}><Plus size={16} /> Create link</button>
              </div>
              {groupInvites.map((invite) => {
                const url = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${invite.code}`;
                const expired = invite.expiresAt !== null && Date.parse(invite.expiresAt) <= Date.now();
                const usedUp = invite.maxUses !== null && invite.useCount >= invite.maxUses;
                return (
                  <div className="list-item" key={invite.id}>
                    <div className="member-copy">
                      <div className="member-name">{url}</div>
                      <div className="member-status">
                        {expired ? "Expired" : usedUp ? "Limit reached" : "Active"}
                        {invite.expiresAt && ` · Expires ${new Date(invite.expiresAt).toLocaleDateString()}`}
                        {invite.maxUses !== null && ` · ${invite.useCount}/${invite.maxUses} uses`}
                      </div>
                    </div>
                    <button className="icon-button" aria-label="Copy invite link" onClick={() => void copyInvite(invite.code)}>
                      <Copy size={16} />
                    </button>
                    {isAdmin && (
                      <button
                        className="icon-button danger-text"
                        aria-label="Revoke invite link"
                        onClick={() => {
                          if (window.confirm("Revoke this invite link?")) {
                            void revokeInvite(group.id, invite.id)
                              .then(() => setToast("Invite link revoked"))
                              .catch((cause: unknown) => setToast(cause instanceof Error ? cause.message : "Could not revoke invite."));
                          }
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
              {groupInvites.length === 0 && <p className="muted">No invite links yet.</p>}
            </div>}
          </>
        )}

        {tab !== "Overview" && (
          <div className="empty-state">
            {tab === "Media"
              ? "Shared photos and videos will appear here"
              : tab === "Files"
              ? "Shared files will appear here"
              : "Links shared in this group will appear here"}
            <p className="demo-note">This area is ready for future backend integration.</p>
          </div>
        )}

        <div className="detail-block">
          <div className="members-title">
            <h2>Members ({group.members.length})</h2>
            <input
              className="input member-search"
              placeholder="Search members"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {isAdmin && availableContacts.length > 0 && (
            <div className="add-contact-row">
              <select className="select" value={memberId} onChange={(event) => setMemberId(event.target.value)} aria-label="Select contact to add">
                <option value="">Select a contact...</option>
                {availableContacts.map((contact) => (
                  <option value={contact.id} key={contact.id}>{contact.name} (@{contact.username})</option>
                ))}
              </select>
              <button className="primary-button" onClick={addMember}><UserPlus size={16} /> Add member</button>
            </div>
          )}

          {members.map((member) => {
            const user = users.find((item) => item.id === member.userId);
            if (!user) return null;

            return (
              <div className="list-item" key={user.id}>
                <Avatar user={user} online={user.online} />
                <div className="member-copy">
                  <div className="member-name">{user.name}{user.id === profile?.id ? " (you)" : ""}</div>
                  <div className="member-status">@{user.username}</div>
                </div>
                <span className="role-label">{member.role}</span>
                {isAdmin && user.id !== profile?.id && (
                  <>
                    <select
                      className="select role-select"
                      aria-label={`Manage ${user.name}`}
                      value={member.role}
                      onChange={(e) => manage(user.id, e.target.value as "admin" | "member", user.name)}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      className="icon-button danger-text"
                      aria-label={`Remove ${user.name}`}
                      onClick={() => manage(user.id, null, user.name)}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            );
          })}

          {members.length === 0 && <p className="muted">No members match your search.</p>}
        </div>

        {isAdmin && (
          <button className="secondary-button danger-text" onClick={() => void deleteGroup()}>
            <Trash2 size={16} /> Delete group
          </button>
        )}
        {canLeave && (
          <button
            className="secondary-button danger-text"
            onClick={() => void handleLeaveGroup()}
          >
            Leave group
          </button>
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </AppShell>
  );
}