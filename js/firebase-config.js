(() => {
  const firebaseConfig = {
    apiKey: "AIzaSyAOoLyl4y6m2Jo226mGVw-ufm3kv8QkIcY",
    authDomain: "captainmasteracademy.firebaseapp.com",
    projectId: "captainmasteracademy",
    storageBucket: "captainmasteracademy.firebasestorage.app",
    messagingSenderId: "553047095353",
    appId: "1:553047095353:web:8e010f9a9ba9a85ccab5e8",
  };

  function configured(config) {
    return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
  }

  window.CMA_FIREBASE_CONFIG = firebaseConfig;
  window.CMA_FIREBASE_ENABLED = configured(firebaseConfig);
})();
