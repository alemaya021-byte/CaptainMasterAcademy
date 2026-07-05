(() => {
  const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  };

  function configured(config) {
    return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
  }

  window.CMA_FIREBASE_CONFIG = firebaseConfig;
  window.CMA_FIREBASE_ENABLED = configured(firebaseConfig);
})();
