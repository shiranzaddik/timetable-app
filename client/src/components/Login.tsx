import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import LanguageSwitcher from "./LanguageSwitcher";

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

export default function Login({ clientId, onSuccess }: Props) {
  const { t } = useT();
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

  const features = [t("feature1"), t("feature2"), t("feature3"), t("feature4")];

  return (
    <div className="login-screen">
      <div className="login-shine" aria-hidden="true" />
      <div className="login-lang-wrap">
        <LanguageSwitcher />
      </div>
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
          <h1>{t("appTitle")}</h1>
          <p className="login-tagline">{t("loginTagline")}</p>
        </div>

        <ul className="login-features">
          {features.map((f) => (
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

        <div className="login-action">
          <div ref={buttonRef} className="google-button" />
          {error && <div className="banner error" style={{ marginTop: 14 }}>{error}</div>}
          <p className="login-fine-print">{t("loginFinePrint")}</p>
        </div>
      </div>

      <footer className="login-footer">
        {t("loginFooterPrefix")}{" "}
        <a
          href="https://github.com/shiranzaddik/timetable-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("loginFooterLink")}
        </a>
      </footer>
    </div>
  );
}
