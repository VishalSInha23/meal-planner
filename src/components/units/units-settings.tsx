"use client";

import { useState } from "react";
import { RadioGroup } from "@/components/ui/radio-group";
import { apiRequest } from "@/lib/http/api-client";
import type { Units } from "@/modules/user-preference/user-preference-schema";

const weightOptions = [
  { value: "kg", label: "Kilograms (kg)" },
  { value: "lb", label: "Pounds (lb)" },
];

const heightOptions = [
  { value: "cm", label: "Centimetres (cm)" },
  { value: "ft_in", label: "Feet and inches (ft and in)" },
];

// Each unit is saved as soon as it is picked, with a spinner on the option being saved.
export function UnitsSettings({ initial }: { initial: Units }) {
  const [units, setUnits] = useState(initial);
  const [pending, setPending] = useState<{ field: keyof Units; value: string } | null>(null);
  const [error, setError] = useState<{ field: keyof Units; message: string } | null>(null);

  async function save(field: keyof Units, value: string) {
    setPending({ field, value });
    setError(null);
    const result = await apiRequest("PUT", "/api/preferences", { [field]: value });
    if (result.ok) setUnits((current) => ({ ...current, [field]: value }));
    else setError({ field, message: `Could not save the ${field === "weightUnit" ? "weight" : "height"} unit. Try again.` });
    setPending(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <RadioGroup
        legend="Weight"
        options={weightOptions}
        value={units.weightUnit}
        onValueChange={(value) => void save("weightUnit", value)}
        loadingValue={pending?.field === "weightUnit" ? pending.value : undefined}
        error={error?.field === "weightUnit" ? error.message : undefined}
        disabled={pending !== null}
      />
      <RadioGroup
        legend="Height"
        options={heightOptions}
        value={units.heightUnit}
        onValueChange={(value) => void save("heightUnit", value)}
        loadingValue={pending?.field === "heightUnit" ? pending.value : undefined}
        error={error?.field === "heightUnit" ? error.message : undefined}
        disabled={pending !== null}
      />
    </div>
  );
}
