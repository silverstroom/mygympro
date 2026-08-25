let sentinel: WakeLockSentinel | null = null;
let wanted = false;

async function request() {
  if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
  try {
    sentinel = await navigator.wakeLock.request("screen");
    sentinel.addEventListener("release", () => {
      sentinel = null;
    });
  } catch {}
}

function onVisibility() {
  if (wanted && document.visibilityState === "visible" && !sentinel) request();
}

export function acquireWakeLock() {
  if (wanted) return;
  wanted = true;
  request();
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
  }
}

export function releaseWakeLock() {
  wanted = false;
  if (typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", onVisibility);
  }
  if (sentinel) {
    sentinel.release().catch(() => {});
    sentinel = null;
  }
}
