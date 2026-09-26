# Noor Transport Android

React Native Android app for guardian transport requests, assigned vehicle tracking,
configurable payment methods with QR images and payment evidence and an admin review workspace.

## Run locally

Requirements: Node >=22.11 (Node >=22.22 for the companion API), JDK 17, Android SDK
36, and an emulator or device. The restored native app uses package
`com.pathsathi.transport` and React Native 0.86.2.

```sh
npm ci
npm start
# In a second terminal:
npm run android
```

Debug builds install as **Noor Transport (Debug)** with application ID
`com.pathsathi.transport.debug`. They can coexist with the release app
(`com.pathsathi.transport`) without signing-key conflicts or removing its data.
Sign in separately in the debug app. The `android` script includes the matching
launch suffix; when running the React Native CLI directly, use
`npx react-native run-android --appIdSuffix debug`.

Both debug and release apps default to the deployed API at
`http://147.79.71.98:3000`; live Socket.IO uses port 3001. No local backend is
needed. On the first upgrade, saved loopback/emulator defaults move to this VPS
and the old server session is cleared. Other custom server settings are retained.

For local development, open **School server settings** and select
`http://10.0.2.2:3000` (emulator), a LAN origin, or use `adb reverse tcp:3000 tcp:3000`
with `http://127.0.0.1:3000`. Reverse port 3001 too for live locations.
Release Android permits HTTP only to the deployed VPS host; other custom release
origins must use HTTPS. HTTPS deployments proxy `/socket.io/` on the same origin.
This VPS currently uses HTTP, so traffic is not encrypted. When HTTPS is deployed,
update `src/api/server.ts` and remove the native VPS cleartext exception.

Native network configuration changes require a rebuilt/reinstalled APK; a Metro
reload alone does not apply them.

`android/local.properties` is machine-specific and ignored. Set `sdk.dir` there
or configure your Android SDK environment. No production credentials or payment
numbers are included.

## First setup

1. Bootstrap an admin in the API using `ADMIN_PHONE` / `ADMIN_PASSWORD`.
2. Sign in as admin. Open **Payment accounts** to add any payment method: name, receiving account number, optional QR image and instructions. Use **Create vehicle**, then **Routes** to
   add a route with start points.
3. A guardian creates an account with their phone and password, then submits a
   student name, route and stop from **Requested → Request forms**.
4. Admin reviews the route/vehicle and approves. The assigned vehicle becomes
   visible to the guardian. One guardian can have multiple students/services.
5. Admin generates that month's bills from **Bills**. This is an explicit admin
   action, not an unattended scheduled charge.
6. Guardian sends the full amount outside this app, opens a bill, selects the
   method and submits sender/receiver numbers with a transaction ID or evidence image.
7. Admin independently verifies the transfer and approves or rejects with a
   reason. Approval marks the bill paid and creates a guardian notification.
   Rejection leaves it unpaid and allows corrected resubmission.

## Behaviour and boundaries

### Error feedback

Action errors and warnings appear as dismissible toasts, including over open
dialogs. Toasts support Bangla/English and Android accessibility timeout settings.
Invalid inputs receive a red outline and field-specific help; editing an input
clears its error while preserving the rest of the form. Connection failures keep
entered values available for retry. Saved payment notes remain visible in history.

For new forms, use `useAction` and throw `ValidationError({ fieldName: message })`
for validation failures. Bind `action.fieldErrors.fieldName` to the control's
`error` prop and call `action.clearFieldError('fieldName')` when it changes.
API validation errors are mapped to field keys by the API client. Use
`showToast(message, 'warning')` for action warnings. Custom native modals need a
`ToastHost modal` mounted only while visible; `FormModal` includes one already.

### Monthly fares by journey

In admin **Routes**, create a route with the start and end points in
travel order, then open **Manage route fares** on that route. Save a monthly fee for each
start/end point pair. For example, Uttara → Khilkhet can cost ৳1,000 while
Uttara → Mirpur costs ৳1,500 on the same vehicle. Enter taka in the app; the API
stores integer poisha. Reverse journeys need their own fare entry.

When admitting a student or editing their transport assignment, select the route,
start and end points. The configured fee is shown before saving and is
verified by the API. Guardian applications carry the chosen stops; approval
uses the fare configured at that time. Routes with configured fares require an
end point for new guardian applications. Admins can retain a flat fee by leaving
the end point empty. Routes without fare entries retain their default monthly fee.

Changing the route's fare table does not automatically change existing students'
agreed fees. A changed student journey uses its configured fare for bills generated
afterward. Previously generated bills and payment receipts retain their amounts.
Update the companion API before using the new app; its database migration runs
automatically on startup and preserves existing routes and subscriptions.

### Other boundaries

- **No payment gateway**, no wallet PIN/OTP collection and no automatic checking
  of external transactions. Approval always requires an admin decision.
- Payment amounts use integer poisha at the API boundary. Partial payments,
  refunds and proration are not implemented; full monthly fees apply.
- Payment receiver details are captured when a method is selected, and the form
  lets the guardian supply a previously configured admin number if they already
  paid it. Existing receipts do not change when admin settings change.
- Notifications are persistent **in-app notifications**, refreshed every 20
  seconds while foregrounded and on resume/pull-to-refresh. There is no FCM
  background push integration in this initial version.
- GPS updates use authenticated Socket.IO. The vehicle card shows status, speed
  and last position; **Open location in Maps** opens the device's map app/browser.
  Admins can also open recorded travel history from each fleet card.
- New guardians may request service; complaint and stop forms require an active,
  approved subscription. A stop takes effect when the admin approves; old bills
  remain accessible.
- Sessions are stored using `react-native-keychain`; only the server origin is
  stored in AsyncStorage. Server logout must succeed before signing out locally.
- The UI supports scrolling, phone/tablet content widths, accessible controls,
  keyboard-aware forms, submission locks and entrance animations that respect
  reduced-motion settings. Bangla and English interfaces with Bengali branding.

## Project structure

- `src/api`: typed API models, HTTP handling, server URL validation and dashboard loading
- `src/context`: memoized auth/data/management providers, refresh and live locations
- `src/components`: shared form, status, layout and review components
- `src/screens`: auth/inbox and feature folders for admin, parent, fleet, home, requests and payments
- `src/hooks`: asynchronous action feedback and duplicate-press protection
- `src/utils`: exact money conversion, shared Dhaka dates and display formatting
- `src/i18n`: shared and domain translation catalogs, language persistence
- `scripts`: local audits and performance diagnostics (device measurement restarts the app)
- `android`: native Android project; iOS native files have not been restored

### Performance conventions

- Use `useCoreData()` for ordinary screens, `useDataActions()` for commands, and
  `useLocations()` / `useData()` only where live GPS data is needed. Location events
  do not invalidate billing/forms. Equal HTTP snapshots retain object identities.
- Foreground polling remains 20 seconds. Only route/fares and payment-account
  configuration use a 60-second in-memory cache; manual, resume and post-write
  refresh bypass it. Account/server changes discard the entire cache.
- Time-derived UI must not depend on polling rerenders: use `useDeadline` for GPS
  expiry and `useDhakaDate` for current-day/month summaries. Timers pause in the
  background and recheck on resume; user-selected form dates remain unchanged.
- Large directories use `VirtualizedPage` (one FlatList, no surrounding ScrollView).
  Keep forms outside virtualized rows so offscreen recycling cannot erase drafts.
- Import shared icons from `components/icons`; importing the full Lucide runtime
  barrel pulls thousands of unused icons into Metro. Navigator routes use
  `getComponent` to retain lazy module initialization.
- `react-native-screens` is pinned to 4.28.0 for the Android mounting-delegate race
  fix. After `npm ci`, rebuild/reinstall the native APK; Metro reload is insufficient.

Run `node scripts/measure-bundle.js` to create a temporary minified bundle report.
For an unlocked USB device, `node scripts/measure-android.js SERIAL 5` restarts the
installed app five times without deleting data. It reports native first-frame,
crash and memory samples—not fully usable startup time or scrolling FPS. Run with
source edits/builds stopped, record build type/account, and discard sleep/crash or
implausible timing samples. Keep the original device sleep setting if changing it
for a test. Never publish debug-signed test APKs as production releases.

See [architecture and cleanup audit](docs/architecture.md) for module boundaries,
import-graph evidence and the limits of automated cleanup checks.
Feature splits preserve runtime behavior, including compact dropdown interactions;
keep the full test suite as the regression gate when applying cleanup.
The unused setup screen/icon and copyright footer were retired; live setup forms
are covered directly by `__tests__/setup-forms.test.tsx`. Unused home/login artwork
was moved to a temporary backup, and the unused bottom-tabs dependency was removed.
PathSathi brand PNG/SVG sources, QA documentation/screenshots and native resources remain.

## Validation

```sh
npm run validate
# Optional read-only source/assets/dependency candidate report (JSON):
npm run --silent audit:local
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output /tmp/pathsathi.android.bundle --assets-dest /tmp/pathsathi-assets
cd android
./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a
./gradlew assembleRelease
```

`validate` runs lint, TypeScript and the complete Jest suite in sequence, stopping
on failure. Individual `lint`, `typecheck` and `test` commands remain available.
TypeScript enables `noUnusedLocals` and `noUnusedParameters` to catch unused imports,
locals and parameters as part of `typecheck` and `npm run validate`.
The audit is informational and never deletes files or changes dependencies. It
returns a failing exit status for unresolved/computed imports or missing installed
dependency manifests. Review candidates against a complete, consistent source tree.

Cleanup verification (2026-09-19): 35 Jest suites / 287 tests passed, including the
compact Select regression; lint, strict typecheck and the production JavaScript
bundle passed. Phone startup of the parent dashboard was visually verified.
The audit reports zero source candidates and unresolved imports; its only asset
findings are the two deliberately retained PathSathi brand sources.

The debug APK is `android/app/build/outputs/apk/debug/app-debug.apk` and needs a
running Metro server. Release builds are deliberately unsigned: configure a
private release signing key before distributing an APK/AAB. Custom release servers must use HTTPS; the deployed VPS has an explicit HTTP exception. Neither Play Store publishing nor remote deployment is performed
by this change.

Release APKs compress native libraries and retain all four configured CPU
architectures. Android extracts the matching libraries during installation;
APK download size and installed storage usage are different measurements.
Generated Android build and CMake caches can be removed after keeping the final
APK. The next native build regenerates them and takes longer.

See [verification notes and emulator screenshots](docs/qa/verification.md) for
checks performed and the Android activity-restoration issue fixed during QA.

## Admin travel history

After the companion API's PostgreSQL history feature is enabled, open **Home → Vehicles →
View travel history** on a vehicle. Day, Monday–Sunday week, and calendar-month
filters use Asia/Dhaka even when the phone is set to a different timezone. Enter
a date as YYYY-MM-DD or move between periods. Week/month summaries open individual
days. Guardians cannot access this screen or the history endpoints.

The map shows up to 2,000 display samples, separate lines for reporting gaps,
start/end markers, zoom buttons, drag-to-pan and Fit. Playback advances through
these displayed samples every 400ms; it skips gaps and does not represent elapsed
journey time. Simplified overviews are labelled. Distance comes from backend
full-resolution calculations; roads between GPS samples are not inferred.
History begins when collection is enabled. Pending uploads, empty periods and
unavailable history storage are shown separately. No location permissions are
needed: the map displays tracker coordinates, not phone GPS.

The small map renderer is bundled in `src/components/HistoryMap.tsx`; no remote
JavaScript executes. Only numeric coordinates enter the WebView. Authentication
stays in native API requests. OSM standard raster tiles provide the current base
map, requested only for the visible viewport using an identifying PathSathi user
agent and WebView HTTP caching, with visible OpenStreetMap attribution. No tile
prefetch, bulk download or offline tile feature is implemented. The renderer
continues showing routes if tiles cannot load. Tile requests reveal the viewed
map area to the tile provider, without the session token or device ID.

Review [OSMF tile usage policy](https://operations.osmfoundation.org/policies/tiles/)
before production distribution. Public OSM tiles are best-effort, without an SLA;
large deployments should configure their own permitted tile provider. The current
tile URL and matching CSP host are in HistoryMap.tsx; changing providers requires
an app build, and the provider's attribution/cache requirements must be retained.

## Languages

Use **English / বাংলা** on the welcome/sign-in screen or in **Settings > Language**
to change language. Bengali is the default on a new installation; the selected language is saved on the device
and restored after restarting. Switching language keeps form input and the current
screen. Translation dictionaries are bundled and work offline.

Labels, validation messages, statuses, dates, amounts, map controls and recognized
server notification templates are localized. Names, phone numbers, transaction IDs
and custom school/admin notes remain as entered. Numeric fields accept English
and Bangla digits; API values and date input formats stay unchanged.

Shared translations live in `src/i18n/en.json` and `src/i18n/bn.json`; admin,
office, parent and fleet screen translations use the corresponding
`en.<area>.json` and `bn.<area>.json` files. `src/i18n/resources.ts` bundles all
catalogs. Add new interface copy to the matching dictionary pair with identical
interpolation placeholders, then use
`useTranslation` from `src/i18n`. Tests check catalog coverage, language persistence,
form preservation and localized map controls.

Catalogs merge into one translation namespace, so domain keys must not override
shared keys with different text. Reuse the shared key for common labels (for
example, `Pending` → `অপেক্ষমাণ`); give genuinely different domain copy its own
key. Run `npm test -- --runInBand __tests__/i18n.test.ts` after catalog changes.

## Noor Transport reference interface

The app now follows the supplied green/white Noor Transport parent and admin
screenshots. Admin and guardian sessions have different dashboards, navigation and
menus. The original package ID `com.pathsathi.transport` remains stable; the
Android display name is Noor Transport. The screenshot artwork and logo were
reconstructed because no editable Figma file or original image assets were supplied.

Admin tools include student/driver profiles and editing, vehicle details and
schedules, attendance, maintenance, income/expense/investment, notices, operational
requests, contact templates, settings, and real finance reports. These use the
companion API's version 2 PostgreSQL migration and authenticated management API.
Deploy the matching API before using these tools against your server.

Parents can complete the four-step admission form with a selected photo, view
application status and student profiles, inspect real route schedules/attendance,
track their assigned vehicle, submit the existing manual payments, and export
paid-bill receipts. Scheduled stops are never presented as confirmed pickup/drop
events. A missing location or attendance record is displayed as unavailable.

The Android system photo picker requests a user-selected image without broad
storage permissions, handles camera orientation, and compresses it to a small
JPEG. Reports and receipts use Android's document save dialog. PDF files are
rendered natively with Bengali text; CSV reports open in Excel and escape formula
prefixes. These native changes require rebuilding the Android app.

English and Bangla selection also applies to navigation, dashboards, management,
parent workflows and exported report/receipt labels. Names, entered notes and
configured message templates retain their original content. Rebuild the Android
app to include translation updates in an installed release APK.

Automatic payment gateways, background push delivery, automated SMS/WhatsApp
broadcasts, inferred ETA/geofences/pickup events, separate driver login/app,
multi-branch administration and a backup-management UI are not part of this change.
Existing server backup procedures still apply.

See [implementation and verification](docs/qa/noor-redesign/README.md) and
[management API documentation](../gps-tracker-api/docs/MANAGEMENT_API.md).

## QR payments and evidence

Admin **Payment accounts** → **Add payment method** saves any provider, bank or wallet.
Select an existing method to edit its name, number, instructions or QR image.
Guardians see the configured number and QR in the payment form; tap an image to view it full screen.
They transfer money externally and submit either a transaction ID or an evidence image,
with optional transaction information. Pending submissions can be updated from payment history.
Admins see the image and information in the expanded payment review before approving/rejecting.

Deploy the companion API first (automatic migration 9), then rebuild the Android app:
the higher-resolution payment image picker requires a native APK update.
The existing Android system picker compresses QR/evidence to at most 1280 pixels and 300 KB;
no new dependency or storage permission is required. Existing bKash/Rocket records remain available.
