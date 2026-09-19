/* eslint-env node */
// Cold-start smoke test, not a scrolling/FPS or fully-drawn benchmark.
// Usage: node scripts/measure-android.js DEVICE_SERIAL [TRIALS]
// Restarts only this app; never clears its storage or changes device settings.
const { execFileSync } = require('node:child_process');
const { setTimeout: pause } = require('node:timers/promises');
const serial = process.argv[2];
const trials = Number(process.argv[3] || 5);
const pkg = 'com.pathsathi.transport';
if (!serial || !Number.isInteger(trials) || trials < 1 || trials > 10) {
  throw new Error(
    'Provide DEVICE_SERIAL and 1–10 trials; unlock the phone first.',
  );
}
function adb(...args) {
  return execFileSync('adb', ['-s', serial, ...args], {
    encoding: 'utf8',
    timeout: 45000,
  });
}
function number(raw, pattern) {
  const value = raw.match(pattern)?.[1];
  return value === undefined ? null : Number(value);
}
function awake() {
  return /mWakefulness=Awake/.test(adb('shell', 'dumpsys', 'power'));
}
function pid() {
  try {
    return adb('shell', 'pidof', pkg).trim();
  } catch {
    return '';
  }
}
async function main() {
  for (let trial = 1; trial <= trials; trial++) {
    if (!awake())
      throw new Error('Phone asleep; unlock it before resuming measurements.');
    const since = adb('shell', 'date', '+%m-%dT%H:%M:%S.000')
      .trim()
      .replace('T', ' ');
    const commandStarted = performance.now();
    const launch = adb(
      'shell',
      'am',
      'start',
      '-S',
      '-W',
      '-n',
      pkg + '/.MainActivity',
    );
    const commandMs = Math.round(performance.now() - commandStarted);
    const firstFrameMs = number(launch, /TotalTime:\s+(\d+)/);
    const startedPid = pid();
    console.log(
      JSON.stringify({
        trial,
        phase: 'launch',
        firstFrameMs,
        thisTimeMs: number(launch, /ThisTime:\s+(\d+)/),
        waitTimeMs: number(launch, /WaitTime:\s+(\d+)/),
        commandMs,
        // Some Android builds report a stale activity timestamp on restart.
        plausibleTiming:
          firstFrameMs !== null && firstFrameMs <= commandMs + 100,
      }),
    );
    await pause(12000);
    const memory = adb('shell', 'dumpsys', 'meminfo', pkg);
    const frames = adb('shell', 'dumpsys', 'gfxinfo', pkg);
    const crashLog = adb('logcat', '-b', 'crash', '-d', '-T', since);
    const alivePid = pid();
    const rendered = number(frames, /Total frames rendered:\s+(\d+)/);
    console.log(
      JSON.stringify({
        trial,
        phase: '12s_after_launch',
        awake: awake(),
        sameProcessAlive: !!startedPid && startedPid === alivePid,
        nativeCrashReports: crashLog.split('>>> ' + pkg + ' <<<').length - 1,
        pssKiB: number(memory, /TOTAL:\s+(\d+)/),
        rendered,
        janky: number(frames, /Janky frames:\s+(\d+)/),
        p95Ms: rendered ? number(frames, /95th percentile:\s+(\d+)ms/) : null,
      }),
    );
  }
}
main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
