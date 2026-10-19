# Household

## Who can do what

- Everyone in the household sees all members and all their details.
- Admins edit the household settings, the meal slots, the shopping trips, the members without accounts, and which slots any member eats in.
- Each account member edits their own details.
- Everyone edits dishes and meals.
- Admins approve requests to join, see and regenerate the join code, and can remove other account members; any account member can leave (`08-joining.md`).
- Only members with an account can be admins (setting admin on a member without an account is a 400 on `isAdmin`).
- A household always has an admin: an admin can't remove their own admin right while nobody else is admin (409 `last_admin`, "Make someone else an admin first").

## Settings

- **Name** and **week start day**. Dates and times are the server's local time. Changing the week start day changes how weeks are shown and cut; meals stay on their dates, and "week planned" marks made for the old week starts no longer apply.
- **Planning deadline**: always the day before the week start day (week starts Monday, the deadline is Sunday; week starts Wednesday, it is Tuesday).
- **Meal slots**: name (1–30 characters, unique in the household), time of day, shown in time order. Changing a slot's time keeps its meals in that slot. A slot that any meal uses can't be removed; the message says how many meals use it. The household's only slot can't be deleted (409 `last_slot`), and neither can a slot that is some member's only slot (409 `member_needs_slot`, "Priya eats only in this slot").
- **Shopping trips**: a day of the week and a time each, unique. They decide how grocery lists are cut (`05-grocery-lists.md`).

## Members

- Fields: name (1–40 characters), sex (male or female), age band or date of birth (at least one, see `01-accounts-and-onboarding.md`), daily kcal target (optional, 500–6000), daily protein target in grams (optional, 10–300), height in cm (optional, 50–250, one decimal), weight in kg (optional, 5–300, one decimal), activity level (optional: sedentary, light, moderate, active or very active), goal (optional: lose, maintain or gain), the slots they eat in (at least one).
- Height and weight are always stored in cm and kg. The member form shows and accepts them in the signed-in user's units (see `06-look-and-settings.md`) and converts to metric before saving. An untouched height or weight keeps its stored value, so the rounding of the display never changes it. The activity level choices read: Sedentary "little or no exercise", Light "exercise 1–3 days a week", Moderate "3–5 days a week", Active "6–7 days a week", Very active "hard daily exercise or a physical job". The goal choices read Lose weight, Maintain, Gain weight.
- Removing a member without an account also removes them from every meal they were ticked for.
