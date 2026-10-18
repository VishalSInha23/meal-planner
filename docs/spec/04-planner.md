# Planner

## Weeks

- The planner shows one week at a time, labelled with its dates, for example "Mon 26 Oct – Sun 1 Nov", and tagged "This week", "Next week" or "In N weeks" / "N weeks ago".
- It opens on the current week. On the planning deadline day it opens on the next week, since that is the one being planned. Previous and next buttons move a week at a time with no limit either way, and a "This week" button comes back.
- Past days stay editable.

## Meals

- Each day lists the household's meal slots in time order. A slot shows its dishes, and under each dish who eats it.
- Tapping a slot on a day opens the meal editor:
  - **Add a dish**: search the household's (not archived) dishes, or type a new name to create a dish on the spot with just that name. A dish added this way is ticked for every member who eats in that slot.
  - **Who eats it**: tick or untick each household member for each dish. Any member can be ticked, including one who doesn't usually eat in that slot. A dish nobody is ticked for stays in the meal but counts for nobody and adds nothing to the grocery list.
  - **Remove** a dish from the meal.
- A dish can be in a meal only once. Example, Thursday lunch: rice and dal ticked for the parents, cauliflower curry for everyone, roti only for the son.
- Every change is saved straight away as its own small change; there is no save button. If two people edit at the same time, each change is kept, and when both change the same thing the later one wins. Changes made by someone else appear after a refresh. Adding a dish someone else has just added says it is already in the meal and refreshes the meal; editing something someone else has just removed says so and refreshes.

## Daily nutrition

- For each day and each member: kcal and protein are the sum of one serving of every dish the member is ticked for that day.
- With a target, it reads like "1,850 / 2,000 kcal · 150 under ▼" or "2,150 / 2,000 kcal · 150 over ▲"; without a target, just the total. Within 5% of the target reads "on target".
- Dishes without a kcal or protein value count as 0 and the day notes it, for example "2 dishes have no kcal".

## Week planned

- Each week has a "Week planned" button. Pressing it marks the week as planned (by whom and when, shown on the button); pressing it again undoes it.
- The mark decides when the week's first grocery list becomes current (`05-grocery-lists.md`), and will later cancel the planning reminder.
