import { describe, expect, it } from "vitest";
import { dishNameSchema } from "@/modules/dish/dish-schema";
import { ingredientNameSchema } from "@/modules/ingredient/ingredient-schema";
import { normalizeName } from "./text.ts";

describe("normalizeName", () => {
  it("capitalises the first letter and keeps the rest as typed", () => {
    expect(normalizeName("dal makhani")).toBe("Dal makhani");
    expect(normalizeName("Dal Makhani")).toBe("Dal Makhani");
    expect(normalizeName("dAL")).toBe("DAL");
  });

  it("turns each kind of dash into a space", () => {
    expect(normalizeName("aloo-gobi")).toBe("Aloo gobi");
    expect(normalizeName("aloo–gobi")).toBe("Aloo gobi");
    expect(normalizeName("aloo—gobi")).toBe("Aloo gobi");
    expect(normalizeName("-aloo - gobi-")).toBe("Aloo gobi");
  });

  it("collapses repeated spaces and trims", () => {
    expect(normalizeName("dal  makhani")).toBe("Dal makhani");
    expect(normalizeName("   dal   makhani  ")).toBe("Dal makhani");
  });

  it("leaves a non-letter first character alone", () => {
    expect(normalizeName("7 spice mix")).toBe("7 spice mix");
    expect(normalizeName("(special) dal")).toBe("(special) dal");
  });

  it("is applied by the name schemas, which reject a name of only dashes", () => {
    expect(dishNameSchema.parse("aloo-gobi")).toBe("Aloo gobi");
    expect(ingredientNameSchema.parse("spring-onion")).toBe("Spring onion");
    expect(dishNameSchema.safeParse("- – —").success).toBe(false);
    expect(ingredientNameSchema.safeParse("---").success).toBe(false);
  });
});
