import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme?: string; size?: string; type?: string; shape?: string; width?: number | string }
          ) => void;
        };
      };
    };
  }
}

interface Props {
  clientId: string;
  onSuccess: () => void;
}

const FEATURES = [
  "Automatic constraint solving in milliseconds",
  "Teacher availability, day-off, and grade rules",
  "Special rooms for sport, computer, and music",
  "Per-user saved configurations",
];

export default function Login({ clientId, onSuccess }: Props) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = () => {
      if (cancelled) return;
      if (!window.google?.accounts?.id) {
        setTimeout(init, 100);
        return;
      }
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          setError(null);
          try {
            const res = await fetch("/api/auth/google", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ idToken: response.credential }),
            });
            if (!res.ok) {
              const body = (await res.json().catch(() => ({}))) as { error?: string };
              setError(body.error ?? "Login failed");
              return;
            }
            onSuccess();
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          }
        },
      });
      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          width: 280,
        });
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [clientId, onSuccess]);

  return (
    <div className="login-screen">
      <div className="login-shine" aria-hidden="true" />
      <div className="login-content">
        <div className="login-brand">
          <div className="login-icon-box" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="5" width="18" height="16" rx="2.5" stroke="white" strokeWidth="2" />
              <path d="M3 9H21" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 3V7" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <path d="M16 3V7" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <rect x="7" y="12" width="3" height="2" rx="0.5" fill="white" />
              <rect x="12" y="12" width="3" height="2" rx="0.5" fill="white" />
              <rect x="7" y="16" width="3" height="2" rx="0.5" fill="white" />
              <rect x="12" y="16" width="3" height="2" rx="0.5" fill="white" />
            </svg>
          </div>
          <h1>School Timetable Builder</h1>
          <p className="login-tagline">
            Build conflict-free weekly schedules for every class and teacher in seconds.
          </p>
        </div>

        <ul className="login-features">
          {FEATURES.map((f) => (
            <li key={f}>
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="10" fill="var(--success-soft)" />
                <path
                  d="M6 10.5L9 13.5L14.5 7.5"
                  stroke="var(--success)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="login-card">
          <h2>Welcome</h2>
          <p>Sign in with your Google account to continue.</p>
          <div ref={buttonRef} className="google-button" />
          {error && <div className="banner error" style={{ marginTop: 14 }}>{error}</div>}
          <p className="login-fine-print">
            Only invited Google accounts can access this app.
          </p>
        </div>
      </div>

      <footer className="login-footer">
        Built with React + Node ·{" "}
        <a
          href="https://github.com/shiranzaddik/timetable-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source on GitHub
        </a>
      </footer>
    </div>
  );
}
