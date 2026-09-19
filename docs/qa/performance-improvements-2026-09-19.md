# Performance improvements — 2026-09-19

Implemented with four parallel workers (lists, data, icons, maps), followed by
integration, lazy navigation, native-crash investigation and device verification.
The earlier [baseline](performance-2026-09-19.md) remains unchanged. No backend
deployment, payment/attendance write, account reset or production signing change.

## Reproducible scaling results

| Measurement | Baseline | After |
| --- | ---: | ---: |
| Mounted initial rows, 500 records, each of Vehicles/Routes/Students/Drivers | 500 | 10 |
| Mounted rows after simulated scroll to record 499 | Not measured | 29 |
| Lucide modules in the Android bundle | 1,863 | 62 |
| Minified diagnostic JS bytes, external source map | 4,076,128 | 2,307,331 (43.4% smaller) |
| Foreground GET requests per steady-state minute | 36 | 32 |
| Core/action/management consumer renders for 20 GPS changes | Core consumers rerendered on every event | 0 |
| Consumer renders after identical HTTP poll | 1 per core/management consumer | 0 |
| Fleet marker records sent across 10 single-vehicle updates, 100 vehicles | 1,000 | 10 |
| Route/tile mutations or SVG allocation during 100 selections, 2,000 history points | Full route redraw on selection | 0 |

These are host-side regression/scaling measurements, **not measured phone FPS**.
Final bundle artifacts are in the local temporary directory
`/var/folders/h0/_nb2wy1d4p117bq1d9xmt24c0000gn/T/tracker-bundle-aV0tp1/`.
Fleet bridge payload bytes fell by over 98% in the 100-vehicle fixture; unchanged
marker DOM nodes are reused. Search/filter/navigation, form-draft retention,
translations, refresh/errors, map readiness/reload and selected-marker behavior
have regression coverage. No network/dependency library was added for caching.

Data now separates commands, non-location snapshots and GPS subscriptions.
Unchanged JSON subtrees retain references; overlapping timer reads are deduplicated.
Only routes/fares and payment destination configuration cache for 60 seconds.
Money, notifications, permissions/subscriptions and location freshness still poll
every 20 seconds while active. Manual, resume and post-mutation refresh bypass
cache. Credential/server changes invalidate old callbacks, requests and caches.

Localized deadline hooks keep GPS status accurate at the 180-second boundary
without new data, and advance current-day/month summaries at Dhaka midnight.
Background timers are cleared; foreground resume rechecks time immediately.
Fake-clock tests cover expiry, nearest-map-deadline scheduling, resume, cleanup
and the calendar month boundary. Explicitly selected form dates are not changed.

Navigator `getComponent` callbacks preserve Metro's existing inline-require
behavior. Production-transform tests (default and Hermes profiles) verify unused
screen modules are not resolved just by rendering/rerendering the navigator.
This defers module initialization; it is not network-based code splitting.

Final Gradle release output contains a 2,389,688-byte Hermes bundle. The unsigned
four-ABI APK is 36,915,111 bytes (35.2 MiB); these are separate artifacts from the
minified JS diagnostic above and must not be compared interchangeably.

## Native crash investigation and change

Optimizing JS alone did **not** resolve the baseline native crash: after rebuilding
the old dependency, a further controlled debug launch crashed at 12:23:43. Its
faulting instruction was `MountingCoordinator::pullTransaction+520`, reading a
null delegate vtable. The baseline's `+524` was the following indirect branch
into non-executable heap memory. Both were verified against the actual arm64
`libreactnative.so` instructions; this is not a missing API field exception.

The installed `react-native-screens@4.27.0` contained unsynchronized lazy listener
initialization. The matching upstream race and both crash signatures are documented
in [merged fix #4413](https://github.com/software-mansion/react-native-screens/pull/4413).
The [stable 4.28.0 release](https://github.com/software-mansion/react-native-screens/releases/tag/4.28.0)
includes that fix. `package.json` and the lockfile now pin **4.28.0**; inspection
confirmed the installed native source has the synchronized, process-lifetime
listener and safe callback invalidation. The
[compatibility table](https://github.com/software-mansion/react-native-screens/blob/4.28.0/README.md#support-for-fabric)
supports this app's RN 0.86.2/Fabric combination. No ad-hoc node_modules patch,
feature-flag workaround or disabled navigation animation is needed.

## Validation and limitations

- Final `npm run validate`: lint/typecheck clean; **44 suites, 448 tests passed**,
  including the native dependency upgrade and time-derived UI refinements.
- Local source/asset audit: no unresolved imports, missing package manifests or
  computed imports; deliberately retained branding source files remain candidates,
  not automatically deleted assets.
- `node scripts/measure-bundle.js` creates isolated temporary bundle diagnostics.
- `node scripts/measure-android.js SERIAL COUNT` checks awake state and records
  first-frame timing, process continuity, crash reports, memory and startup frames.
  It does not erase storage, inject UI events or modify sleep settings.

The current device session is **Admin**, whereas the original baseline captured
Guardian. Development/live-edit runs cannot establish a before/after RAM reduction.
One later debug launch returned an implausible old `TotalTime` of 169,630 ms even
though the command returned promptly; it also crashed. That timing is discarded,
and the measurement script now records command duration and flags implausible
values. Earlier five-start runs during live editing are not controlled timing
evidence. Pre-fix release smoke tests had 0/5 crashes, which did not establish that
the native race was fixed; the stable library fix was still required.

No fully-drawn startup instrumentation, sustained scrolling FPS, battery test,
VPS latency measurement or multi-device benchmark has been performed. A small
zero-crash sample is not a guarantee of universal crash freedom or a 10/10 score.

## Post-native-fix device runs

POCOPHONE F1 / Android 10, current Admin session. Four-ABI debug/release builds
both succeeded with screens 4.28.0. A release copy is signed with the same public
development certificate only for local installation; production signing remains
unconfigured. Stored login/data are retained. The phone is awake throughout the
measured runs; source edits and bundling/build activity are stopped during sampling.

Ten consecutive debug starts with the fixed native library: **0 crashes** and the
same app process alive at every 12-second sample. Raw values:

| Trial | Native first frame ms | PSS KiB | Startup frames | Janky frames | p95 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 1,382 | 291,355 | 201 | 14 | 24 |
| 2 | 1,359 | 279,511 | 190 | 13 | 20 |
| 3 | 458 | 270,455 | 183 | 10 | 16 |
| 4 | 446 | 272,586 | 181 | 51 | 22 |
| 5 | 454 | 269,837 | 283 | 8 | 13 |
| 6 | 453 | 269,261 | 184 | 31 | 22 |
| 7 | 452 | 268,206 | 184 | 13 | 20 |
| 8 | 462 | 266,599 | 185 | 12 | 20 |
| 9 | 471 | 281,080 | 184 | 12 | 18 |
| 10 | 453 | 266,104 | 186 | 8 | 15 |

Median native first frame 456 ms. Startup frame distributions include image loading
and banners; they do not describe scrolling smoothness. This debug run preceded
the final localized GPS-expiry/calendar-deadline refinement, with the same fixed
native dependency. Final release results are recorded separately below.

The final device APK is a **non-debuggable release build signed only for local
testing**, installed with `adb install -r` using the existing development signing
certificate. It must not be distributed as a production-signed release. The
temporary APK is `/tmp/tracker-release-check.S0bwbq/tracker-release-final-test.apk`.

Five consecutive starts of that final release: **0 crashes**, with the same
process alive and phone awake at all five 12-second samples. No source edits,
builds or bundle jobs ran during this measurement.

| Trial | Native first frame ms | PSS KiB | Startup frames | Janky frames | p95 ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 274 | 138,116 | 76 | 27 | 46 |
| 2 | 1,083 | 148,205 | 95 | 6 | 18 |
| 3 | 215 | 124,521 | 70 | 4 | 20 |
| 4 | 220 | 122,759 | 69 | 4 | 19 |
| 5 | 217 | 142,297 | 80 | 13 | 18 |

Median native first frame: **220 ms** (range 215–1,083 ms). Median sampled PSS:
**134.9 MiB** (range 119.9–144.7 MiB). All timing samples passed the host-command
duration plausibility check; the slower second start is retained, not discarded.
This is an absolute release smoke-test result, **not a measured before/after
startup speedup**: the original baseline was a different account and debug build.

Final screenshot confirms the authenticated Admin dashboard is visible (not a
blank screen or login fallback). The temporary USB stay-awake override was
restored to its original value, `stay_on_while_plugged_in=0`. The final release
test build remains installed, with login and existing data retained.
The final process's error-level log contains device `Perf`/vendor-property and
non-debuggable JDWP messages, but no ReactNativeJS fatal error or fatal exception.
These platform diagnostics are recorded rather than claimed to be a clean log.
