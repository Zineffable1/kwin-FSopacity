/* KWin Script: Adaptive Transparency — Plasma 6 por */

const debugMode = readConfig("debugMode", true);
function debug(...args) { if (debugMode) print("adaptivetransparency:", ...args); }
debug("initializing");

const savedOpacities = new Map();   // key: window.internalId (string) -> number
const hooked        = new Set();    // windows we’ve connected signals for

function key(win) { return String(win.internalId); }
function remember(win, val) { savedOpacities.set(key(win), val); }
function recall(win) { return savedOpacities.get(key(win)); }
function forget(win) { savedOpacities.delete(key(win)); hooked.delete(key(win)); }

function adaptOpacity(win) {
  if (!win || !win.normalWindow) return;

  if (win.fullScreen) {
    const cur = win.opacity;
    if (cur !== 1) {
      debug(win.caption, "fullscreen → force opaque (saving", cur, ")");
      remember(win, cur);
      win.opacity = 1;
    }
  } else {
    const saved = recall(win);
    if (saved !== undefined) {
      debug(win.caption, "left fullscreen → restore", saved);
      win.opacity = saved;
      forget(win);
    }
  }
}

function hookWindow(win) {
  if (!win || hooked.has(key(win))) return;
  // Recompute when these change
  win.fullScreenChanged.connect(() => adaptOpacity(win));
  win.activeChanged.connect(() => adaptOpacity(win));
  win.closed.connect(() => forget(win));
  hooked.add(key(win));
  adaptOpacity(win); // initial pass for this window
}

// ---- Bootstrap & signals ----
(function init() {
  // Initial pass over existing windows
  workspace.stackingOrder.forEach(hookWindow);

  // Track new/removed/activated windows
  workspace.windowAdded.connect(hookWindow);
  workspace.windowRemoved.connect(win => forget(win));

  let prev = workspace.activeWindow;
  workspace.windowActivated.connect(win => {
    adaptOpacity(prev);
    adaptOpacity(win);
    prev = win;
  });
})();
