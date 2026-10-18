# Household

## Who can do what

- Everyone in the household sees all members and all their details.
- Admins edit the household settings, the meal slots, the shopping trips, the members without accounts, and which slots any member eats in.
- Each account member edits their own details.
- Everyone edits dishes and meals.
- Members with accounts can't be removed in this version (only one account per household exists until joining is supported).

## Settings

- **Name**, **timezone** and **week start day**. The timezone decides what "today" is, where weeks begin and end, and how grocery lists are cut. Changing the week start day changes how weeks are shown and cut; meals stay on their dates, and "week planned" marks made for the old week starts no longer apply.
- **Planning reminder time**: stored for later reminders. The planning deadline is always the day before the week start day (week starts Monday, the deadline is Sunday; week starts Wednesday, it is Tuesday).
- **Meal slots**: name (1–30 characters, unique in the household), time of day, shown in time order. Changing a slot's time keeps its meals in that slot. A slot that any meal uses can't be removed; the message says how many meals use it.
- **Shopping trips**: a day of the week and a time each, unique. They decide how grocery lists are cut (`05-grocery-lists.md`).

## Members

- Fields: name (1–40 characters), sex (male or female), age band or date of birth (at least one, see `01-accounts-and-onboarding.md`), daily kcal target (optional, 500–6000), daily protein target in grams (optional, 10–300), the slots they eat in (at least one).
- Removing a member without an account also removes them from every meal they were ticked for.
