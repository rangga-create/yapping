"use client";

import Link from "next/link";
import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AtSign,
  ChevronDown,
  Copy,
  FilePlus2,
  Info,
  Link2,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Send,
  Smile,
  Video,
  X,
  Reply,
  Pencil,
  Trash2,
  Heart,
  ThumbsUp,
  MessageSquare,
} from "lucide-react";
import { useApi } from "./api-provider";
import { AppNavigation, Avatar, GroupMembers, MobileNavigation, Toast } from "./app-shell";
import type { Message } from "@/lib/types";

const EMOJIS = ["😀", "😂", "❤️", "👍", "🎉", "🔥", "🙏", "✨", "😭", "😎", "🤔", "👀", "💀", "🥺", "😤", "🤝"];
const QUICK_REACTIONS = ["❤️", "👍", "🔥", "😂", "✨", "👀"];

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function ChatWorkspace() {
  const router = useRouter();
  const {
    groups,
    messages,
    users,
    profile,
    authenticated,
    loading,
    error,
    activeGroupId,
    setActiveGroupId,
    sendMessage,
    updateMessage,
    removeMessage,
    togglePin,
    addReaction,
  } = useApi();

  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const group = groups.find((item) => item.id === activeGroupId) ?? groups[0];

  useEffect(() => {
    if (!loading && !authenticated) router.replace("/login");
  }, [authenticated, loading, router]);

  const visibleMessages = useMemo(
    () =>
      messages.filter(
        (message) =>
          message.groupId === group?.id &&
          (!search || message.text.toLowerCase().includes(search.toLowerCase()))
      ),
    [group?.id, messages, search]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages, draft]);

  if (loading || (authenticated && !profile)) {
    return (
      <main className="workspace-gate">
        <div className="workspace-gate-mark"><MessageSquare size={24} /></div>
        {authenticated && error ? (
          <>
            <h1>We couldn't load your chats</h1>
            <p>{error}</p>
            <button className="primary-button" onClick={() => window.location.reload()}>Try again</button>
          </>
        ) : (
          <p>Loading your chats...</p>
        )}
      </main>
    );
  }

  if (!authenticated || !profile) return null;

  if (!group) {
    return (
      <div className="app-frame app-frame-empty">
        <AppNavigation />
        <MobileNavigation />
        <section className="chat-main">
          <div className="chat-welcome">
            <div className="chat-welcome-icon"><MessageSquare size={28} /></div>
            <span className="chat-welcome-eyebrow">WELCOME TO YAP</span>
            <h1>Your conversations start here</h1>
            <p>Create a group with your friends, or check your contacts to find people to chat with.</p>
            <div className="chat-welcome-actions">
              <Link href="/groups/new" className="primary-button"><Plus size={16} />Create a group</Link>
              <Link href="/contacts" className="secondary-button">Find contacts</Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3000);
  };

  const submit = async () => {
    if (!draft.trim()) return;
    try {
      if (editingId) {
        await updateMessage(editingId, draft.trim());
        setEditingId(null);
        notify("Message updated");
      } else {
        await sendMessage(draft.trim(), replyTo?.id);
      }
      setDraft("");
      setReplyTo(null);
      composerRef.current?.focus();
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "Could not save your message.");
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify("Copied!");
    } catch {
      notify("Clipboard not available");
    }
  };

  const chooseAction = async (action: string, message: Message) => {
    setMenuId(null);
    if (action === "reply") setReplyTo(message);
    if (action === "edit") {
      setEditingId(message.id);
      setDraft(message.text);
      composerRef.current?.focus();
    }
    if (action === "pin") {
      try {
        await togglePin(message.id);
        notify(message.pinned ? "Unpinned" : "Pinned");
      } catch (cause) {
        notify(cause instanceof Error ? cause.message : "Could not update pin.");
      }
    }
    if (action === "copy") void copyText(message.text);
    if (action === "delete") {
      if (window.confirm("Delete this message?")) {
        try {
          await removeMessage(message.id);
          notify("Deleted");
        } catch (cause) {
          notify(cause instanceof Error ? cause.message : "Could not delete message.");
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const onlineCount = group.members.filter((member) =>
    users.find((user) => user.id === member.userId)?.online
  ).length;

  return (
    <div className="app-frame">
      <AppNavigation />
      <MobileNavigation />
      <section className="chat-main">
        <header className="chat-header">
          <button
            className="icon-button desktop-mobile-back"
            onClick={() => setGroupMenuOpen(!groupMenuOpen)}
            aria-label="Choose conversation"
          >
            <ArrowLeft size={18} />
          </button>
          <Avatar text={group.avatar} group size="md" />
          <button
            className="group-header-copy"
            onClick={() => setDetailsOpen(!detailsOpen)}
            style={{ border: 0, background: "transparent", textAlign: "left", padding: 0, flex: 1 }}
          >
            <div className="header-title">{group.name}</div>
            <div className="header-subtitle">
              {group.members.length} members · {onlineCount} online
            </div>
          </button>
          <div className="header-actions">
            {searchOpen && (
              <input
                className="input chat-search"
                placeholder="Search messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            )}
            <button className="icon-button" aria-label="Search messages" onClick={() => { setSearchOpen(!searchOpen); setSearch(""); }}>
              <Search size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="Start video call (demo)"
              onClick={() => notify("Video calls coming soon!")}
            >
              <Video size={17} />
            </button>
            <button className="icon-button" aria-label="Group info" onClick={() => setDetailsOpen(!detailsOpen)}>
              <Info size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="Manage group invite links"
              title="Manage group invite links"
              onClick={() => router.push(`/groups/${group.id}`)}
            >
              <Link2 size={18} />
            </button>
          </div>
        </header>

        {groupMenuOpen && (
          <div className="mobile-group-menu">
            {groups.map((item) => (
              <button
                key={item.id}
                className={`group-item${item.id === group.id ? " selected" : ""}`}
                onClick={() => { setActiveGroupId(item.id); setGroupMenuOpen(false); }}
              >
                <Avatar text={item.avatar} group />
                <span className="group-copy">
                  <span className="group-name">{item.name}</span>
                  <span className="group-preview">{item.members.length} members</span>
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="messages">
          <div className="date-divider"><span>Today</span></div>

          {visibleMessages.length === 0 ? (
            <div className="empty-state" style={{ marginTop: 40 }}>
              {search ? (
                <>
                  <Search size={32} style={{ color: "var(--text-dim)", marginBottom: 12 }} />
                  <h3 style={{ margin: "0 0 6px", fontSize: "16px" }}>No matches</h3>
                  <p style={{ margin: 0, color: "var(--text-muted)" }}>Try a different search term</p>
                </>
              ) : (
                <>
                  <MessageSquare size={32} style={{ color: "var(--text-dim)", marginBottom: 12 }} />
                  <h3 style={{ margin: "0 0 6px", fontSize: "16px" }}>Ready to yap?</h3>
                  <p style={{ margin: 0, color: "var(--text-muted)" }}>This group is waiting for its first message</p>
                </>
              )}
            </div>
          ) : (
            visibleMessages.map((message) => {
              const sender = users.find((user) => user.id === message.senderId);
              const mine = message.senderId === profile?.id;
              const replied = message.replyTo ? messages.find((item) => item.id === message.replyTo) : null;
              const reacted = showReactions === message.id;

              return (
                <div className={`message-row${mine ? " mine" : ""}`} key={message.id}>
                  <Avatar user={sender} size="sm" />
                  <div className="message-content">
                    <div className="message-meta">
                      <strong>{mine ? "You" : sender?.name ?? "Member"}</strong>
                      <span>{message.time}</span>
                      {message.pinned && <Pin size={12} />}
                    </div>

                    {replied && (
                      <div className="reply-preview" onClick={() => {}}>
                        <span style={{ color: "var(--brand)", fontWeight: 500 }}>
                          ↪ Replying to {users.find((u) => u.id === replied.senderId)?.name}
                        </span>
                        <span>: {replied.text}</span>
                      </div>
                    )}

                    <div
                      className="bubble"
                      onDoubleClick={() => !mine && setShowReactions(message.id)}
                      onClick={() => setShowReactions(null)}
                    >
                      {message.text.split(/(@[a-zA-Z0-9_]+)/g).map((part, index) =>
                        part.startsWith("@") ? (
                          <span className="mention" key={`${message.id}-${index}`}>{part}</span>
                        ) : (
                          part
                        ))
                      }
                    </div>

                    {message.reactions.length > 0 && (
                      <div className="message-reactions">
                        {message.reactions.map((reaction, index) => (
                          <button
                            className="reaction"
                            key={`${reaction}-${index}`}
                            onClick={() => addReaction(message.id, reaction)}
                          >
                            {reaction}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="message-actions">
                      <button
                        className="icon-button"
                        title="React"
                        onClick={() => setShowReactions(showReactions === message.id ? null : message.id)}
                      >
                        <Heart size={14} />
                      </button>
                      <button className="icon-button" title="Reply" onClick={() => setReplyTo(message)}>
                        <Reply size={14} />
                      </button>
                      <button className="icon-button" title="More" onClick={() => setMenuId(menuId === message.id ? null : message.id)}>
                        <MoreHorizontal size={15} />
                      </button>
                    </div>

                    {menuId === message.id && (
                      <div className="message-menu">
                        <button onClick={() => void chooseAction("reply", message)}>
                          <Reply size={14} /> Reply
                        </button>
                        {mine && (
                          <button onClick={() => void chooseAction("edit", message)}>
                            <Pencil size={14} /> Edit
                          </button>
                        )}
                        <button onClick={() => void chooseAction("pin", message)}>
                          <Pin size={14} /> {message.pinned ? "Unpin" : "Pin"}
                        </button>
                        <button onClick={() => void chooseAction("copy", message)}>
                          <Copy size={14} /> Copy
                        </button>
                        {mine && (
                          <button className="danger-text" onClick={() => void chooseAction("delete", message)}>
                            <Trash2 size={14} /> Delete
                          </button>
                        )}
                      </div>
                    )}

                    {reacted && (
                      <div
                        className="emoji-picker"
                        style={{
                          gridTemplateColumns: "repeat(6, 40px)",
                          position: "absolute",
                          bottom: "100%",
                          right: "0",
                          marginBottom: "8px",
                          zIndex: 20,
                        }}
                      >
                        {QUICK_REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={(e) => {
                              e.stopPropagation();
                              addReaction(message.id, emoji);
                              setShowReactions(null);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          <div className="typing-row">
            <span className="typing-dots">
              <i /><i /><i />
            </span> Elvin is typing...
          </div>
          <div ref={messagesEndRef} />
        </div>

        <div className="composer-wrap">
          {(replyTo || editingId) && (
            <div className="reply-banner">
              <span>
                {editingId ? (
                  <>
                    <Pencil size={13} style={{ marginRight: 6, verticalAlign: "middle" }} /> Editing your message
                  </>
                ) : (
                  <>
                    <Reply size={13} style={{ marginRight: 6, verticalAlign: "middle" }} />
                    Replying to <strong>{users.find((u) => u.id === replyTo?.senderId)?.name}</strong>
                  </>
                )}
              </span>
              <button className="icon-button" onClick={() => { setReplyTo(null); setEditingId(null); setDraft(""); }} aria-label="Cancel">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="composer">
            <button
              className="icon-button"
              aria-label="Attach file (demo)"
              onClick={() => notify("File uploads coming soon!")}
            >
              <FilePlus2 size={17} />
            </button>

            <textarea
              ref={composerRef}
              aria-label="Write a message"
              placeholder={editingId ? "Editing..." : "Type something..."}
              value={draft}
              rows={1}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <button
              className="icon-button"
              aria-label="Mention someone"
              onClick={() => setDraft((c) => `${c}${c ? " " : ""}@`)}
            >
              <AtSign size={17} />
            </button>

            <div className="emoji-holder">
              <button className="icon-button" aria-label="Emoji picker" onClick={() => setEmojiOpen(!emojiOpen)}>
                <Smile size={17} />
              </button>
              {emojiOpen && (
                <div className="emoji-picker">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setDraft((c) => `${c}${emoji}`);
                        setEmojiOpen(false);
                        composerRef.current?.focus();
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button className="send-button" aria-label="Send message" onClick={submit} disabled={!draft.trim()}>
              <Send size={16} />
            </button>
          </div>
        </div>
      </section>

      <aside className={`info-panel${detailsOpen ? " open" : ""}`}>
        <div className="info-top">
          <Avatar text={group.avatar} group size="lg" />
          <div className="info-title">{group.name}</div>
          <div className="header-subtitle">{group.members.length} members</div>
          <p className="info-description">{group.description || "No description yet. Add one in group details!"}</p>
          <button className="secondary-button" onClick={() => router.push(`/groups/${group.id}`)}>
            <Link2 size={14} /> Manage invite links
          </button>
        </div>

        <div className="info-section">
          <div className="section-heading">
            Group overview
            <Link href={`/groups/${group.id}`} className="link">Details</Link>
          </div>
          <p className="info-description">Created for sharing updates, ideas, and making things happen together.</p>
          <Link className="invite-link" href={`/groups/${group.id}`}>
            <Copy size={13} /> Manage invite links
          </Link>
        </div>

        <div className="info-section">
          <div className="section-heading">Media <button className="icon-button" aria-label="View all media"><ChevronDown size={15} /></button></div>
          <div className="media-grid">
            <div className="media-swatch">📷</div>
            <div className="media-swatch purple">✦</div>
            <div className="media-swatch blue">✳</div>
          </div>
        </div>

        <div className="info-section">
          <div className="section-heading">Members <Link href={`/groups/${group.id}`} className="link">See all</Link></div>
          <GroupMembers groupId={group.id} />
        </div>
      </aside>

      {detailsOpen && <button className="drawer-backdrop" aria-label="Close details" onClick={() => setDetailsOpen(false)} />}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}