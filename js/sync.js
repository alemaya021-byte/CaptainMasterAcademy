(() => {
  const state = {
    online: navigator.onLine,
    storage: window.CMAStorage?.adapterName || "localStorage",
    provider: "local",
    pending: 0,
    lastSavedAt: "",
    status: "Online",
    cloudStatus: "Local progress",
  };

  function cloudState() {
    return window.CMASyncEngine?.state || null;
  }

  function label() {
    const cloud = cloudState();
    if (!state.online) return "Offline ready";
    if (cloud?.mode === "cloud") return cloud.status || "Cloud sync";
    if (cloud?.configured === false) return "Guest mode";
    if (state.provider === "firebase") return "Cloud sync ready";
    return "Online";
  }

  function detail() {
    const cloud = cloudState();
    if (!state.online) return "Using cached app files and saved local progress.";
    if (cloud?.mode === "cloud") return `${cloud.cloudStatus || "Cloud connected"}. Pending changes: ${cloud.pending || 0}.`;
    if (cloud?.configured === false) return "Guest mode is active. Add Firebase config and sign in to enable cloud sync.";
    return `Progress saves on this device with ${state.storage}.`;
  }

  function render() {
    document.querySelectorAll("[data-connection-status]").forEach((node) => {
      node.classList.toggle("offline", !state.online);
      node.textContent = label();
      node.title = detail();
    });
  }

  function configureCloudSync(options = {}) {
    state.provider = options.provider || state.provider || "local";
    state.pending = options.pending ?? state.pending ?? 0;
    state.status = options.status || state.status;
    state.cloudStatus = options.cloudStatus || state.cloudStatus;
    state.lastSavedAt = options.lastSavedAt || state.lastSavedAt;
    render();
  }

  window.addEventListener("online", () => {
    state.online = true;
    render();
  });
  window.addEventListener("offline", () => {
    state.online = false;
    render();
  });
  window.addEventListener("cma-storage-write", () => {
    state.lastSavedAt = new Date().toISOString();
    render();
  });
  window.addEventListener("cma-sync-state", (event) => configureCloudSync({
    provider: event.detail?.mode === "cloud" ? "firebase" : "local",
    pending: event.detail?.pending || 0,
    status: event.detail?.status,
    cloudStatus: event.detail?.cloudStatus,
    lastSavedAt: event.detail?.lastSync,
  }));

  window.CMASync = {
    state,
    render,
    configureCloudSync,
    manualSync: () => window.CMASyncEngine?.manualSync("manual"),
    futureProviders: ["firebase-auth", "firestore"],
  };
})();
