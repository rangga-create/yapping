"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell, Toast } from "@/components/app-shell";

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(false);
  const [compact, setCompact] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("yap-settings");
      if (saved) {
        const value = JSON.parse(saved) as { notifications?: boolean; sound?: boolean; compact?: boolean };
        setNotifications(value.notifications ?? true);
        setSound(value.sound ?? false);
        setCompact(value.compact ?? false);
      }
    } catch (error) {
      console.error("Could not read Yap settings.", error);
    }
  }, []);

  const save = () => {
    try {
      localStorage.setItem("yap-settings", JSON.stringify({ notifications, sound, compact }));
      setToast("Preferences saved!");
    } catch (error) {
      console.error("Could not save Yap settings.", error);
      setToast("Could not save preferences");
    }
  };

  return (
    <AppShell>
      <h1 className="page-title">Settings</h1>
      <p className="page-description">Make Yap work the way you like</p>

      <div className="content-card settings-card">
        <h2>Notifications</h2>
        <SettingToggle
          label="Desktop notifications"
          description="Show notifications for new messages"
          value={notifications}
          onChange={setNotifications}
        />
        <SettingToggle
          label="Notification sounds"
          description="Play a sound when a message arrives"
          value={sound}
          onChange={setSound}
        />

        <h2 className="settings-subhead">Appearance</h2>
        <SettingToggle
          label="Compact message spacing"
          description="Use a denser conversation layout"
          value={compact}
          onChange={setCompact}
        />

        <div className="settings-shortcuts">
          <Link href="/profile" className="secondary-button">
            Edit profile
          </Link>
          <Link href="/contacts" className="secondary-button">
            Manage contacts
          </Link>
        </div>

        <button className="primary-button" onClick={save}>
          Save preferences
        </button>
        <p className="demo-note">Settings are stored locally in this browser.</p>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </AppShell>
  );
}

function SettingToggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="setting-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}