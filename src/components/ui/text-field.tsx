import { useId, type InputHTMLAttributes } from "react";
import { FieldError, FieldHint, controlBorder } from "./field-parts";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, className = "", ...props }: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {hint && <FieldHint id={hintId}>{hint}</FieldHint>}
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`min-h-11 rounded-md bg-paper px-3 text-base text-ink ${controlBorder} disabled:opacity-60 ${className}`}
        {...props}
      />
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
