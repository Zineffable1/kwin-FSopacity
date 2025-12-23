/* KWin Script: Adaptive Transparency — Plasma 6 port */
const ignorePlasmashell = readConfig("ignorePlasmashell", true);

const savedOpacities = new Map();
const hooked = new Set();
const preMaxOpacities = new Map(); // Store opacities before forcing max
let scriptEnabled = true;
let forceMaxOpacity = false;

function key(win) { return String(win.internalId); }
function remember(win, val) { savedOpacities.set(key(win), val); }
function recall(win) { return savedOpacities.get(key(win)); }
function forget(win) { savedOpacities.delete(key(win)); hooked.delete(key(win)); }

function shouldIgnore(win) {
  if (!win) return true;
  if (ignorePlasmashell) {
    if (win.resourceClass && win.resourceClass.toString() === "plasmashell") return true;
    if (win.resourceName && win.resourceName.toString() === "plasmashell") return true;
  }
  return false;
}

function adaptOpacity(win) {
  if (!scriptEnabled) return;
  if (!win || !win.normalWindow || shouldIgnore(win)) return;

  if (forceMaxOpacity) {
    if (win.opacity !== 1) {
      win.opacity = 1;
    }
    return;
  }

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

  win.fullScreenChanged.connect(() => adaptOpacity(win));
  win.activeChanged.connect(() => adaptOpacity(win));
  win.closed.connect(() => forget(win));
  hooked.add(key(win));
  adaptOpacity(win);
}

function toggleScript() {
  scriptEnabled = !scriptEnabled;

  if (!scriptEnabled) {
    const allWindows = workspace.windowList();
    for (let i = 0; i < allWindows.length; i++) {
      const win = allWindows[i];
      if (win && win.normalWindow && !shouldIgnore(win)) {
        const saved = recall(win);
        if (saved !== undefined) {
          win.opacity = saved;
          forget(win);
        }
      }
    }
  } else {
    const allWindows = workspace.windowList();
    for (let i = 0; i < allWindows.length; i++) {
      const win = allWindows[i];
      if (win && win.normalWindow && !shouldIgnore(win)) {
        adaptOpacity(win);
      }
    }
  }
}

function toggleMaxOpacity() {
  forceMaxOpacity = !forceMaxOpacity;

  const allWindows = workspace.windowList();
  for (let i = 0; i < allWindows.length; i++) {
    const win = allWindows[i];
    if (win && win.normalWindow && !shouldIgnore(win)) {
      if (forceMaxOpacity) {
        // Save current opacity before forcing max
        preMaxOpacities.set(key(win), win.opacity);
        win.opacity = 1;
      } else {
        // Restore the opacity from before max was enabled
        const preMax = preMaxOpacities.get(key(win));
        if (preMax !== undefined) {
          win.opacity = preMax;
          preMaxOpacities.delete(key(win));
        }
      }
    }
  }
}

// Register shortcuts
registerShortcut(
  "FullOpacityFSToggle",
  "FullOpacityFS: Toggle entire script on/off",
  "",
  toggleScript
);

registerShortcut(
  "FullOpacityFSMaxOpacity",
  "FullOpacityFS: Toggle max opacity for all windows",
  "",
  toggleMaxOpacity
);

// Bootstrap
(function init() {
  workspace.stackingOrder.forEach(hookWindow);
  workspace.windowAdded.connect(hookWindow);
  workspace.windowRemoved.connect(win => forget(win));

  let prev = workspace.activeWindow;
  workspace.windowActivated.connect(win => {
    adaptOpacity(prev);
    adaptOpacity(win);
    prev = win;
  });
})();
