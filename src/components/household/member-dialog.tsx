"use client";

import { Check, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-parts";
import { IconButton } from "@/components/ui/icon-button";
import { Switch } from "@/components/ui/switch";
import { localToday } from "@/lib/time/week";
import { apiRequest } from "@/lib/http/api-client";
import type { HouseholdOverview } from "@/modules/household/household-schema";
import type { MemberWithSlots } from "@/modules/member/member-schema";
import type { Units } from "@/modules/user-preference/user-preference-schema";
import { draftFromMember, emptyMemberDraft, validateMemberDraft, type FieldErrors } from "./member-draft";
import { MemberForm } from "./member-form";
import { SuggestTargets } from "./suggest-targets";
import { rowMessage, useApiAction } from "./use-api-action";

export interface MemberDialogProps {
  // The member being edited, or null to add a member without an account.
  member: MemberWithSlots | null;
  overview: HouseholdOverview;
  viewer: MemberWithSlots;
  // The signed-in user's height and weight units.
  units: Units;
  onClose: () => void;
  reload: () => Promise<void>;
}

export function MemberDialog({ member, overview, viewer, units, onClose, reload }: MemberDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={member ? member.name : "Add member"}>
        <MemberDialogBody member={member} overview={overview} viewer={viewer} units={units} onClose={onClose} reload={reload} />
      </DialogContent>
    </Dialog>
  );
}

function MemberDialogBody({ member, overview, viewer, units, onClose, reload }: MemberDialogProps) {
  const slots = overview.mealSlots.map((slot) => ({ id: slot.id, name: slot.name }));
  const [draft, setDraft] = useState(() => (member ? draftFromMember(member, units) : emptyMemberDraft(slots.map((slot) => slot.id))));
  const [isAdmin, setIsAdmin] = useState(member?.isAdmin ?? false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const saving = useApiAction();
  const removing = useApiAction();

  const viewerIsAdmin = viewer.isAdmin;
  const canEdit = member ? viewerIsAdmin || member.id === viewer.id : viewerIsAdmin;
  const showAdminSwitch = viewerIsAdmin && member !== null && member.userId !== null;
  const canRemove = viewerIsAdmin && member !== null && member.id !== viewer.id;
  const failure = saving.failure ?? removing.failure;

  // The API names the field it rejected; a last-admin conflict belongs next to the Admin switch.
  const apiErrors: FieldErrors = { ...(failure?.fields ?? {}) };
  if (failure?.code === "last_admin") apiErrors.isAdmin = failure.message;
  const formMessage = failure?.code === "last_admin" ? undefined : rowMessage(failure);
  const shown = { ...apiErrors, ...errors };

  function edit(next: typeof draft) {
    setDraft(next);
    setErrors({});
    saving.clear();
  }

  async function save() {
    const today = localToday(new Date());
    const result = validateMemberDraft(draft, today, units, member ?? undefined);
    if (!result.ok) {
      setErrors(result.fields);
      return;
    }
    setErrors({});
    const body = member && showAdminSwitch && isAdmin !== member.isAdmin ? { ...result.payload, isAdmin } : result.payload;
    const response = await saving.run(() =>
      member ? apiRequest("PATCH", `/api/members/${member.id}`, body) : apiRequest("POST", "/api/members", body),
    );
    if (response.ok) {
      await reload();
      onClose();
    }
  }

  async function remove() {
    if (!member) return;
    const response = await removing.run(() => apiRequest("DELETE", `/api/members/${member.id}`));
    if (response.ok) {
      await reload();
      onClose();
    }
  }

  if (member && confirmingRemove) {
    return (
      <div className="flex flex-col gap-4">
        <p>
          Remove {member.name}? They are also removed from every meal they were ticked for.
          {member.userId !== null && " Their account leaves the household and goes back to onboarding."} This cannot be undone.
        </p>
        {formMessage && <FieldError id="remove-member-error">{formMessage}</FieldError>}
        <div className="flex gap-2">
          <Button variant="primary" loading={removing.busy} onClick={remove}>
            Remove {member.name}
          </Button>
          <IconButton label="Cancel" disabled={removing.busy} onClick={() => setConfirmingRemove(false)}>
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
        if (canEdit) void save();
      }}
    >
      {!canEdit && <p className="text-ink/75">Only admins can change other members.</p>}
      <MemberForm
        draft={draft}
        onChange={edit}
        units={units}
        slots={slots}
        errors={shown}
        disabled={!canEdit || saving.busy}
        targetsExtra={canEdit && <SuggestTargets draft={draft} onApply={edit} units={units} disabled={saving.busy} />}
      />
      {showAdminSwitch && (
        <Switch
          label="Admin"
          checked={isAdmin}
          onCheckedChange={(value) => {
            setIsAdmin(value);
            saving.clear();
          }}
          error={shown.isAdmin}
          disabled={saving.busy}
        />
      )}
      {formMessage && <FieldError id="member-error">{formMessage}</FieldError>}
      {canEdit && (
        <div className="flex gap-2">
          <IconButton label={member ? "Save member" : "Add member"} type="submit" variant="primary" loading={saving.busy}>
            <Check size={20} aria-hidden="true" />
          </IconButton>
          {canRemove && (
            <IconButton label="Remove member" disabled={saving.busy} onClick={() => setConfirmingRemove(true)}>
              <Trash2 size={20} aria-hidden="true" />
            </IconButton>
          )}
        </div>
      )}
    </form>
  );
}
