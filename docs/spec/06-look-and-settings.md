# Look and settings

## Brand

- The look comes from `config/brand.json` (copied from `config/brand.example.json`): app name, icon, what the header shows (icon, text, or icon and text), the two colours for light and dark mode, and the two font families with the default style.
- Defaults: name "Ceres"; icon `/brand/icon.svg` (a steaming plate between a fork and knife, light on a dark circle), also used as the browser tab icon; header shows the name as text only; light mode ink `#1F1E1D` on paper `#F4F3EE`, dark mode the same two colours swapped; sans font Inter, serif font Source Serif 4, default style serif.
- An invalid brand file stops the build with a message naming the field.

## Design

- Two colours only. Other shades are the ink colour at an opacity. Nothing relies on colour alone.
- Made to read well on matte "paper-like" phone screens, including in their monochrome reading mode: text at least 16 px, no thin lines, no shadows or gradients, large touch targets.
- Small animations give feedback: buttons look pressed when tapped, and anything that loads shows a spinner. With "reduce motion" on, spinners are replaced by the text "Loading…".

## Navigation

- Sections: Plan, Groceries, Dishes, Settings. On a phone they are a bar at the bottom of the screen; on wider screens they sit in the header.
- The header shows the brand (as configured) and the theme toggle.

## App settings

Each account has its own app settings, saved to the account so they follow it to every device:

- **Theme**: system (default), light or dark. Also switchable from the header toggle, which cycles system → light → dark.
- **Font style**: serif or sans. The default comes from the brand config. Each option is previewed in its own font.
- **Account**: the signed-in email and a sign-out button.
- **Household**: a link to the household settings.
