# Overview

Ceres helps a household plan what they will eat for the coming week, or several weeks ahead, from the dishes they already know how to cook. It shows rough daily calories and protein for each person against their targets, and a grocery list for each shopping trip. It does not generate meal plans or recipes: the household decides, Ceres keeps track.

The intended rhythm: once a week, before the planning deadline, the household spends half an hour planning the next week together. After that nobody has to think about what to cook today, and each shopping trip has its list ready.

## Glossary

- **Account**: someone who signs in, with Google. An account belongs to at most one household.
- **Household**: the people who plan and eat together. Any size: one person living alone, a couple, roommates, a large joint family.
- **Member**: anyone who eats in the household. A member is either linked to an account or not (a child, a grandparent who doesn't use the app).
- **Admin**: an account member who manages household settings and the members without accounts. The account that creates the household is its first admin.
- **Meal slot**: a named time of day when the household eats, for example Breakfast at 08:00. Each member eats in some of the slots.
- **Dish**: something the household cooks, with its ingredients and, optionally, kcal and protein per serving.
- **Meal**: what is eaten in one slot on one date: a list of dishes, each ticked for the members who eat it.
- **Week**: seven days starting on the household's week start day.
- **Planning deadline**: the last day of the week before the one being planned.
- **Shopping trip**: a weekly day and time when the household buys groceries.
- **Grocery list**: the ingredients needed for the meals between two shopping points.

## Spec files

- `01-accounts-and-onboarding.md`: sign-in and first-time setup.
- `02-household.md`: household settings, members, meal slots, shopping trips.
- `03-dishes.md`: dishes and ingredients.
- `04-planner.md`: planning meals and daily nutrition.
- `05-grocery-lists.md`: how grocery lists are cut and which one is current.
- `06-look-and-settings.md`: brand, theme, fonts, app settings, navigation.

## Not in this version

Joining another household, reminders and notifications (their times are stored only), portion sizes, ingredient quantities and units, recipes, calculated targets, offline use, languages other than English.
