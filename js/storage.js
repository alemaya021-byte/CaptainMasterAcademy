(() => {
  const localAdapter = {
    name: "localStorage",
    available() {
      try {
        const testKey = "cma.storage.test";
        window.localStorage.setItem(testKey, "1");
        window.localStorage.removeItem(testKey);
        return true;
      } catch {
        return false;
      }
    },
    getItem(key) {
      return window.localStorage.getItem(key);
    },
    setItem(key, value) {
      window.localStorage.setItem(key, value);
    },
    removeItem(key) {
      window.localStorage.removeItem(key);
    },
  };

  const memory = new Map();
  const memoryAdapter = {
    name: "memory",
    available() {
      return true;
    },
    getItem(key) {
      return memory.has(key) ? memory.get(key) : null;
    },
    setItem(key, value) {
      memory.set(key, value);
    },
    removeItem(key) {
      memory.delete(key);
    },
  };

  const adapter = localAdapter.available() ? localAdapter : memoryAdapter;

  function readJson(primaryKey, legacyKeys = [], fallback = {}) {
    const keys = [primaryKey, ...legacyKeys];
    for (const key of keys) {
      const raw = adapter.getItem(key);
      if (!raw) continue;
      try {
        return JSON.parse(raw);
      } catch {
        return typeof fallback === "function" ? fallback() : fallback;
      }
    }
    return typeof fallback === "function" ? fallback() : fallback;
  }

  function writeJson(key, value) {
    adapter.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("cma-storage-write", { detail: { key, adapter: adapter.name } }));
  }

  window.CMAStorage = {
    adapterName: adapter.name,
    cloudReady: true,
    firebaseConfigured: false,
    getItem: (key) => adapter.getItem(key),
    setItem: (key, value) => adapter.setItem(key, value),
    removeItem: (key) => adapter.removeItem(key),
    readJson,
    writeJson,
  };
})();
