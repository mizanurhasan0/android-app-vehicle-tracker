# Performance assessment — 2026-09-19

Source revision: `4b85661`. This assessment measures the current development app
and uses separate host-side diagnostics for scaling. It does not change application
code, deployment, accounts or backend records.

Three agents independently measured bundle footprint, data/update behavior, and
list/map scaling. The coordinating agent measured the connected Android device.

## Device and limits

- Xiaomi POCOPHONE F1, Android 10, 1080 × 2246, approximately 60 Hz, approximately
  6 GB installed RAM. USB connected/charging; initial battery temperature 36°C.
- Installed package: `com.pathsathi.transport`, version 1.0/code 1, **debuggable**.
  Metro was running on the workstation; the current guardian dashboard was used.
- This is not a release benchmark. React Native documents substantial development
  overhead: [Performance overview](https://reactnative.dev/docs/performance).
- No sustained scrolling workload, interaction latency, server latency, battery
  drain or end-to-end dashboard readiness was measured. An idle screen rendering
  zero frames does not establish its scrolling FPS.
- Temporary host diagnostics and one bundle-generation task ran concurrently with
  portions of the initial device session. Metro-dependent timings are exploratory,
  not controlled release measurements.

## Cold-launch observations

Five attempts used `adb shell am start -S -W -n
com.pathsathi.transport/.MainActivity`, retaining stored login/data. Memory and
frame statistics were sampled approximately 12 seconds after the launch command
returned. The final command waited much longer, so its sample is not 12 seconds
after the launch intent.

| Attempt | Android first-frame time | Subsequent observation |
| --- | ---: | --- |
| 1 | 432 ms | Process present; 356,026 KiB PSS; 420 frames, 10 janky |
| 2 | 453 ms | Native SIGSEGV at 11:53:38; process absent at sampling |
| 3 | 458 ms | Native SIGSEGV at 11:53:52; memory sampled during teardown, discarded |
| 4 | 455 ms | Only 14 frames and partially initialized UI at sampling; not a settled dashboard sample |
| 5 | Not reported | Command WaitTime 25,904 ms; later screenshot confirmed dashboard; 364,592 KiB PSS |

The median of the four **reported native first-frame values** is 454 ms. It does
not imply a successful, fully usable launch. Device sleep/wake activity occurred
during the later sequence; the fifth WaitTime is not treated as app loading time.

Correlating on-device `Displayed` and `Running "tracker"` log timestamps puts JS
application registration approximately 1.58–1.71 seconds after launch for the
first four attempts. Registration is also **not** full content readiness.

No app-level `reportFullyDrawn` instrumentation exists. Android distinguishes
first-frame TTID from fully usable TTFD:
[Startup measurement](https://developer.android.com/topic/performance/vitals/launch-time).
TTFD remains unmeasured.

### Stability finding

Two of these five debug launch attempts produced confirmed native crashes. Both
traces contain `SIGSEGV / SEGV_ACCERR` on `mqt_v_js`, with
`facebook::react::MountingCoordinator::pullTransaction(bool) const` and
`FabricUIManagerBinding::schedulerDidFinishTransaction` in `libreactnative.so`.
These identify the native rendering path, not the root cause. They do not prove
an API error, a particular component bug, or a production crash rate. Historical
crashes elsewhere in the device log were excluded.

### Memory and rendering

The two usable post-launch dashboard samples were **347.7 and 356.0 MiB PSS**;
a later settled sample was **360.9 MiB**. The pre-test, previously used session
was 559.9 MiB PSS. Different session histories and development overhead prevent
attributing this difference to a memory leak.

In the two usable startup windows, Android reported:

| Sample | Frames | Janky frames | p95 frame duration | p99 |
| --- | ---: | ---: | ---: | ---: |
| Attempt 1 | 420 | 10 / 2.38% | 12 ms | 42 ms |
| Attempt 5 | 429 | 11 / 2.56% | 12 ms | 23 ms |

These cover startup/loading, not controlled scrolling or screen navigation.
After resetting frame counters, the idle screen produced no frames; its empty
histogram percentiles were discarded. See Android's
[rendering guidance](https://developer.android.com/topic/performance/vitals/render).

## List/map scaling: synthetic host measurements

Tests rendered real components using existing mocked contexts/native components
and counted mounted React rows. No phone layout or scrolling was simulated.

| Screen | 20 input records | 100 | 500 |
| --- | ---: | ---: | ---: |
| Main Vehicles tab | 20 mounted | 100 | 500 |
| Routes | 20 | 100 | 500 |
| Students | 20 | 100 | 500 |
| Drivers | 20 | 100 | 500 |
| Live fleet-map list | 10 | 10 | 10 |
| Recorded Journey | 10 | 10 | 10 |

The last two use `FlatList`; 10 is the observed initial window, not a maximum
while scrolling. The main tab uses `screens/fleet/VehiclesScreen.tsx`, whereas
`screens/VehiclesScreen.tsx` is the separate fleet-map screen. Shared `Page` and
`AdminPage` wrappers use `ScrollView`, and their list consumers mount all rows.

With a mocked WebView and 100 positioned vehicles, ten separately committed
location changes produced ten JavaScript injections, each carrying all 100
markers. Selection added one full-payload injection; unchanged props added none.
History-map point selection likewise produced ten injections for ten changes.
Neither map replaced its source object during these updates.

Code inspection also shows that fleet draws scan markers and recreate visible
marker elements, while history playback schedules updates every 400 ms and
redraws the route SVG, capped at 2,000 points. These are scaling risks; native map
frame time was not measured.

## Data/update measurements: synthetic host tests

Six diagnostic tests used the real providers, API client and dashboard/history
hooks, mocked HTTP/Socket.IO transport, and fresh JSON parsing. Four independent
core consumers read vehicles, bills, locations or actions. The table counts
renders per consumer; initial counts include mounting.

| Phase | GETs | Each core consumer | Management-only consumer | Dashboard hook |
| --- | ---: | ---: | ---: | ---: |
| Initial authenticated provider load | 12 | 2 | 2 | 2–3 |
| Idle before 20 seconds | 0 | 0 | 0 | 0 |
| Completed 20-second poll, identical response data | 12 | 1 | 1 | 1–2 |
| One socket location update | 0 | 1 | 0 | 1 |
| App backgrounded: 20 seconds and a socket event | 0 | 0 | 0 | 0 |

The initial 12 GETs exclude authentication's `/auth/me`. There are 11 core
endpoints and one management overview, with 12 requests pending concurrently.
Steady foreground polling therefore schedules 36 GETs/minute before refreshes
or mutations. Completing 10 of 11 core responses produced no consumer renders:
the whole core snapshot waits for its slowest request.

A location update preserved the vehicle, bill and action references but still
rerendered their core consumers because the containing context value changed.
The memoized management value prevented management-only consumers from rendering
on that same event. Identical HTTP response data produced new object references
and consumer renders after each poll. Dashboard count ranges reflect core and
management responses completing together versus separate batches.

Fixtures contained 25/250 vehicles, locations and routes; 200/2,000 students,
subscriptions and attendance records; 1,000/10,000 bills; and 100/1,000 notifications.
One full snapshot parsed 371,372/3,781,112 JSON bytes. These are synthetic payload
sizes, **not measured current VPS traffic**. The socket fixture was 165 bytes.
A separate history fixture contained 2,000 points/399,398 bytes: admin loading
made two GETs, guardian loading made none, and neither polled over 20 idle seconds.

Temporary data diagnostic artifacts, including the exact harness and raw output,
are available locally in `/private/tmp/tracker-data-measurement.UcyvY5/`.

## Bundle footprint

The installed debug artifact contains no bundled JS. Existing release APKs are
from September 15 and are stale relative to this source revision; they were not
installed or used as current performance evidence.

| Artifact | Size |
| --- | ---: |
| Existing debug APK | 58.785 MiB |
| Existing stale unsigned release APK | 33.436 MiB |
| Current generated development JS | 9.935 MiB |
| Current production JS before Hermes | 7.422 MiB |
| Current explicitly minified diagnostic JS | 3.887 MiB |
| Current optimized Hermes diagnostic bytecode | 3.467 MiB |

Lucide contributes approximately **1.82 MB / 44.7%** of the minified diagnostic JS
across 1,863 modules. The icon barrel and module-level icon dictionary warrant
review. `inlineRequires` is enabled, but navigator `component={...}` references
resolve unvisited route components when that navigator renders after login.
Both APK variants include four ABIs; release native shrinking is disabled.

The current diagnostic Hermes bytecode is 71.8% larger than the stale release's
2.018 MiB bytecode. That older bundle contains no Lucide modules and different
app functionality, so this is **not a before/after refactor regression claim**.

## Assessment

Current provisional engineering assessment: **5/10**, based on the observed debug
stability failures and measured scaling costs. This is a judgment, not a
standardized benchmark or release score. The previous code-only 7/10 estimate
was not supported by runtime measurement.

Priorities supported by this evidence:

1. Reproduce and resolve the native startup crash, then repeat on a current release build.
2. Virtualize the main admin/fleet lists before large datasets are deployed.
3. Reduce broad polling/consumer updates and full-marker WebView payloads.
4. Review icon bundle loading and authenticated startup dependencies.

Temporary measurement harnesses are removed after use. No optimization fixes
were applied as part of this assessment.
