# Noor Transport implementation and verification

The implementation uses the two user-provided screenshot sheets and the Bengali
admin feature plan. It extends the existing React Native/NestJS/PostgreSQL system.
No source Figma URL, editable design components, original logo or separate source
photographs were provided. Colors, cards, screen hierarchy and navigation follow
the references; recreated artwork, platform fonts/icons, live data and accessibility
sizing mean this is not a verified pixel-for-pixel reproduction.

## Implemented

- Green Noor branding, welcome, admin/parent login and separate dashboards.
- Admin Home / Vehicles / Students / Payments / More navigation; parent
  Home / Trip / Payment / Notice / More navigation.
- Student profile migration/backfill, stable subscription association, class/roll,
  guardian details, image selection, route/stop/vehicle assignment and monthly fare.
- Driver profiles, vehicle assignment, salary record links, attendance and status.
- Vehicle model/purchase/fitness/license dates, operational status, route details
  and editable morning/afternoon stop schedules.
- Explicit daily attendance recording; missing entries remain unrecorded.
- Maintenance records with transactionally linked completed-work expenses.
- Manual income/expense/investment entries, paid fare income and month summaries.
  Investment is excluded from operating profit and payment proofs are not counted
  as received money until approved.
- Targeted in-app notices, absence/leave/maintenance requests and review decisions.
- Call/SMS/WhatsApp handoff links and configurable message templates.
- Business/profile settings and safe guardian-only settings access.
- Real monthly finance reports with native PDF and Excel-readable CSV export.
- Parent four-step admission with image picker, application status, child profile,
  actual schedule/attendance, live tracker map and contacts.
- Existing manual bKash/Rocket payment verification, notifications, GPS history and
  complaints/service-stop flows remain available. Paid bills have PDF receipts.
- Version 2 database migration upgrades existing installations, backfills students
  and drivers and preserves old payments/requests/GPS records.

## Verification

Testing uses a disposable PostgreSQL server bound to localhost, separate `noor_test`
and `noor_preview` databases, and an isolated Android emulator. Preview names,
vehicles, payments and attendance are synthetic fixtures confined to that local
preview database. No production records were changed. No calls or external
messages were sent. The updated API has not been deployed to the VPS.

Commands run:

```sh
# android-app-vehicle-tracker
npm run typecheck
npm run lint
npm test -- --runInBand
npx react-native bundle --platform android --dev false --entry-file index.js \
  --bundle-output /tmp/noor.android.bundle --assets-dest /tmp/noor-bundle-assets
cd android
./gradlew :app:assembleDebug :app:assembleRelease

# gps-tracker-api — disposable TEST_DATABASE_URL only
npm run typecheck
TEST_DATABASE_URL=<disposable database> npm test
```

Test coverage includes guardian isolation and revoked access, version 1 upgrades,
new admission fields, empty/invalid dates, historical fare protection, atomic
maintenance/expense writes and rollback, explicit attendance, notices and recipients,
real finance totals, expired-session races, UI form retry behavior, and PDF/CSV
content selection. Passing checks do not guarantee an absence of defects on every
Android device or in an untested deployment.

Verified on 10 September 2026:

| Check | Result |
|---|---|
| Android TypeScript | Passed |
| Android ESLint | Passed, zero warnings/errors |
| Android Jest | 155 tests in 26 suites passed |
| Backend TypeScript and Nest build | Passed |
| Backend unit and PostgreSQL/HTTP integration | 96 tests passed, zero skipped |
| Android debug and unsigned release builds | Passed |
| Git whitespace check, both projects | Passed |

The isolated emulator uses the installed Android `android-37.1` Google APIs ARM64
system image, 1080 × 2400 at 440 dpi. Admin dashboard,
student/driver lists and profile/edit forms, attendance, maintenance, accounts,
notices, menu and report screens were inspected with local fixture data. This
inspection found and corrected narrow name/search rows and a repeated class
prefix. Parent login and welcome inspection found and corrected status-bar and
tagline contrast. Manual device checks supplement the automated tests; they do
not cover every form combination or physical device.

Parent login, home, child profile, scheduled journey, tracking marker/coordinates,
receipt list/detail, required admission field validation, contacts and confirmed
logout were exercised on the emulator. No `ReactNativeJS` or `AndroidRuntime`
error entries were found during this run.

The tracking screenshot contains the simulated vehicle marker and coordinates,
but its raster map imagery had not loaded. Map tile rendering on this emulator
was not verified. A diagnostic request from the host using the existing app's
identification headers returned an image from the configured tile endpoint; that
does not establish successful rendering inside the emulator WebView.

The report screen successfully saved a real native PDF through Android's document
picker. [The exported sample](noor-monthly-2026-09.pdf) is a readable one-page A4
document with Bengali text and the expected local-fixture financial totals:
৳20,700 billed, ৳13,100 paid, ৳7,600 due, ৳2,000 expense and ৳11,100 net cash income.

Screenshots are stored alongside this file. Empty states, offline markers and
absent GPS fixes show actual API state. Preview GPS coordinates, when present,
are explicitly seeded simulation data in the disposable preview database.

- [Welcome](01-welcome.png), [parent login](13-parent-login.png)
- [Admin dashboard](02-admin-home.png), [students](03-students.png),
  [student profile](04-student-profile.png), [drivers](05-drivers.png)
- [Attendance](07-attendance.png), [maintenance](08-maintenance.png),
  [accounts](09-accounts.png), [notices](10-notices.png), [reports](11-reports.png)
- [Parent dashboard](14-parent-home.png), [child profile](15-parent-profile.png),
  [journey](16-parent-journey.png), [tracking](17-parent-tracking.png)
- [Receipts](20-parent-receipts.png), [receipt detail](21-parent-receipt-detail.png),
  [admission](22-parent-admission.png)

## Artwork provenance

`assets/branding/noor-login-background.png` was generated with the built-in
imagegen tool. The consumed asset is stored in the project. The logo and interface
icons are React Native drawing primitives, so they scale with the UI.

Final image prompt:

> Create ONLY a portrait background photograph asset for the Noor Transport Android
> login screen, inspired by the attached Noor Transport admin screenshot.
> Photorealistic yellow school minibus in three-quarter front view on the right of a
> tree-lined quiet Bangladeshi road, mosque/madrasa white dome and elegant minaret on
> the left, soft pale blue sky, golden morning sunshine. Tall portrait 1024x1536;
> upper 35% quiet pale sky suitable for overlaying a logo; bus centered at 55%
> vertical height, middle right; lower 30% transitions to white with emerald and
> mint curved waves at the bottom. No text, letters, logos, UI, border, phone frame
> or people. A production app asset, not a UI screenshot.

## Boundaries

The screenshot's future automation is not simulated: there is no payment gateway,
FCM background push, bulk SMS/WhatsApp delivery, calculated ETA, automatic child
pickup/drop detection, driver login or multi-branch system. PDF and CSV exports
are implemented; native `.xlsx` workbook output is not. Native photo/PDF features
are Android-only because this repository currently has no restored iOS project.
The new management copy is Bengali; existing localized flows retain language
selection. Release APKs remain unsigned until a private production signing key is
configured, following the repository's existing release policy.
