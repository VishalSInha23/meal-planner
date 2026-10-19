"use client";

import { Check, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useApiAction } from "@/components/household/use-api-action";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-parts";
import { IconButton } from "@/components/ui/icon-button";
import { TextField } from "@/components/ui/text-field";
import { apiRequest } from "@/lib/http/api-client";
import type { Dish } from "@/modules/dish/dish-schema";
import { addIngredient, draftFromDish, emptyDishDraft, validateDishDraft, type FieldErrors } from "./dish-draft";
import { IngredientInput } from "./ingredient-input";

export interface DishDialogProps {
  // The dish being edited, or null to add one.
  dish: Dish | null;
  onClose: () => void;
  reload: () => void;
}

export function DishDialog({ dish, onClose, reload }: DishDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={dish ? dish.name : "Add dish"}>
        <DishForm dish={dish} onClose={onClose} reload={reload} />
      </DialogContent>
    </Dialog>
  );
}

function DishForm({ dish, onClose, reload }: DishDialogProps) {
  const [draft, setDraft] = useState(() => (dish ? draftFromDish(dish) : emptyDishDraft()));
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const saving = useApiAction();
  const removing = useApiAction();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const busy = saving.busy || removing.busy;
  const failure = saving.failure ?? removing.failure;
  const shown = { ...(failure?.fields ?? {}), ...errors };
  // A failure naming no field (not found, server error) is shown beside the buttons.
  const formMessage = failure && Object.keys(failure.fields).length === 0 ? failure.message : undefined;

  function edit(changes: Partial<typeof draft>) {
    setDraft({ ...draft, ...changes });
    setErrors({});
    saving.clear();
    removing.clear();
  }

  async function save() {
    // A name typed but not yet confirmed with Enter still counts.
    const ingredients = addIngredient(draft.ingredients, text);
    const result = validateDishDraft({ ...draft, ingredients });
    if (!result.ok) {
      setErrors(result.fields);
      return;
    }
    setErrors({});
    const response = await saving.run(() =>
      dish ? apiRequest("PATCH", `/api/dishes/${dish.id}`, result.payload) : apiRequest("POST", "/api/dishes", result.payload),
    );
    if (response.ok) {
      reload();
      onClose();
    }
  }

  async function remove() {
    if (!dish) return;
    const response = await removing.run(() => apiRequest("DELETE", `/api/dishes/${dish.id}`));
    if (response.ok) {
      reload();
      onClose();
    }
  }

  if (dish && confirmingDelete) {
    return (
      <div className="flex flex-col gap-4">
        <p>Delete {dish.name}? It is removed from every meal that has it. Its ingredients stay in the household list. This cannot be undone.</p>
        {formMessage && <FieldError id="dish-delete-error">{formMessage}</FieldError>}
        <div className="flex gap-2">
          <Button variant="primary" loading={removing.busy} onClick={() => void remove()}>
            Delete {dish.name}
          </Button>
          <IconButton label="Cancel" disabled={removing.busy} onClick={() => setConfirmingDelete(false)}>
            <X size={20} aria-hidden="true" />
          </IconButton>
        </div>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <TextField label="Name" value={draft.name} onChange={(event) => edit({ name: event.target.value })} error={shown.name} disabled={busy} />
      <TextField
        label="Kcal per serving"
        inputMode="numeric"
        value={draft.kcal}
        onChange={(event) => edit({ kcal: event.target.value })}
        error={shown.kcalPerServing}
        disabled={busy}
      />
      <TextField
        label="Protein per serving (g)"
        inputMode="decimal"
        value={draft.protein}
        onChange={(event) => edit({ protein: event.target.value })}
        error={shown.proteinGPerServing}
        disabled={busy}
      />
      <IngredientInput
        label="Ingredients"
        tags={draft.ingredients}
        onTagsChange={(ingredients) => edit({ ingredients })}
        text={text}
        onTextChange={setText}
        error={shown.ingredients}
        disabled={busy}
      />
      {formMessage && <FieldError id="dish-error">{formMessage}</FieldError>}
      <div className="flex gap-2">
        <IconButton label={dish ? "Save dish" : "Add dish"} type="submit" variant="primary" loading={saving.busy} disabled={busy}>
          <Check size={20} aria-hidden="true" />
        </IconButton>
        {dish && (
          <IconButton label="Delete dish" disabled={busy} onClick={() => setConfirmingDelete(true)}>
            <Trash2 size={20} aria-hidden="true" />
          </IconButton>
        )}
      </div>
    </form>
  );
}
