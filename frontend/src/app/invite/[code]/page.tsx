"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MessageCircle, Users } from "lucide-react";
import { useApi } from "@/components/api-provider";
import { Avatar } from "@/components/app-shell";
import { invitesApi, type InvitePreview } from "@/lib/api";

export default function InvitePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { groups, useInvite, profile } = useApi();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    invitesApi.preview(params.code)
      .then((result) => {
        if (!cancelled) setPreview(result);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load this invite.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.code]);

  const alreadyMember = groups.some((group) => group.id === preview?.group.id);
  const join = async () => {
    if (!profile) {
      router.push(`/login?next=/invite/${encodeURIComponent(params.code)}`);
      return;
    }

    setJoining(true);
    setError("");
    try {
      await useInvite(params.code);
      setJoined(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not join this group.");
    } finally {
      setJoining(false);
    }
  };

  const invalidInvite = !preview?.invite.valid;

  return (
    <main className="auth-wrap">
      <section className="auth-card invite-card">
        <div className="auth-brand">
          <Link className="brand-mark" href="/chat" aria-label="Yap">
            <MessageCircle size={26} />
          </Link>
          <div className="brand-title" style={{ marginTop: 12, fontSize: 28 }}>Yap</div>
          <div className="brand-subtitle" style={{ marginTop: 6, fontSize: 14 }}>Just chat.</div>
        </div>

        {loading ? (
          <p className="muted centered">Loading invitation...</p>
        ) : error && !preview ? (
          <>
            <h1 className="page-title centered">Invalid invitation</h1>
            <p className="muted centered">{error}</p>
          </>
        ) : preview && invalidInvite ? (
          <>
            <h1 className="page-title centered">This invite is no longer valid</h1>
            <p className="muted centered">Ask a group admin for a new link</p>
          </>
        ) : preview && (joined || alreadyMember) ? (
          <>
            <h1 className="page-title centered">
              {joined ? `You joined ${preview.group.name}!` : `You're already in ${preview.group.name}`}
            </h1>
            <p className="muted centered">Open the group to start chatting</p>
          </>
        ) : preview ? (
          <>
            <div className="invite-group">
              <Avatar text={preview.group.avatarUrl ?? preview.group.name.slice(0, 2).toUpperCase()} group size="xl" />
              <h1 className="page-title">{preview.group.name}</h1>
              <p className="muted">{preview.group.description}</p>
              <div className="muted" style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Users size={15} /> {preview.group.memberCount} members
              </div>
            </div>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="primary-button full-width" onClick={() => void join()} disabled={joining}>
              {joining ? "Joining..." : profile ? "Join group" : "Sign in to join"}
            </button>
          </>
        ) : null}

        {(joined || alreadyMember) && (
          <button className="primary-button full-width" onClick={() => router.push("/chat")}>
            Open chat
          </button>
        )}

        <Link className="secondary-button full-width invite-cancel" href="/chat">
          Return to Yap
        </Link>
      </section>
    </main>
  );
}
