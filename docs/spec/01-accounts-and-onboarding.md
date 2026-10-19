# Accounts and onboarding

## Sign-in

- Sign-in is with Google only. Ceres never stores passwords.
- Anyone signed out who opens a page is sent to the sign-in page. After signing in they land on the planner, or on onboarding if their account has no household yet.
- Signing out is in the app settings.

## Onboarding

An account without a household always goes to onboarding, and the rest of the app is unavailable until it is finished. After "About you", the person either creates a household (the steps below) or asks to join one with its code (`08-joining.md`). Creating has three steps. Moving back and forward keeps what was entered. Nothing is saved until the last step is submitted; then the household and all its members are created together, or nothing is (one transaction).

1. **About you**: name (prefilled from the Google account), sex (male or female, required), date of birth (required; it can't be in the future or less than one year ago).
2. **Household**:
   - name (required, 1–60 characters);
   - week start day (default Monday);
   - meal slots: defaults Breakfast 08:00, Lunch 13:00, Dinner 20:00. Slots can be added, renamed, retimed and removed, and are always shown in time order (a row moves to its place when its time field loses focus); at least one is required, and no two slots may share a name or a time;
   - shopping trips: zero or more, each a day of the week and a time; no two at the same day and time;
   - which slots you eat in (default all).
3. **Other members**: zero or more, added by you. Each has a name, sex, age band and the slots they eat in (default all).

When onboarding is submitted, the account's member is an admin and the user lands on the planner.

## Age

- Age bands: 1–5, 6–10, 11–15, and so on up to 71–75, then 76+. Under 1 is not supported.
- Your own entry asks the date of birth; members added by someone else are given an age band. A date of birth can be added to them later in the household settings. When a member has one, it is used instead of the band. A member always has a band or a date of birth; the date can't be in the future or less than one year ago.
