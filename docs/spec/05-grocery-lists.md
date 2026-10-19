# Grocery lists

Grocery lists are worked out from the plan; they are never edited by hand. Ceres assumes that groceries were bought and meals cooked as planned, so the current list moves on by itself at each shopping point.

## How a week is cut into lists

- A meal's time is its date plus its slot's time, in local time. A meal belongs to the week that contains its date.
- Each week has one list more than the number of shopping trips that fall inside it. A meal goes into list number N, where N (counting from 0) is the number of the week's shopping trips that are strictly earlier than the meal. So a meal at the same time as a trip belongs to the list before that trip.
- A list contains every distinct ingredient of every dish in its meals that at least one member is ticked for. Each item shows which dishes need it. Items are sorted by name.
- A list with no items says "Nothing to buy for this period".

## When each list is for

- The shopping time of a trip's list is the trip's time.
- The shopping time of a week's first list is the moment the week was marked planned, or the week's start if it wasn't marked by then, but never earlier than the shopping time of the previous week's last list. (Planning two weeks ahead doesn't skip the week in between.)
- The current list is the latest list, in order, whose shopping time has passed. There is always one, because the current week's start has passed.

## Worked example

A household with weeks Monday to Sunday, slots Breakfast 08:00, Lunch 13:00 and Dinner 20:00, and shopping trips Tuesday 21:00 and Friday 10:00. The week is marked planned on the Sunday before, at 14:00.

| List | Meals | Shopping time |
|---|---|---|
| 1 | Monday breakfast to Tuesday dinner | Sunday 14:00 (marked planned) |
| 2 | Wednesday breakfast to Friday breakfast | Tuesday 21:00 |
| 3 | Friday lunch to Sunday dinner | Friday 10:00 |

On Saturday at 12:00 the current list is list 3. When the next week is marked planned on Sunday at 15:00, the next week's list 1 becomes current. If nobody marks it, it becomes current on Monday at 00:00.

## Grocery page

- The current list comes first, labelled with the meals it covers ("Wed 21 Oct breakfast – Fri 23 Oct breakfast") and its shopping time.
- Items can be ticked off. Ticks are saved and shared with the household, and have no effect on when the next list starts.
- "Previous" shows the lists whose shopping time was in the 7 days before the current list's. "Upcoming" shows the lists after the current one, for weeks that have any meals.
- Because lists are worked out from the plan, changing a meal also changes its list, including a list that is already past. Ticks belong to a list (its week and position in the week) and an ingredient; changing the shopping trips or the week start re-cuts the lists, and earlier ticks may no longer match.
