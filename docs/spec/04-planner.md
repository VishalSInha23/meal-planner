# Planner

## Weeks

- The planner shows one week at a time, labelled with its dates, for example "Mon 26 Oct – Sun 1 Nov", and tagged "This week", "Next week" or "In N weeks" / "N weeks ago".
- It opens on the current week. On the planning deadline day it opens on the next week, since that is the one being planned. Previous and next buttons move a week at a time with no limit either way, and a "This week" button comes back.
- Past days stay editable.

## Meals

- Each day lists the household's meal slots in time order. A slot shows its dishes, and under each dish who eats it.
- Tapping a slot on a day opens the meal editor:
  - **Add a dish**: search the household's dishes, or type a new name to create a dish on the spot with just that name. A dish added this way is ticked for every member who eats in that slot.
  - **Who eats it**: tick or untick each household member for each dish. Any member can be ticked, including one who doesn't usually eat in that slot. A dish nobody is ticked for stays in the meal but counts for nobody and adds nothing to the grocery list.
  - **Remove** a dish from the meal.
- A dish can be in a meal only once. Example, Thursday lunch: rice and dal ticked for the parents, cauliflower curry for everyone, roti only for the son.
- Every change is saved straight away as its own small change; there is no save button. If two people edit at the same time, changes to different dishes are all kept. A change to a dish that someone else changed since you last saw it is refused: the planner shows their change under the dish with "Someone else changed this just now", and you choose to apply yours ("Apply my change") or keep theirs ("Keep theirs"). Quick taps of your own on the same dish never refuse each other. Ticking someone who is already ticked changes nothing and is never refused for that reason. While the planner is open and visible it shows other people's changes within `plannerRefreshSeconds` (app config), and at once when you come back to it. Adding a dish someone else has just added says it is already in the meal and refreshes the meal; editing something someone else has just removed says so and refreshes.

## Copying

- Most weeks repeat, so the week header has "Copy last week" and each day has "Copy day", which asks for the day to copy to (the next day by default). Neither asks for confirmation.
- A copy takes every dish of every meal in the source days and puts it in the meal of the same slot on the matching day of the target (the same day of the week for a week, the chosen day for a day). A dish that is not in the target meal yet is added, ticked for the same members as in the source. A dish that is already in the target meal is left as it is, ticks included. Nothing in the target is removed.
- So copying again adds nothing, and two copies at once end exactly as one. The planner then says "Added N dishes", or "Nothing new to copy" when nothing was added.
- Copying a week needs two different week starts; copying a day needs two different valid dates. Anything else is refused.
- Copied meals are part of the plan like any other, so they show in the target week and its grocery lists.

## Daily nutrition

- For each day and each member: kcal and protein are the sum of one serving of every dish the member is ticked for that day.
- With a target, it reads like "1,850 / 2,000 kcal · 150 under ▼" or "2,150 / 2,000 kcal · 150 over ▲"; without a target, just the total. Within 5% of the target reads "on target".
- Dishes without a kcal or protein value count as 0 and the day notes it, for example "2 dishes have no kcal".

## Week planned

- Each week has a "Week planned" button. Pressing it marks the week as planned (by whom and when, shown on the button); pressing it again undoes it.
- The mark decides when the week's first grocery list becomes current (`05-grocery-lists.md`).
