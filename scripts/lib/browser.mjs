// One owned process tree and one private profile per session. No fixed ports.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

export function findBrowser() {
  return [process.env.BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium']
    .filter(Boolean).find(existsSync);
}
export class WatchdogError extends Error {
  constructor(ms) { super(`browser watchdog: no completed operation/frame for ${ms} ms`); this.code = 'WATCHDOG'; }
}
export function killTree(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true, timeout: 10000 });
  else { try { process.kill(-pid, 'SIGKILL'); } catch { /* already gone */ } }
}

export async function startBrowser({ executable = findBrowser(), timeout = Number(process.env.BROWSER_TIMEOUT_MS || 30000), flags = [], onEvent = () => {} } = {}) {
  if (!executable) throw new Error('no Chromium browser found (set BROWSER=<path>)');
  if (!(timeout > 0 && Number.isFinite(timeout))) throw new Error('browser timeout must be positive and finite');
  const profile = mkdtempSync(path.join(os.tmpdir(), 'mx-cdp-'));
  // DevTools over a private pipe (fds 3 and 4) by default: no TCP port that another local process could reach while a film renders.
  // MECHANISM_CDP=port goes back to a loopback port, for a browser build without pipe support.
  const usePipe = process.env.MECHANISM_CDP !== 'port';
  const proc = spawn(executable, ['--headless=new', usePipe ? '--remote-debugging-pipe' : '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--hide-scrollbars', '--mute-audio', '--force_high_performance_gpu', '--no-first-run',
    '--force-device-scale-factor=1', '--disable-extensions', '--disable-sync',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    ...(process.env.BROWSER_SOFTWARE === '1' ? ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []),
    ...flags, 'about:blank'], { stdio: usePipe ? ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] : 'ignore', detached: process.platform !== 'win32', windowsHide: true });
  let ws, closed = false, timer, serial = 0, startupError, cleanupPromise;
  const pending = new Map(), disposers = new Set();
  proc.on('error', (e) => { startupError = e; });
  // resolves when the child has exited and been reaped: on Linux a killed child stays a zombie (its pid still answers kill(pid, 0))
  // until Node collects it, so cleanup waits for this before it reports the browser gone
  const exited = proc.pid ? new Promise((resolve) => { if (proc.exitCode !== null || proc.signalCode !== null) resolve(); else proc.once('exit', () => resolve()); }) : Promise.resolve();
  const cleanup = () => {
    if (closed) return cleanupPromise; closed = true; clearTimeout(timer);
    process.off('exit', cleanup); process.off('SIGINT', sigint); process.off('SIGTERM', sigterm);
    for (const dispose of disposers) { try { dispose(); } catch { /* teardown: keep closing */ } }
    for (const { reject, timer: t } of pending.values()) { clearTimeout(t); reject(new Error('browser session closed')); } pending.clear();
    try { ws?.close(); } catch { /* socket already closed */ } killTree(proc.pid);
    // Windows may still hold the directory until the child exit/WS close events
    // have been delivered. Yield to the event loop before retrying the deletion.
    cleanupPromise = (async () => {
      await Promise.race([exited, sleep(5000)]);      // reaped (bounded: a child that never reports its exit does not hang cleanup)
      // Asynchronous removal lets Windows and libuv finish releasing directory
      // handles even while other browser sessions are busy rendering.
      for (let i = 0; i < 50; i++) {
        try { await rm(profile, { recursive: true, force: true }); return; } catch (e) {
          if (i === 49) throw new Error('profile cleanup failed: ' + profile + ': ' + e.message);
          await sleep(100);
        }
      }
    })();
    cleanupPromise.catch(() => {}); // timeouts may initiate cleanup before finally awaits it
    return cleanupPromise;
  };
  const sigint = async () => { await cleanup(); process.exit(130); }, sigterm = async () => { await cleanup(); process.exit(143); };
  process.once('exit', cleanup); process.once('SIGINT', sigint); process.once('SIGTERM', sigterm);
  try {
    const deadline = Date.now() + timeout;
    let port = null, sessionId, write;
    const onMessage = (text) => {
      const d = JSON.parse(text), p = pending.get(d.id);
      if (p) { clearTimeout(p.timer); pending.delete(d.id); d.error ? p.reject(new Error(d.error.message)) : p.resolve(d.result); }
      else if (d.method) onEvent(d);
    };
    const dropAll = () => { for (const p of pending.values()) { clearTimeout(p.timer); p.reject(new Error('CDP connection closed')); } pending.clear(); };
    const raw = (method, params, session) => new Promise((resolve, reject) => {
      if (closed) return reject(new Error('browser session closed'));
      const id = ++serial, t = setTimeout(() => { pending.delete(id); reject(new WatchdogError(timeout)); cleanup(); }, timeout);
      pending.set(id, { resolve, reject, timer: t }); write(JSON.stringify(session ? { id, method, params, sessionId: session } : { id, method, params }));
    });
    if (usePipe) {
      // messages are JSON separated by a NUL byte; page commands go to a flattened session attached to the about:blank tab
      const toBrowser = proc.stdio[3], fromBrowser = proc.stdio[4]; let buf = '';
      fromBrowser.setEncoding('utf8');
      fromBrowser.on('data', (chunk) => { buf += chunk; for (let i; (i = buf.indexOf('\0')) >= 0;) { const m = buf.slice(0, i); buf = buf.slice(i + 1); onMessage(m); } });
      fromBrowser.on('close', dropAll); fromBrowser.on('error', () => {}); toBrowser.on('error', () => {}); proc.once('exit', dropAll);
      write = (s) => toBrowser.write(s + '\0');
      ws = { close: () => { toBrowser.destroy(); fromBrowser.destroy(); } };
      let page;
      while (!page && Date.now() < deadline) {
        if (startupError) throw startupError;
        if (proc.exitCode !== null) throw new Error(`browser exited during startup (${proc.exitCode})`);
        page = (await raw('Target.getTargets', {})).targetInfos.find((t) => t.type === 'page' && t.url === 'about:blank');
        if (!page) await sleep(50);
      }
      if (!page) throw new WatchdogError(timeout);
      ({ sessionId } = await raw('Target.attachToTarget', { targetId: page.targetId, flatten: true }));
    } else {
      let tab;
      while (!tab && Date.now() < deadline) {
        if (startupError) throw startupError;
        if (proc.exitCode !== null) throw new Error(`browser exited during startup (${proc.exitCode})`);
        try {
          port = Number(readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
          if (Number.isInteger(port) && port > 0 && port <= 65535) {
            const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(Math.min(1000, timeout)) });
            tab = (await response.json()).find((t) => t.type === 'page' && t.url === 'about:blank');
          }
        } catch { /* port file is written asynchronously */ }
        if (!tab) await sleep(50);
      }
      if (!tab) throw new WatchdogError(timeout);
      ws = new WebSocket(tab.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new WatchdogError(timeout)), timeout);
        ws.onopen = () => { clearTimeout(t); resolve(); }; ws.onerror = () => { clearTimeout(t); reject(new Error('CDP connection failed')); };
      });
      ws.onmessage = (event) => onMessage(event.data); ws.onclose = dropAll; write = (s) => ws.send(s);
    }
    const send = (method, params = {}) => raw(method, params, sessionId);
    const ev = async (expression) => {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      return r.result?.value;
    };
    // Covers pipe backpressure too: progress is acknowledged only after a frame completes.
    let expired;
    const failure = new Promise((_, reject) => { expired = reject; }); failure.catch(() => {});
    const progress = () => { clearTimeout(timer); timer = setTimeout(() => { expired(new WatchdogError(timeout)); cleanup(); }, timeout); };
    const stopWatchdog = () => clearTimeout(timer);
    return { send, ev, cleanup, progress, stopWatchdog, failure, port, profile, pid: proc.pid,
      onCleanup(fn) { disposers.add(fn); return () => disposers.delete(fn); } };
  } catch (e) { await cleanup(); throw e; }
}

// Retry only watchdog failures, only once, with a fresh tree/profile. Callers write
// render intermediates (not published outputs) and restart from frame zero.
export async function withBrowser(job, options = {}) {
  for (let attempt = 0; ; attempt++) {
    let browser;
    try { browser = await startBrowser(options); return await Promise.race([job(browser), browser.failure]); }
    catch (e) {
      if (e.code !== 'WATCHDOG' || attempt >= (options.retries ?? 1)) throw e;
      console.error(`${e.message}; retrying once with a new browser`);
    } finally { await browser?.cleanup(); }
  }
}
