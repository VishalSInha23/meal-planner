# Look and settings

## Brand

- The look comes from `config/brand.json` (copied from `config/brand.example.json`): app name, icon, what the header shows (icon, text, or icon and text), the two colours for light and dark mode, and the two font families with the default style.
- Defaults: name "Ceres"; icon `/brand/icon.svg` (a steaming plate between a fork and knife, light on a dark circle), also used as the browser tab icon; the brand shows the icon only (the name stays available to screen readers); light mode ink `#1F1E1D` on paper `#F4F3EE`, dark mode the same two colours swapped; sans font Inter, serif font Source Serif 4, default style serif.
- An invalid brand file stops the build with a message naming the field. The same goes for an icon missing from `public/` and for a font whose package is not installed.

## Design

- Two colours only. Other shades are the ink colour at an opacity. Nothing relies on colour alone.
- Made to read well on matte "paper-like" phone screens, including in their monochrome reading mode: text at least 16 px, no thin lines, no shadows or gradients, large touch targets.
- Buttons are icons, not text. Each has a label for screen readers that also shows as a tooltip. Text stays only on the sign-in button.
- Small animations give feedback: buttons look pressed when tapped, and anything that loads shows a spinner. With "reduce motion" on, spinners are replaced by the text "Loading…".

## Navigation and layout

- Sections: Plan, Groceries, Dishes, Settings, each with an icon beside its name. They are a menu on the left, with the current section marked. On screens 768 px wide and up the menu is a fixed sidebar with the brand (as configured) at its top. On phones it is a drawer that slides in from the left, opened by a menu button in the header; it closes when a section is chosen, on Escape, or on a tap outside it.
- The header shows the menu button and the brand (phones only) and the theme toggle.
- Content is grouped in cards (a bordered, rounded box with an optional title and controls beside it), laid out in a grid that becomes one column on phones.

## App settings

Each account has its own app settings, saved to the account so they follow it to every device:

- **Theme**: light or dark. Until one is chosen the app follows the device setting; there is no "system" option. The header toggle switches between light and dark (its icon shows the mode it switches to; before a choice it starts from the device's current mode). The settings page has the same toggle with the current mode written next to it.
- **Font style**: serif or sans. The default comes from the brand config. Each option is previewed in its own font.
- **Units**: weight in kilograms or pounds (default kg) and height in centimetres or feet and inches (default cm), in a "Units" card. They decide how the member form shows and accepts height and weight; stored values stay in kg and cm. 1 kg is 2.20462 lb and 1 inch is 2.54 cm. Kilograms and pounds are shown with one decimal, feet and inches in whole inches (12 inches become the next foot).
- Settings are saved when changed, with a spinner on the changed control. The theme (once chosen) and font are also kept in cookies (one year), so the sign-in page and a new device look right before anyone signs in. The page is rendered with the right theme and font from the first byte, so there is no flash on load.
- **Account**: the signed-in email and a sign-out button.
- **Household**: a link to the household settings.
