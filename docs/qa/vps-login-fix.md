# VPS login connection fix — 2026-09-06

Both builds now default to `http://147.79.71.98:3000`. Previously debug builds
defaulted to the emulator host and release builds had no default, rejected HTTP
server settings and lacked the deployed host's native cleartext exception.

The first upgrade migrates saved loopback defaults and clears the old server's
session before contacting the VPS. Deliberately selected custom origins remain
available. Release HTTP is limited to the deployed origin in JavaScript and its
host in Android network security configuration; debug builds retain local Metro
and LAN support. Socket.IO already maps HTTP port 3000 to port 3001.

The native policy follows [Android Network Security Configuration](https://developer.android.com/privacy-and-security/security-config).
The current deployed endpoint uses HTTP. Remove the host exception when moving
the backend to HTTPS.

Verification:

- TypeScript, ESLint and whitespace checks passed.
- All 7 Jest suites passed: 30 tests, including release URL validation and saved
  server upgrade behavior.
- `assembleDebug` and `processReleaseMainManifest` passed with JDK 17 and arm64.
- The updated APK was installed on the connected phone with `adb install -r`,
  preserving app data; the login screen opened with the existing Metro server.
- Automated input was blocked by the phone's `INJECT_EVENTS` permission policy.
- Initial direct phone connectivity reported `Network is unreachable`; a later
  Wi-Fi check returned HTTP 200 and PostgreSQL healthy from the VPS.
- Successful interactive sign-in still requires confirmation from the user.

APK: `android/app/build/outputs/apk/debug/app-debug.apk`. This is a development
APK and requires Metro. No admin passwords or session tokens are embedded.
