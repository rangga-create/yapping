"use client";

import { useEffect, useState } from "react";
import { AppShell, Avatar, Toast } from "@/components/app-shell";
import { useApi } from "@/components/api-provider";

export default function ProfilePage() {
  const { profile, updateProfile } = useApi();
  const [name, setName] = useState(profile?.name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setBio(profile.bio);
  }, [profile]);

  if (!profile) return null;

  const save = async () => {
    if (!name.trim() || name.trim().length < 2) {
      setToast("Name must be at least 2 characters");
      return;
    }
    try {
      await updateProfile(name.trim(), bio.trim());
      setToast("Profile updated.");
    } catch (cause) {
      setToast(cause instanceof Error ? cause.message : "Could not update profile.");
    }
  };

  const cancel = () => {
    setName(profile.name);
    setBio(profile.bio);
  };

  return (
    <AppShell>
      <h1 className="page-title">Your profile</h1>
      <p className="page-description">Manage how you appear to your squad</p>

      <div className="content-card">
        <div className="profile-preview">
          <Avatar user={profile} size="lg" online />
          <div>
            <strong style={{ fontSize: 18 }}>{profile.name}</strong>
            <p className="muted" style={{ marginTop: 4 }}>
              @{profile.username} · <i className="status-dot" /> Online
            </p>
          </div>
        </div>

        <div className="field">
          <label htmlFor="display-name">Display name</label>
          <input
            id="display-name"
            className="input"
            maxLength={48}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="profile-bio">Bio</label>
          <textarea
            id="profile-bio"
            className="textarea"
            maxLength={160}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell people about yourself..."
          />
        </div>

        <div className="form-actions">
          <button className="primary-button" onClick={save}>
            Save changes
          </button>
          <button className="secondary-button" onClick={cancel}>
            Cancel
          </button>
        </div>

      </div>

      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </AppShell>
  );
}