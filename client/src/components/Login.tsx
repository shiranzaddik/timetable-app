import { useEffect, useRef, useState } from "react";

// Minimal typings for the Google Identity Services global object.
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
            options: { theme?: string; size?: string; type?: string; shape?: string }
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

export default function Login({ clientId, onSuccess }: Props) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = () => {
      if (cancelled) return;
      if (!window.google?.accounts?.id) {
        // GIS script not loaded yet; try again shortly.
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
      <div className="login-card">
        <h1>School Timetable Builder</h1>
        <p className="subtitle">Sign in with Google to continue.</p>
        <div ref={buttonRef} className="google-button" />
        {error && <div className="banner error" style={{ marginTop: 12 }}>{error}</div>}
      </div>
    </div>
  );
}
