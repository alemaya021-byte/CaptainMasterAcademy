(() => {
  const state = {
    online: navigator.onLine,
    storage: window.CMAStorage?.adapterName || "localStorage",
    provider: "local",
    pending: 0,
    lastSavedAt: "",
  };

  function label() {
    if (!state.online) return "Offline ready";
    if (state.provider === "firebase") return "Cloud sync ready";
    return "Online";
  }

  function detail() {
    if (!state.online) return "Using cached app files and saved local progress.";
    return state.provider === "firebase"
      ? "Firebase sync hooks are ready for future credentials."
      : `Progress saves on this device with ${state.storage}.`;
  }

  function render() {
    document.querySelectorAll("[data-connection-status]").forEach((node) => {
      node.classList.toggle("offline", !state.online);
      node.textContent = label();
      node.title = detail();
    });
  }

  function setOnline(value) {
    state.online = value;
    render();
  }

  function markSaved() {
    state.lastSavedAt = new Date().toISOString();
    render();
  }

  function configureCloudSync(options = {}) {
    state.provider = options.provider || "local";
    state.pending = 0;
    render();
  }

  window.addEventListener("online", () => setOnline(true));
  window.addEventListener("offline", () => setOnline(false));
  window.addEventListener("cma-storage-write", markSaved);

  window.CMASync = {
    state,
    render,
    configureCloudSync,
    futureProviders: ["firebase-auth", "firestore"],
  };
})();
