"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, MessageCircle } from "lucide-react";
import { api, authApi } from "@/lib/api";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import type { UserCredential } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { getFirebaseAuth } from "@/lib/firebase";

export default function AuthPanel({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const registering = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const cleanUsername = username.trim().replace(/^@/, "");

    if (registering && name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    if (registering && !/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
      setError("Username: 3-30 chars, letters/numbers/_ only");
      return;
    }
    if (registering && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    if (password.length < 8) {
      setError("Password needs 8+ characters");
      return;
    }
    if (registering && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError("Password must include uppercase, lowercase, and a number");
      return;
    }
    if (registering && password !== confirm) {
      setError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      let credential: UserCredential;
      if (registering) {
        try {
          credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        } catch (cause) {
          if (!(cause instanceof FirebaseError) || cause.code !== "auth/email-already-in-use") throw cause;
          credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        }
      } else {
        credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      if (registering) {
        await updateProfile(credential.user, { displayName: name.trim() });
        api.setAccessToken(await credential.user.getIdToken());
        await authApi.register({ username: cleanUsername, displayName: name.trim() });
      } else {
        api.setAccessToken(await credential.user.getIdToken());
      }
      const requestedPath = new URLSearchParams(window.location.search).get("next");
      const destination = requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
        ? requestedPath
        : "/chat";
      window.location.assign(destination);
    } catch (cause) {
      let message = "Could not authenticate.";
      if (cause instanceof FirebaseError) {
        switch (cause.code) {
          case "auth/invalid-credential":
          case "auth/wrong-password":
          case "auth/user-not-found":
            message = registering
              ? "Email atau password tidak valid. Jika email sudah terdaftar, coba login dengan password yang benar."
              : "Email atau password salah.";
            break;
          case "auth/email-already-in-use":
            message = "Email sudah terdaftar. Silakan login.";
            break;
          case "auth/weak-password":
            message = "Password terlalu lemah.";
            break;
          case "auth/invalid-email":
            message = "Format email tidak valid.";
            break;
          case "auth/too-many-requests":
            message = "Terlalu banyak percobaan. Coba lagi nanti.";
            break;
          default:
            message = cause.message.replace(/^Firebase:\s*/i, "");
            break;
        }
      } else if (cause instanceof Error) {
        message = cause.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-wrap">
      <section className="auth-card">
        <div className="auth-brand">
          <Link className="brand-mark" href="/chat" aria-label="Yap">
            <MessageCircle size={26} />
          </Link>
          <div className="brand-title" style={{ marginTop: 12, fontSize: 28 }}>Yap</div>
          <div className="brand-subtitle" style={{ marginTop: 6, fontSize: 14 }}>Just chat.</div>
        </div>

        <h1 className="auth-title">{registering ? "Join the conversation" : "Welcome back"}</h1>
        <p className="auth-intro">
          {registering
            ? "Create your account and start yapping with your squad"
            : "Sign in to continue to your chats"}
        </p>

        <form onSubmit={submit} noValidate>
          {registering && (
            <>
              <div className="field">
                <label htmlFor="full-name">Full name</label>
                <input
                  id="full-name"
                  autoComplete="name"
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className="input"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </>
          )}

          <div className="field">
            <label htmlFor="username">{registering ? "Username" : "Email"}</label>
            <input
              id="username"
              type={registering ? "text" : "email"}
              autoComplete={registering ? "username" : "email"}
              className="input"
              value={registering ? username : email}
              onChange={(event) => registering ? setUsername(event.target.value) : setEmail(event.target.value)}
              placeholder={registering ? "e.g. jennyw" : "you@example.com"}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <div className="password-wrap">
              <input
                id="password"
                autoComplete={registering ? "new-password" : "current-password"}
                type={visible ? "text" : "password"}
                className="input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
              />
              <button
                className="icon-button"
                type="button"
                aria-label={visible ? "Hide password" : "Show password"}
                onClick={() => setVisible((current) => !current)}
              >
                {visible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {registering && (
            <div className="field">
              <label htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                autoComplete="new-password"
                type={visible ? "text" : "password"}
                className="input"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                required
              />
            </div>
          )}

          {error && <div className="form-error" role="alert">{error}</div>}

          <button className="primary-button full-width" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? "Please wait..." : registering ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          {registering ? "Already have an account?" : "New to Yap?"}{" "}
          <Link className="link" href={registering ? "/login" : "/register"}>
            {registering ? "Sign in" : "Create account"}
          </Link>
        </p>
      </section>
    </main>
  );
}
