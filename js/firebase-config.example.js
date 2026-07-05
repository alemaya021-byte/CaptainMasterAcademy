(() => {
  const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_FIREBASE_APP_ID",
  };

  function configured(config) {
    return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
  }

  window.CMA_FIREBASE_CONFIG = firebaseConfig;
  window.CMA_FIREBASE_ENABLED = configured(firebaseConfig);
})();
