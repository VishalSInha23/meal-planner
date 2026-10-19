# Diet calculator

An estimate, not medical advice. Not for pregnancy, breastfeeding or medical conditions.

## Inputs

Sex, age in whole years, height in cm, weight in kg, activity level and goal (see `02-household.md`). The result is a suggested daily kcal and daily protein in grams. kcal is rounded to the nearest 10 and protein to the nearest whole gram, only at the end. The result also lists the main steps (for example BMR, activity factor, goal adjustment) for display.

## Age

Whole years from the date of birth. Without one, the age band's lower bound plus 2 (`1-5` is 3, `36-40` is 38, `76+` is 78), and the result says the age came from a band.

## Under 3 years

No suggestion is made (`under_3`).

## Ages 3 to 17

Energy requirement equations of the US Dietary Reference Intakes, with height in metres and weight in kg.

- Boys, 3–8: 88.5 − 61.9 × age + PA × (26.7 × weight + 903 × height) + 20. Boys, 9–17: the same with + 25.
- Girls, 3–8: 135.3 − 30.8 × age + PA × (10.0 × weight + 934 × height) + 20. Girls, 9–17: the same with + 25.
- PA for boys / girls: sedentary 1.00 / 1.00, light 1.13 / 1.16, moderate 1.26 / 1.31, active and very active 1.42 / 1.56.
- Protein in g per kg: age 3 is 1.05, ages 4–13 are 0.95, ages 14–17 are 0.85.
- The goal is not used for under-18s.

## Ages 18 and up

- BMR (Mifflin-St Jeor): 10 × weight + 6.25 × height in cm − 5 × age, then + 5 for men or − 161 for women.
- Activity factor: sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very active 1.9. Energy = BMR × factor.
- Goal: lose is energy × 0.8 but never below BMR, maintain is × 1, gain is × 1.1.
- Protein in g per kg: sedentary 0.8, light 1.0, moderate 1.2, active 1.4, very active 1.6; plus 0.2 for lose or gain (so at most 1.8).
