"use client";

import { useEffect, useRef, useState, type ElementType } from "react";
import { useAdminMode } from "@/lib/adminMode";

interface EditableTextProps {
  value: string;
  onSave: (value: string) => void | Promise<void>;
  className?: string;
  as?: ElementType;
  multiline?: boolean;
  placeholder?: string;
}

// Affiche un texte normalement pour un joueur. Pour l'organisateur en mode
// édition, le même texte devient cliquable : un clic ouvre un champ
// modifiable directement à la place du texte, sur la vraie page du jeu,
// avec le vrai rendu. Enregistré au blur ou avec Entrée (Maj+Entrée pour
// une nouvelle ligne en multiligne).
export default function EditableText({
  value,
  onSave,
  className,
  as = "span",
  multiline = false,
  placeholder,
}: EditableTextProps) {
  const { editMode } = useAdminMode();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const Tag = as;

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  if (!editMode) {
    return <Tag className={className}>{value || placeholder}</Tag>;
  }

  async function commit() {
    setEditing(false);
    if (draft !== value) {
      setSaving(true);
      await onSave(draft);
      setSaving(false);
    }
  }

  if (editing) {
    const Field = multiline ? "textarea" : "input";
    return (
      <Field
        ref={ref as never}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (!multiline || !e.shiftKey)) {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        rows={multiline ? 4 : undefined}
        className={`${className ?? ""} bg-white outline-none ring-2 ring-brand-blue rounded-md px-1 w-full`}
      />
    );
  }

  return (
    <Tag
      onClick={(e: React.MouseEvent) => {
        // Empêche le clic de déclencher une action du parent (ex. un
        // bouton "Commencer" qui navigue) : ici on veut seulement éditer.
        e.preventDefault();
        e.stopPropagation();
        setEditing(true);
      }}
      title="Cliquer pour modifier ce texte"
      className={`${className ?? ""} cursor-text rounded-md outline-dashed outline-1 outline-offset-2 outline-brand-blue/50 hover:bg-brand-blue-light/50 transition ${
        saving ? "opacity-50" : ""
      }`}
    >
      {value || <span className="text-brand-blue/60 italic">{placeholder ?? "(cliquer pour écrire)"}</span>}
    </Tag>
  );
}
