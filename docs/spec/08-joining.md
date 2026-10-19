# Joining a household

An account belongs to at most one household. People join an existing household with its join code, and an admin approves them. There are no email invites: the admin shares the code however they like.

## Join code

- Every household has one join code: 8 characters, uppercase letters and digits (for example `K7Q2M9XA`), unique across all households.
- Admins see it in the household settings, can copy it, and can generate a new one. The old code stops working at once; requests already made with it stay pending.
- Codes are entered case-insensitively, with surrounding spaces ignored.

## Asking to join

- An account without a household chooses, after "About you" in onboarding, between creating a household and joining one. Joining asks for the code; the request carries the name, sex and date of birth entered in "About you".
- An account that already has a household can ask to join another one from the app settings. The request carries its current member details.
- A wrong code says "No household has this code". After 10 wrong codes within an hour, the account must wait ("Too many attempts, try again in N minutes"); right codes don't count.
- Asking to join your own household is refused ("You're already in this household").
- An account has at most one pending request. It can cancel it; to ask a different household it cancels first.
- While the request is pending, nothing changes: an account without a household waits on a "Waiting for approval" screen (with cancel); an account with a household keeps using it normally and sees the pending request in the app settings.
- If joining would delete the asker's current household (see Leaving), the asker is told before sending the request: "Joining will delete <household>, with its plan, dishes and members".

## Approving

- Admins see pending requests in the household settings, with the asker's name, sex and age.
- An admin approves a request in one of two ways:
  - **Link to a member without an account**: the asker takes over that member. The member's name, sex and date of birth are replaced by the asker's (the age band is cleared); everything else stays: meal slots, targets, height, weight, activity, goal, and every meal the member is ticked for.
  - **Add as a new member**: a new member with the asker's details, eating in every meal slot, not an admin.
- An admin can decline a request. The asker sees "Your request to join <household> was declined" until they make a new request or dismiss it.
- Approving is checked again at that moment: the request must still be pending, and the asker must be able to leave their current household (see Leaving). If not, it is refused with the reason and the request stays pending. It is also refused when the asker has joined this household in the meantime (409 `already_in_household`) and when the member to link has gained an account (409 `member_has_account`). A request that is no longer pending (declined, cancelled or approved by another admin) is refused with 409 `request_not_pending`; when two admins approve the same request at once, exactly one succeeds.
- On approval, the asker leaves their current household (if any) and joins this one, in one step: there is never a moment where they are in both or in neither.

## Leaving and removing

- Any account member can leave their household from the household settings.
- The last admin can't leave while other account members remain ("Make someone else an admin first").
- When the last account member leaves (or joins another household), the household is deleted with everything in it: members, meal slots, shopping trips, dishes, ingredients, meals, plans and grocery ticks. Leaving asks for confirmation first, naming what will be deleted.
- Otherwise, leaving removes that member: they disappear from every meal they were ticked for; the household carries on.
- Admins can remove another account member the same way (they can't remove themselves, 409 `use_leave`: they leave instead). The removed account goes back to onboarding.
- Someone who left or was removed can ask to join again with the code.
