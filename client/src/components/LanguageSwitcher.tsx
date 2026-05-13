import { useT, type Lang } from "../i18n";

export default function LanguageSwitcher() {
  const { lang, setLang } = useT();
  return (
    <div className="lang-switcher" role="group" aria-label="Language">
      <Pill active={lang === "en"} onClick={() => setLang("en" as Lang)}>
        EN
      </Pill>
      <Pill active={lang === "he"} onClick={() => setLang("he" as Lang)}>
        עב
      </Pill>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`lang-pill ${active ? "active" : ""}`}
      onClick={onClick}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}
