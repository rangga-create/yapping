"use client";

import { useMemo, useState } from "react";
import { Search, UserPlus, MessageCircle, Trash2, Check, X } from "lucide-react";
import { AppShell, Avatar, Toast, EmptyState, SearchInput } from "@/components/app-shell";
import { useApi } from "@/components/api-provider";

export default function ContactsPage() {
  const {
    contacts: contactList,
    pendingRequests,
    addContact,
    removeContact,
    respondToContactRequest,
  } = useApi();
  const [query, setQuery] = useState("");
  const [username, setUsername] = useState("");
  const [toast, setToast] = useState("");

  const contacts = useMemo(
    () => contactList.filter((user) => `${user.name} ${user.username}`.toLowerCase().includes(query.toLowerCase())),
    [contactList, query]
  );

  const add = async () => {
    if (!username.trim()) {
      setToast("Enter a username to search");
      return;
    }
    try {
      await addContact(username);
      setToast(`Contact request sent to @${username.replace(/^@/, "")}`);
      setUsername("");
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Could not send contact request.");
    }
  };

  return (
    <AppShell>
      <h1 className="page-title">Contacts</h1>
      <p className="page-description">Find your friends and keep in touch</p>

      <div className="content-card">
        <SearchInput value={query} onChange={setQuery} placeholder="Search name or username..." />

        <div className="add-contact-row">
          <input
            className="input"
            placeholder="Add by username (e.g. @ralphed)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <button className="primary-button" onClick={add}>
            <UserPlus size={16} /> Add contact
          </button>
        </div>

        <div className="section-heading contact-heading">{contacts.length} contacts</div>

        {pendingRequests.length > 0 && (
          <section aria-label="Pending contact requests">
            <div className="section-heading contact-heading">Pending requests ({pendingRequests.length})</div>
            {pendingRequests.map(({ id, user }) => (
              <div className="list-item" key={id}>
                <Avatar user={user} online={user.online} />
                <div className="member-copy">
                  <div className="member-name">{user.name}</div>
                  <div className="member-status">@{user.username}</div>
                </div>
                <button
                  className="icon-button"
                  aria-label={`Accept ${user.name}'s contact request`}
                  onClick={async () => {
                    try {
                      await respondToContactRequest(id, true);
                      setToast(`${user.name} added to contacts`);
                    } catch (cause) {
                      setToast(cause instanceof Error ? cause.message : "Could not accept request.");
                    }
                  }}
                >
                  <Check size={16} />
                </button>
                <button
                  className="icon-button danger-text"
                  aria-label={`Reject ${user.name}'s contact request`}
                  onClick={async () => {
                    try {
                      await respondToContactRequest(id, false);
                      setToast("Contact request rejected");
                    } catch (cause) {
                      setToast(cause instanceof Error ? cause.message : "Could not reject request.");
                    }
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </section>
        )}

        {contacts.length > 0 ? (
          contacts.map((user) => (
            <div className="list-item" key={user.id}>
              <Avatar user={user} online={user.online} />
              <div className="member-copy">
                <div className="member-name">{user.name}</div>
                <div className="member-status">@{user.username}</div>
              </div>
              <span className="member-status">
                <i className={`status-dot${user.online ? "" : " offline"}`} />{user.online ? "Online" : "Offline"}
              </span>
              <button
                className="icon-button danger-text"
                aria-label={`Remove ${user.name} from contacts`}
                onClick={() => {
                  if (window.confirm(`Remove ${user.name} from your contacts?`)) {
                    void removeContact(user.id)
                      .then(() => setToast(`${user.name} removed from contacts`))
                      .catch((cause: unknown) => setToast(cause instanceof Error ? cause.message : "Could not remove contact."));
                  }
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <EmptyState
            icon={MessageCircle}
            title={query ? "No matches" : "No contacts yet"}
            description={query ? "Try a different search" : "Add someone by username to start"}
            action={
              !query && (
                <button className="primary-button" onClick={() => setUsername("@")}>
                  <UserPlus size={16} /> Add your first contact
                </button>
              )
            }
          />
        )}
      </div>

      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </AppShell>
  );
}