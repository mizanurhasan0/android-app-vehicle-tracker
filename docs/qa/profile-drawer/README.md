# Responsive account drawer

The previous half-screen panel left too little room for account names, readable
language controls, and profile editing. The revised drawer stays full-height and
uses the available phone width minus a 24dp dismissal area, capped at 380dp on
larger screens.

The account overview contains a compact identity card, one edit action, visible
English/Bangla choices, and a separate sign-out action. Editing replaces the menu
with a dedicated form. Android back returns to the overview; closing the drawer
remains a separate action. Motion uses a restrained slide and a short form fade,
with reduced-motion support.

## Verification

- 21 relevant Jest tests passed, including profile save/error/retry, duplicate-save
  prevention, language persistence, navigation, and reduced motion.
- Targeted ESLint and TypeScript passed after implementation.
- Visual checks used an isolated Android emulator and a local fixture API with
  fictional data. No connected phone or production records were used.
- Checked the default phone layout, 320dp width with 1.3× Bengali text, and the
  dedicated edit view, plus an 800dp tablet layout with the drawer capped at 380dp. A fictional profile update was saved and reflected in
  the account card. Keyboard dismissal retained the draft.

## Screenshots

- [Account overview](account.png)
- [Edit profile](edit-profile.png)
- [320dp Bengali with larger text](small-bengali.png)
- [800dp tablet](tablet.png)
