import { useState } from "react";
import { useT } from "../i18n";
import { type SubjectDef } from "../types";

interface Props {
  initial?: SubjectDef;
  existingKeys: string[];
  onSave: (def: SubjectDef) => void;
  onCancel: () => void;
}

export default function SubjectForm({
  initial,
  existingKeys,
  onSave,
  onCancel,
}: Props) {
  const { t } = useT();
  const isEdit = !!initial;
  const [keyInput, setKeyInput] = useState(initial?.key ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [nameHe, setNameHe] = useState(initial?.nameHe ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const cleanKey = keyInput.trim().toLowerCase();
    if (!cleanKey) return setError(t("errSubjectKeyRequired"));
    if (!isEdit && existingKeys.includes(cleanKey)) {
      return setError(t("errSubjectKeyExists"));
    }
    onSave({
      key: cleanKey,
      name: name.trim() || undefined,
      nameHe: nameHe.trim() || undefined,
    });
  };

  return (
    <div className="form-card">
      <strong style={{ fontSize: 14 }}>
        {isEdit ? t("editSubjectHeading") : t("newSubjectHeading")}
      </strong>

      <div className="form-row">
        <label>{t("fieldSubjectKey")}</label>
        <input
          type="text"
          value={keyInput}
          disabled={isEdit}
          placeholder="e.g. drama"
          onChange={(e) => {
            setKeyInput(e.target.value);
            setError(null);
          }}
        />
      </div>
      <div className="form-row">
        <label>{t("fieldSubjectName")}</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="form-row">
        <label>{t("fieldSubjectNameHe")}</label>
        <input
          type="text"
          value={nameHe}
          onChange={(e) => setNameHe(e.target.value)}
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
