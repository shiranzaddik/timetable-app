import { useState } from "react";
import { useT } from "../i18n";
import { type SubjectDef } from "../types";

interface Props {
  initial?: SubjectDef;
  /** All existing subjects — used to refuse duplicate names (case-insensitive
   *  across both en and he fields) and to invent a unique key for new ones. */
  existingSubjects: SubjectDef[];
  onSave: (def: SubjectDef) => void;
  onCancel: () => void;
}

export default function SubjectForm({
  initial,
  existingSubjects,
  onSave,
  onCancel,
}: Props) {
  const { t, lang } = useT();
  const isEdit = !!initial;
  // The single input edits whichever language is currently active. The
  // other-language name is preserved as-is on save so demo data with
  // bilingual labels keeps working.
  const initialDisplay =
    lang === "he"
      ? initial?.nameHe ?? initial?.name ?? ""
      : initial?.name ?? initial?.nameHe ?? "";
  const [display, setDisplay] = useState(initialDisplay);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const trimmed = display.trim();
    if (!trimmed) return setError(t("errNameRequired"));
    const candidate = trimmed.toLowerCase();
    const duplicate = existingSubjects.some((other) => {
      if (initial && other.key === initial.key) return false;
      const a = other.name?.trim().toLowerCase();
      const b = other.nameHe?.trim().toLowerCase();
      return a === candidate || b === candidate;
    });
    if (duplicate) return setError(t("errSubjectNameExists", { name: trimmed }));

    const key = isEdit
      ? initial!.key
      : makeSubjectKey(trimmed, existingSubjects.map((s) => s.key));

    const nextName = lang === "he" ? initial?.name : trimmed;
    const nextNameHe = lang === "he" ? trimmed : initial?.nameHe;
    onSave({
      key,
      name: nextName,
      nameHe: nextNameHe,
    });
  };

  return (
    <div className="form-card">
      <strong style={{ fontSize: 14 }}>
        {isEdit ? t("editSubjectHeading") : t("newSubjectHeading")}
      </strong>

      <div className="form-row">
        <label>{t("fieldSubjectName")}</label>
        <input
          type="text"
          value={display}
          autoFocus
          onChange={(e) => {
            setDisplay(e.target.value);
            setError(null);
          }}
        />
      </div>

      {error && <div className="banner error">{error}</div>}

      <div className="form-actions">
        <button onClick={submit}>{t("saveSubject")}</button>
        <button className="secondary" onClick={onCancel}>
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}

/** Slug the display name into a stable key. Falls back to "subj-N" when the
 *  text is non-ascii (e.g. typed only in Hebrew). Always uniquifies against
 *  the supplied list. */
function makeSubjectKey(display: string, existing: string[]): string {
  const slug = display
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const base = slug || "subj";
  let key = base;
  let n = 2;
  while (existing.includes(key)) key = `${base}-${n++}`;
  return key;
}
