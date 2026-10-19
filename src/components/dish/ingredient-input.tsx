"use client";

import { X } from "lucide-react";
import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { FieldError, FieldHint, controlBorder } from "@/components/ui/field-parts";
import { IconButton } from "@/components/ui/icon-button";
import { Spinner } from "@/components/ui/spinner";
import { apiRequest } from "@/lib/http/api-client";
import type { Ingredient } from "@/modules/ingredient/ingredient-schema";
import { addIngredient } from "./dish-draft";
import { useDebouncedValue } from "./use-debounced-value";

export interface IngredientInputProps {
  label: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  // The text being typed, held by the form so it can be added when the form is saved.
  text: string;
  onTextChange: (text: string) => void;
  error?: string;
  disabled?: boolean;
}

interface Suggestions {
  // The text these suggestions are for.
  text: string;
  names: string[];
  failed: boolean;
}

interface Option {
  name: string;
  isNew: boolean;
}

export function IngredientInput({ label, tags, onTagsChange, text, onTextChange, error, disabled }: IngredientInputProps) {
  const id = useId();
  const listId = `${id}-list`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [active, setActive] = useState(-1);
  const [focused, setFocused] = useState(false);
  const typed = text.trim();
  const debounced = useDebouncedValue(typed);

  useEffect(() => {
    if (!debounced) return;
    let current = true;
    void apiRequest<Ingredient[]>("GET", `/api/ingredients?query=${encodeURIComponent(debounced)}`).then((result) => {
      if (current) setSuggestions({ text: debounced, names: result.ok ? result.data.map((item) => item.name) : [], failed: !result.ok });
    });
    return () => {
      current = false;
    };
  }, [debounced]);

  const ready = typed !== "" && suggestions?.text === typed;
  const searching = typed !== "" && !ready;
  const taken = new Set(tags.map((tag) => tag.toLowerCase()));
  const options: Option[] = [];
  if (ready) {
    const known = suggestions.names.filter((name) => !taken.has(name.toLowerCase()));
    options.push(...known.map((name) => ({ name, isNew: false })));
    const exists = suggestions.names.some((name) => name.toLowerCase() === typed.toLowerCase());
    if (!exists && !taken.has(typed.toLowerCase())) options.push({ name: typed, isNew: true });
  }
  const open = focused && options.length > 0;
  const activeIndex = active < options.length ? active : -1;

  function add(name: string) {
    onTagsChange(addIngredient(tags, name));
    onTextChange("");
    setActive(-1);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      // Enter adds a tag; it never saves the form.
      event.preventDefault();
      if (activeIndex >= 0) add(options[activeIndex].name);
      else if (typed) add(typed);
    } else if (event.key === "ArrowDown" && options.length > 0) {
      event.preventDefault();
      setActive((activeIndex + 1) % options.length);
    } else if (event.key === "ArrowUp" && options.length > 0) {
      event.preventDefault();
      setActive((activeIndex <= 0 ? options.length : activeIndex) - 1);
    } else if (event.key === "Escape" && open) {
      event.stopPropagation();
      setFocused(false);
    } else if (event.key === "Backspace" && text === "" && tags.length > 0) {
      onTagsChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <FieldHint id={hintId}>Type a name and press Enter, or pick a suggestion.</FieldHint>
      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={`${label} added`}>
          {tags.map((tag) => (
            <li key={tag} className={`flex items-center gap-1 rounded-md pl-3 ${controlBorder}`}>
              <span>{tag}</span>
              <IconButton
                label={`Remove ${tag}`}
                variant="ghost"
                disabled={disabled}
                className="border-0"
                onClick={() => onTagsChange(tags.filter((item) => item !== tag))}
              >
                <X size={18} aria-hidden="true" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, error && errorId].filter(Boolean).join(" ")}
          autoComplete="off"
          disabled={disabled}
          value={text}
          onChange={(event) => {
            onTextChange(event.target.value);
            setActive(-1);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`min-h-11 w-full rounded-md bg-paper px-3 pr-10 text-base text-ink ${controlBorder} disabled:opacity-60`}
        />
        {searching && (
          <span role="status" aria-label="Searching" className="absolute top-1/2 right-3 -translate-y-1/2">
            <Spinner />
          </span>
        )}
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} suggestions`}
          hidden={!open}
          // Keeps focus in the input while a suggestion is pressed.
          onMouseDown={(event) => event.preventDefault()}
          className={`mt-1 flex flex-col rounded-md bg-paper ${controlBorder}`}
        >
          {options.map((option, index) => (
            <li
              key={option.name}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              onClick={() => add(option.name)}
              className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 px-3 active:bg-ink/15 ${index === activeIndex ? "bg-ink/15" : ""}`}
            >
              <span>{option.name}</span>
              {option.isNew && <span className="rounded-md border-[1.5px] border-ink px-2 text-base">new</span>}
            </li>
          ))}
        </ul>
      </div>
      {ready && suggestions.failed && <FieldError id={`${id}-suggest-error`}>Could not load suggestions. You can still add the name.</FieldError>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </div>
  );
}
