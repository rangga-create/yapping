"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, ContactRound, Home, LogOut, MessageCircle, Plus, Settings, Users, X, Search } from "lucide-react";
import { useApi } from "./api-provider";
import type { ChatGroup, User } from "@/lib/types";

export function Avatar({ user, text, group = false, size = "md", online = false, className = "" }: {
  user?: User;
  text?: string;
  group?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
}) {
  const sizeMap = { sm: "30px", md: "38px", lg: "56px", xl: "72px" };
  const fontSizeMap = { sm: "10px", md: "13px", lg: "18px", xl: "24px" };
  const style = {
    width: sizeMap[size],
    height: sizeMap[size],
    fontSize: fontSizeMap[size],
  } as React.CSSProperties;

  return (
    <span
      className={`avatar${group ? " group" : ""} ${className}`}
      style={style}
      aria-label={user?.name ?? text}
    >
      {user?.avatar ?? text ?? "?"}
      {online && <i className="online-dot" />}
    </span>
  );
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="toast" role="status">
      {message}
      <button className="icon-button" onClick={onClose} aria-label="Dismiss notification">
        <X size={14} />
      </button>
    </div>
  );
}

export function AppShell({ children, selectedGroupId }: { children: React.ReactNode; selectedGroupId?: string }) {
  const { profile, authenticated, loading, error } = useApi();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !authenticated) router.replace("/login");
  }, [authenticated, loading, router]);

  if (loading || !profile) {
    if (authenticated && error) {
      return (
        <main className="workspace-gate">
          <div className="workspace-gate-mark"><MessageCircle size={24} /></div>
          <h1>We couldn't load your workspace</h1>
          <p>{error}</p>
          <button className="primary-button" onClick={() => window.location.reload()}>Try again</button>
        </main>
      );
    }
    return <main className="workspace-gate"><p>Loading your workspace...</p></main>;
  }

  return (
    <div className="page-wrap">
      <AppNavigation selectedGroupId={selectedGroupId} />
      <main className="page-content">{children}</main>
      <MobileNavigation />
    </div>
  );
}

export function AppNavigation({ selectedGroupId }: { selectedGroupId?: string }) {
  const { groups, users, profile, setActiveGroupId, activeGroupId, logout } = useApi();
  const pathname = usePathname();
  const chatSelected = pathname === "/chat";
  if (!profile) return null;

  return (
    <>
      <aside className="icon-rail" aria-label="Main navigation">
        <Link className="brand-mark" href="/chat" aria-label="Yap home">
          <MessageCircle size={22} />
        </Link>
        <RailLink href="/chat" icon={<MessageCircle size={20} />} active={chatSelected} label="Chats" />
        <RailLink href="/contacts" icon={<ContactRound size={20} />} active={pathname === "/contacts"} label="Contacts" />
        <RailLink href="/groups/new" icon={<Users size={20} />} active={pathname === "/groups/new"} label="New group" />
        <span className="rail-spacer" />
        <RailLink href="/settings" icon={<Settings size={20} />} active={pathname === "/settings"} label="Settings" />
      </aside>
      <aside className="chat-sidebar">
        <div className="sidebar-head">
          <div className="brand-title">Yap</div>
          <div className="brand-subtitle">Just chat.</div>
        </div>
        <div className="story-row">
          {users.filter((user) => user.id !== profile.id).slice(0, 5).map((user) => (
            <div className="story" key={user.id}>
              <Avatar user={user} online={user.online} size="md" />
              <span>{user.name.split(" ")[0]}</span>
            </div>
          ))}
        </div>
        <div className="sidebar-label-row">
          <strong>{pathname === "/contacts" ? "Contacts" : "Messages"}</strong>
          <Link href={pathname === "/contacts" ? "/contacts" : "/groups/new"} className="icon-button" aria-label="Start new chat">
            <Plus size={18} />
          </Link>
        </div>
        <div className="group-list">
          {groups.length > 0 ? groups.map((group) => (
            <GroupListItem
              key={group.id}
              group={group}
              active={(selectedGroupId ?? activeGroupId) === group.id}
              onClick={() => setActiveGroupId(group.id)}
            />
          )) : (
            <div className="sidebar-empty">
              <p>No conversations yet</p>
              <Link href="/groups/new">Create your first group <Plus size={13} /></Link>
            </div>
          )}
        </div>
        <div className="profile-chip">
          <Link href="/profile" className="profile-chip">
            <Avatar user={profile ?? undefined} online />
            <span>
              <span className="profile-chip-name">{profile.name}</span>
              <span className="profile-chip-sub">Available</span>
            </span>
          </Link>
          <button className="icon-button" aria-label="Log out" onClick={() => void logout()}>
            <LogOut size={15} />
          </button>
        </div>
      </aside>
    </>
  );
}

export function MobileNavigation() {
  const pathname = usePathname();
  const chatSelected = pathname === "/chat";

  return (
    <>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <Link className={chatSelected ? "active" : ""} href="/chat">
          <MessageCircle size={20} />Chats
        </Link>
        <Link className={pathname === "/contacts" ? "active" : ""} href="/contacts">
          <ContactRound size={20} />Contacts
        </Link>
        <Link className={pathname === "/groups/new" ? "active" : ""} href="/groups/new">
          <Users size={20} />Groups
        </Link>
        <Link className={pathname === "/settings" ? "active" : ""} href="/settings">
          <Settings size={20} />Settings
        </Link>
      </nav>
    </>
  );
}

function RailLink({ href, icon, active, label }: { href: string; icon: React.ReactNode; active: boolean; label: string }) {
  return (
    <Link className={`rail-link${active ? " active" : ""}`} href={href} aria-label={label} title={label}>
      {icon}
    </Link>
  );
}

function GroupListItem({ group, active, onClick }: { group: ChatGroup; active: boolean; onClick: () => void }) {
  return (
    <button className={`group-item${active ? " selected" : ""}`} onClick={onClick}>
      <Avatar text={group.avatar} group />
      <span className="group-copy">
        <span className="group-name">{group.name}</span>
        <span className="group-preview">{group.description || `${group.members.length} members`}</span>
      </span>
    </button>
  );
}

export function GroupMembers({ groupId, compact = false }: { groupId: string; compact?: boolean }) {
  const { groups, users, profile } = useApi();
  const group = groups.find((item) => item.id === groupId);
  if (!group) return null;

  return (
    <>
      {group.members.map((member) => {
        const user = users.find((item) => item.id === member.userId);
        if (!user) return null;
        return (
          <div className="member-row" key={user.id}>
            <Avatar user={user} online={user.online} size="sm" />
            <div className="member-copy">
              <div className="member-name">{user.name}{user.id === profile?.id ? " (you)" : ""}</div>
              <div className="member-status">{user.online ? "Online" : "Offline"}</div>
            </div>
            {!compact && <span className="role-label">{member.role === "admin" ? "Admin" : "Member"}</span>}
          </div>
        );
      })}
    </>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div className="avatar xl" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
        <Icon size={32} />
      </div>
      <div style={{ textAlign: "center" }}>
        <h3 style={{ margin: "0 0 6px", fontSize: "17px", fontWeight: 600 }}>{title}</h3>
        <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "13px", lineHeight: 1.6 }}>{description}</p>
      </div>
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search..." }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <div className="inline-search">
      <Search size={16} />
      <input className="input" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}