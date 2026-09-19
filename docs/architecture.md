# Architecture and cleanup audit

## Runtime boundaries

`index.js` registers `App.tsx`, which composes language/auth/safe-area providers and
the toast host. `src/app/SessionRoot.tsx` handles session-dependent composition;
`src/navigation/Navigator.tsx` owns navigation, with route wrappers, tab definitions,
tab rendering and route types alongside it. Role-specific screens consume contexts
and shared components.

Feature entry points after the screen split:

| Previous module | Current entry point | Contents |
| --- | --- | --- |
| `admin/PeopleScreens.tsx` | `src/screens/admin/people/index.ts` | Student/driver lists and profiles; forms, photo and amount helpers colocated |
| `admin/OfficeScreens.tsx` | `src/screens/admin/office/index.ts` | Notices, requests, communication and settings |
| `admin/OperationsScreens.tsx` | `src/screens/admin/operations/index.ts` | Attendance, maintenance and accounts; forms and ledger categories colocated |
| `parent/ParentScreens.tsx` | `src/screens/parent/index.ts` | Admission, application status, student, journey, contact and tracking screens; shared styles/types alongside |
| `NoorFleetScreens.tsx` | `src/screens/fleet/index.ts` | Vehicle/route lists and details; UI, schedule editor, metadata, formatting and styles colocated |

`src/screens/admin/index.ts` remains the combined admin export surface, including
reports and banners. Prefer feature entry points for external consumers and keep
feature-specific helpers/forms beside their screens.

Further presentation splits group shared admin controls under `src/screens/admin/ui`,
dashboard cards and role-specific content under `src/screens/home`, request UI under
`src/screens/requests`, and payment forms, tabs, filters and bill/submission cards under
`src/screens/payments`.
Public screen modules and shared UI exports continue to provide their existing entry points.
`src/screens/admin/office/messageTemplates.ts` holds the shared template labels and
setting-key type consumed by Communication and Settings, avoiding screen-to-screen
imports for this shared data.

These splits preserve runtime behavior, including compact dropdown interactions.
Retain that behavior and run the complete test suite when applying cleanup. Native
resources and QA documentation/screenshots remain outside cleanup scope.

| Area | Responsibility |
| --- | --- |
| `src/context/AuthContext.tsx` | Session lifecycle, secure credential storage and server selection |
| `src/context/DataContext.tsx` | Core data refresh, foreground polling and authenticated Socket.IO locations |
| `src/context/ManagementContext.tsx` | Management overview and mutations, coordinated with core refresh |
| `src/api/dashboard.ts` | Parallel loading of dashboard endpoints into one complete typed snapshot |
| `src/api` | HTTP/error handling, server URL policy and typed API contracts |
| `src/hooks`, `src/utils` | Action feedback, history loading, validation, exact money and domain calculations |
| `src/components` | Reusable presentation, forms, maps and feedback |
| `src/i18n` | Offline catalogs, language persistence and known-message localization |
| `android` | Native host, launcher resources, networking policy and photo/document integration |

Auth, data and management providers memoize their context values so unrelated parent
renders retain the same value identity. `DataContext` delegates dashboard fetching to
`loadDashboard` in `src/api/dashboard.ts`; session handling, refresh coordination and
live updates remain in the context.

`src/utils/dates.ts` owns the shared Dhaka calendar date and UTC offset.
`historyDates.ts` and `parentUtils.ts` re-export `dhakaDate` for existing callers;
admin formatting exposes the same helper through its `today` alias.

Keep business calculations in utilities and network/session lifecycle in their
existing contexts. Shared form primitives and `src/components/setup/SetupForms.tsx`
remain live after retiring the old setup screen. A whole-file reachability
audit cannot identify unused individual exports or styles inside a live module.

`src/i18n/resources.ts` merges all catalogs into one namespace. Shared labels belong
in `en.json` / `bn.json`; domain dictionaries add domain copy. Keep language key
sets and interpolation variables identical. The existing i18n suite rejects
conflicting cross-catalog values and checks literal/conditional translation keys.
Server messages and computed keys mean an unreferenced literal is not sufficient
evidence to remove a translation.

## Cleanup and baseline evidence

The 2026-09-19 cleanup removed three unused source files, backed up two unused
raster assets and removed one unused dependency. Two brand source assets were
deliberately retained. The final audit reports no source or dependency candidates
and no unresolved imports. The evidence and completed outcomes are recorded below;
the audit command itself remains read-only.

| Item | Baseline evidence | Cleanup outcome |
| --- | --- | --- |
| `src/components/CopyrightFooter.tsx` | No source or test importers; unreachable from `index.js` | Deleted; recoverable from Git |
| `src/screens/SetupScreen.tsx` | Imported only by `__tests__/setup-screen.test.tsx`; not in the application graph | Deleted; tests migrated to the live forms |
| `src/components/setup/SetupIcon.tsx` | Only importer was the unreachable `SetupScreen.tsx` | Deleted with the retired screen |
| `assets/branding/home-banner.jpg` | No runtime import; referenced by `docs/qa/home-banner.md` | Moved to a temporary backup; historical QA documentation retained |
| `assets/branding/login-transport.png` | No runtime import; referenced by `docs/qa/reference-redesign/README.md` | Moved to a temporary backup; historical QA documentation retained |
| `assets/branding/pathsathi-icon.png`, `pathsathi-icon.svg` | No runtime import; repository text search found no callers | Deliberately retained as brand source artwork |
| `@react-navigation/bottom-tabs` | No source import or requirement from other installed direct production package manifests | Removed from the dependency manifest and lockfile |

The two removed raster assets were verified in the local temporary backup
`/tmp/tracker-unused-assets.Z9rTz2/{home-banner.jpg,login-transport.png}`. This machine-specific directory is
temporary, not a durable archive; the tracked originals also remain in Git history.
QA screenshots/documents and all native resources are retained.

`__tests__/setup-forms.test.tsx` now renders `AccountForm`, `VehicleForm` and
`RouteForm` directly. It preserves payment validation, wallet-specific drafts,
refreshes without overwriting edits, vehicle save/reset/failure, route submission
and the `onAddVehicle` callback. Direct initial-state and validation checks replace
obsolete setup tab/panel animation tests; no legacy tab implementation is recreated.

The initial graph found no other unreachable source files. It counts type-only
references conservatively. `noor-login-background.png` is used by auth/welcome
screens. Documentation screenshots are QA evidence, outside the runtime graph.
Android's manifest references `@mipmap/ic_launcher` and `ic_launcher_round`; those
resources must not be assessed using JavaScript imports.

Two dependencies with no direct application imports are required indirectly:

- `react-native-screens` is a peer of `@react-navigation/native-stack`, whose
  installed native view implementation imports it.
- `react-native-svg` is a peer of `lucide-react-native`, used by the app's icons.

All other production dependencies have reachable source references. Development
dependencies were not classified as unused: Babel, Metro, Jest, TypeScript, native
CLI and ESLint load tooling through configuration, presets and package conventions.

The baseline i18n test failed because admin `Pending` used `অপেক্ষমান` while
shared `Pending` used `অপেক্ষমাণ`. Removing the redundant admin entry in both
languages leaves the compact shared translation authoritative, independent of
catalog merge order.

## Repeatable checks

Run `npm run --silent audit:local` after installing existing dependencies. The
script uses Node built-ins and the already-installed TypeScript compiler; it adds
no dependency, writes nothing and performs no network calls. JSON output contains
candidate paths, source/test importer line numbers, asset sizes, production
dependency references and installed dependency/peer manifest evidence.

The graph starts at `index.js`, follows static imports, re-exports, import-equals,
literal `require()` and literal `import()`, and uses Android/native module suffixes
with TypeScript resolution. Test roots are tracked separately. Type-only imports
count as references; this is a conservative source-maintenance graph, not a Metro
bundle report or unused-export detector.

Computed imports and unresolved relative imports are reported and cause a nonzero
exit, as do missing installed production package manifests. Dynamic asset strings,
density variants, native/autolinking usage and the full transitive dependency graph
need manual review. Jest mock strings are not graph edges. The report does not scan
documentation for asset references; the baseline table above records that manual
check. Evaluate audit candidates against a complete, consistent source tree.

Run `npm run validate` for lint, typecheck and all Jest tests. Run the focused i18n
suite after catalog edits. Native builds and emulator QA remain separate checks
described in the README; a passing JavaScript suite does not verify an APK.
TypeScript's `noUnusedLocals` and `noUnusedParameters` guardrails catch unused local
declarations, imports and parameters during `typecheck` and therefore `validate`.
They complement the audit's whole-file reachability checks; neither replaces the
full runtime regression suite, including compact dropdown behavior.

## Completed verification — 2026-09-19

| Check | Result |
| --- | --- |
| Full Jest suite | 35 suites / 287 tests passed, including the compact Select regression |
| ESLint | Passed |
| Strict TypeScript check | Passed, including unused locals and parameters |
| Production JavaScript bundle | Generated successfully |
| Phone startup | Parent dashboard startup screenshot visually verified |
| Local audit | Zero source candidates, zero dependency candidates, zero unresolved imports; only the two deliberately retained brand assets reported |
