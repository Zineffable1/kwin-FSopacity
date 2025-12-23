/* KWin Script: Adaptive Transparency — Plasma 6 port */
const ignorePlasmashell = readConfig("ignorePlasmashell", true);

const savedOpacities = new Map();   // key: window.internalId (string) -> number
const hooked        = new Set();    // windows we've connected signals for

function key(win) { return String(win.internalId); }
function remember(win, val) { savedOpacities.set(key(win), val); }
function recall(win) { return savedOpacities.get(key(win)); }
function forget(win) { savedOpacities.delete(key(win)); hooked.delete(key(win)); }

function shouldIgnore(win) {
  if (!win) return true;
  // Ignore plasmashell windows if enabled
  if (ignorePlasmashell) {
    if (win.resourceClass && win.resourceClass.toString() === "plasmashell") return true;
    if (win.resourceName && win.resourceName.toString() === "plasmashell") return true;
  }
  return false;
}

function adaptOpacity(win) {
  if (!win || !win.normalWindow || shouldIgnore(win)) return;

  if (win.fullScreen) {
    const cur = win.opacity;
    if (cur !== 1) {
      remember(win, cur);
      win.opacity = 1;
    }
  } else {
    const saved = recall(win);
    if (saved !== undefined) {
      win.opacity = saved;
      forget(win);
    }
  }
}

function hookWindow(win) {
  if (!win || shouldIgnore(win) || hooked.has(key(win))) return;

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
