# PathSathi Android

React Native Android app for guardian transport requests, assigned vehicle tracking,
manual bKash/Rocket payment submissions and an admin review workspace.

## Run locally

Requirements: Node >=22.11 (use Node 24 for the companion API), JDK 17, Android SDK
36, and an emulator or device. The restored native app uses package
`com.pathsathi.transport` and React Native 0.86.2.

```sh
npm ci
npm start
# In a second terminal:
npm run android
```

Start `../gps-tracker-api` first using its README. The debug app defaults to
`http://10.0.2.2:3000`, the Android emulator's host address. For a physical phone,
open **School server settings** on the sign-in screen and enter the API's LAN
origin, or use `adb reverse tcp:3000 tcp:3000` and `http://127.0.0.1:3000`.
For live locations also reverse port 3001 when using that local configuration.
Use an HTTPS origin for release builds; proxy `/socket.io/` to the API Socket.IO
port on that same origin. Server addresses must be origins, with no path/query.

`android/local.properties` is machine-specific and ignored. Set `sdk.dir` there
or configure your Android SDK environment. No production credentials or payment
numbers are included.

## First setup

1. Bootstrap an admin in the API using `ADMIN_PHONE` / `ADMIN_PASSWORD`.
2. Sign in as admin. In **Setup**, add bKash/Rocket receiving numbers and clear
   Send Money/Payment instructions. Add a vehicle and a route with pickup stops.
3. A guardian creates an account with their phone and password, then submits a
   student name, route and stop from **Requests**.
4. Admin reviews the route/vehicle and approves. The assigned vehicle becomes
   visible to the guardian. One guardian can have multiple students/services.
5. Admin generates that month's bills from **Bills**. This is an explicit admin
   action, not an unattended scheduled charge.
6. Guardian sends the full amount outside this app, opens a bill, selects the
   wallet and submits sender/receiver numbers plus transaction ID.
7. Admin independently verifies the transfer and approves or rejects with a
   reason. Approval marks the bill paid and creates a guardian notification.
   Rejection leaves it unpaid and allows corrected resubmission.

## Behaviour and boundaries

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
  reduced-motion settings. English interface with Bengali branding.

## Project structure

- `src/api`: typed API models, HTTP handling and server URL validation
- `src/context`: secure auth lifecycle, data refresh and live locations
- `src/components`: shared form, status, layout and review components
- `src/screens`: auth, home, bills, requests, setup and inbox
- `src/hooks`: asynchronous action feedback and duplicate-press protection
- `src/utils`: exact money conversion and display formatting
- `android`: native Android project; iOS native files have not been restored

## Validation

```sh
npm run typecheck
npm run lint
npm test -- --runInBand
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output /tmp/pathsathi.android.bundle --assets-dest /tmp/pathsathi-assets
cd android
./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a
```

The debug APK is `android/app/build/outputs/apk/debug/app-debug.apk` and needs a
running Metro server. Release builds are deliberately unsigned: configure a
private release signing key before distributing an APK/AAB. A release server
must use HTTPS. Neither Play Store publishing nor remote deployment is performed
by this change.

See [verification notes and emulator screenshots](docs/qa/verification.md) for
checks performed and the Android activity-restoration issue fixed during QA.


## Admin travel history

After the companion API's PostgreSQL history feature is enabled, open **Home →
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
