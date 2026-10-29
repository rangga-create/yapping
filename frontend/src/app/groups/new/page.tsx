"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, Avatar, Toast } from "@/components/app-shell";
import { useApi } from "@/components/api-provider";

export default function NewGroupPage() {
  const { contacts, createGroup } = useApi();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const filtered = useMemo(() => contacts.filter((user) => `${user.name} ${user.username}`.toLowerCase().includes(query.toLowerCase())), [contacts, query]);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const submit = async () => {
    if (name.trim().length < 2) { setToast("Group name must be at least 2 characters."); return; }
    try {
      await createGroup(name.trim(), description.trim(), selected);
      router.push("/chat");
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Could not create group.");
    }
  };
  return (
    <AppShell>
      <h1 className="page-title">Create a group</h1>
      <p className="page-description">Bring people together around a shared idea</p>
      <div className="content-card">
        <div className="group-preview">
          <Avatar text={name.trim().slice(0, 2).toUpperCase() || "＋"} group size="lg" />
          <div>
            <strong>{name || "Your new group"}</strong>
            <p className="muted">{selected.length + 1} members · You'll be an admin</p>
          </div>
        </div>
        <div className="field">
          <label htmlFor="group-name">Group name</label>
          <input id="group-name" className="input" maxLength={100} placeholder="e.g. Science project" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="group-description">Description (optional)</label>
          <textarea id="group-description" className="textarea" maxLength={500} placeholder="What is this group about?" value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="contact-search">Add members</label>
          <input id="contact-search" className="input" placeholder="Search contacts..." value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="select-list">
          {filtered.map((user) => (
            <label className="select-member" key={user.id}>
              <input type="checkbox" checked={selected.includes(user.id)} onChange={() => toggle(user.id)} />
              <Avatar user={user} online={user.online} size="sm" />
              <span>{user.name}<small>@{user.username}</small></span>
            </label>
          ))}
        </div>
        <div className="form-actions">
          <button className="primary-button" onClick={submit}>Create group</button>
          <button className="secondary-button" onClick={() => router.push("/chat")}>Cancel</button>
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </AppShell>
  );
}