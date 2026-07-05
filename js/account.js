document.addEventListener("DOMContentLoaded", () => {
  const statusRoot = document.querySelector("[data-account-status]");
  const authMessage = document.querySelector("[data-auth-message]");
  const email = document.querySelector("[data-auth-email]");
  const password = document.querySelector("[data-auth-password]");
  const restoreDate = document.querySelector("[data-restore-date]");
  const importInput = document.querySelector("[data-import-progress]");

  function engine() {
    return window.CMASyncEngine;
  }

  function message(text, type = "") {
    if (!authMessage) return;
    authMessage.classList.remove("hidden");
    authMessage.dataset.type = type;
    authMessage.textContent = text;
  }

  function fmt(value) {
    if (!value) return "Not yet";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }

  function render() {
    const sync = engine();
    const state = sync?.state || { mode: "guest", cloudStatus: "Loading", device: {}, pending: 0 };
    const user = state.user;
    if (!statusRoot || !window.CMA) return;
    statusRoot.innerHTML = `
      <div class="stat-card">
        <div class="label">Current User</div>
        <div class="value compact-value">${CMA.escapeHtml(user?.email || user?.displayName || "Guest")}</div>
        <span class="muted">${CMA.escapeHtml(state.mode === "cloud" ? "Cloud account" : "Local guest mode")}</span>
      </div>
      <div class="stat-card">
        <div class="label">Device</div>
        <div class="value compact-value">${CMA.escapeHtml(state.device?.label || "Web device")}</div>
        <span class="muted">${CMA.escapeHtml(state.device?.id || "Pending")}</span>
      </div>
      <div class="stat-card">
        <div class="label">Last Sync</div>
        <div class="value compact-value">${CMA.escapeHtml(fmt(state.lastSync))}</div>
        <span class="muted">${CMA.escapeHtml(state.status || "Ready")}</span>
      </div>
      <div class="stat-card">
        <div class="label">Cloud Status</div>
        <div class="value compact-value">${CMA.escapeHtml(state.cloudStatus || "Local")}</div>
        <span class="muted">Pending: ${CMA.escapeHtml(state.pending || 0)}</span>
      </div>
      <div class="stat-card">
        <div class="label">Backup Status</div>
        <div class="value compact-value">${CMA.escapeHtml(state.backupStatus || "No cloud backup yet")}</div>
        <span class="muted">${CMA.escapeHtml(fmt(state.lastBackup))}</span>
      </div>
    `;
  }

  async function run(label, action) {
    try {
      message(`${label}...`);
      await action();
      message(`${label} complete.`, "success");
      render();
    } catch (error) {
      message(error.message || `${label} failed.`, "error");
      render();
    }
  }

  document.querySelector("[data-sign-in-email]")?.addEventListener("click", () => run("Sign in", () => engine().signInEmail(email.value, password.value)));
  document.querySelector("[data-create-account]")?.addEventListener("click", () => run("Create account", () => engine().createEmail(email.value, password.value)));
  document.querySelector("[data-sign-in-google]")?.addEventListener("click", () => run("Google sign in", () => engine().signInGoogle()));
  document.querySelector("[data-guest-mode]")?.addEventListener("click", () => run("Guest mode", () => engine().useGuestMode()));
  document.querySelector("[data-sync-now]")?.addEventListener("click", () => run("Sync", () => engine().manualSync("manual-button")));
  document.querySelector("[data-backup-now]")?.addEventListener("click", () => run("Backup", () => engine().backupNow()));
  document.querySelector("[data-restore-latest]")?.addEventListener("click", () => run("Restore latest", () => engine().restoreLatest()));
  document.querySelector("[data-restore-date-button]")?.addEventListener("click", () => run("Restore date", () => engine().restoreDate(restoreDate.value)));
  document.querySelector("[data-export-progress]")?.addEventListener("click", () => engine().exportProgress());
  document.querySelector("[data-import-trigger]")?.addEventListener("click", () => importInput.click());
  document.querySelector("[data-sign-out]")?.addEventListener("click", () => run("Sign out", () => engine().signOut()));
  importInput?.addEventListener("change", () => {
    const file = importInput.files?.[0];
    if (file) run("Import", () => engine().importProgress(file));
  });

  window.addEventListener("cma-sync-ready", render);
  window.addEventListener("cma-sync-state", render);
  render();
});
