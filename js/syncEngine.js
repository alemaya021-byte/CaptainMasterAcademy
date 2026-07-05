const FIREBASE_VERSION = "12.15.0";
const PROGRESS_KEY = "cmaProgress.v3";
const QUEUE_KEY = "cmaCloudQueue.v1";
const META_KEY = "cmaCloudMeta.v1";
const DEVICE_KEY = "cmaDevice.v1";
const SYNC_DELAY_MS = 2500;
const BACKGROUND_SYNC_MS = 120000;

let firebase = null;
let app = null;
let auth = null;
let db = null;
let syncTimer = null;
let debounceTimer = null;
let applyingRemote = false;

const state = {
  configured: Boolean(window.CMA_FIREBASE_ENABLED),
  online: navigator.onLine,
  mode: "guest",
  status: "Guest mode",
  cloudStatus: window.CMA_FIREBASE_ENABLED ? "Initializing" : "Firebase config needed",
  backupStatus: "No cloud backup yet",
  lastSync: "",
  lastBackup: "",
  pending: 0,
  user: null,
  device: deviceRecord(),
  error: "",
};

function optionalConfigScript() {
  if (window.CMA_FIREBASE_CONFIG || window.CMA_FIREBASE_ENABLED) return Promise.resolve();
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "js/firebase-config.js";
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

function storeGet(key) {
  return window.CMAStorage ? window.CMAStorage.getItem(key) : window.localStorage.getItem(key);
}

function storeSet(key, value) {
  if (window.CMAStorage) window.CMAStorage.writeJson(key, value);
  else window.localStorage.setItem(key, JSON.stringify(value));
}

function readJson(key, fallback) {
  try {
    const raw = storeGet(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function nowMs() {
  return Date.now();
}

function todayKey() {
  return nowIso().slice(0, 10);
}

function deviceRecord() {
  const existing = readJson(DEVICE_KEY, null);
  if (existing?.id) return existing;
  const record = {
    id: `device-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: navigator.userAgentData?.platform || navigator.platform || "Web device",
    userAgent: navigator.userAgent,
    createdAt: nowIso(),
  };
  storeSet(DEVICE_KEY, record);
  return record;
}

function progress() {
  return readJson(PROGRESS_KEY, {
    answers: {},
    bookmarks: {},
    missed: {},
    needsReview: {},
    reports: [],
    reviewed: {},
    flashcards: {},
    exams: [],
    activeExam: null,
    daily: {},
    adaptive: {},
    darkMode: false,
    updatedAt: "",
  });
}

function writeProgress(nextProgress) {
  applyingRemote = true;
  storeSet(PROGRESS_KEY, nextProgress);
  applyingRemote = false;
}

function meta() {
  return readJson(META_KEY, { lastSync: "", lastSyncMs: 0, lastBackup: "" });
}

function setMeta(nextMeta) {
  storeSet(META_KEY, nextMeta);
}

function queue() {
  return readJson(QUEUE_KEY, []);
}

function setQueue(items) {
  storeSet(QUEUE_KEY, items.slice(-200));
  state.pending = items.length;
  emit();
}

function emit() {
  window.dispatchEvent(new CustomEvent("cma-sync-state", { detail: { ...state } }));
  if (window.CMASync) {
    window.CMASync.configureCloudSync({
      provider: state.mode === "cloud" ? "firebase" : "local",
      pending: state.pending,
      status: state.status,
      cloudStatus: state.cloudStatus,
      lastSavedAt: state.lastSync,
    });
  }
}

function setStatus(status, details = {}) {
  Object.assign(state, details, { status });
  emit();
}

async function loadFirebase() {
  if (firebase) return firebase;
  const [appMod, authMod, firestoreMod] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`),
    import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`),
  ]);
  firebase = { ...appMod, ...authMod, ...firestoreMod };
  return firebase;
}

function signedInCloudUser() {
  return Boolean(auth && state.user && state.mode === "cloud" && !state.user.isAnonymous);
}

function userPayload(user) {
  return {
    uid: user.uid,
    email: user.email || "",
    displayName: user.displayName || user.email || "Captain Academy user",
    providerId: user.providerData?.[0]?.providerId || "password",
    isAnonymous: Boolean(user.isAnonymous),
  };
}

async function init() {
  if (app && auth && db) return true;
  await optionalConfigScript();
  state.configured = Boolean(window.CMA_FIREBASE_ENABLED);
  if (!window.CMA_FIREBASE_ENABLED) {
    setStatus("Guest mode", { configured: false, mode: "guest", cloudStatus: "Firebase config needed" });
    return false;
  }
  try {
    const f = await loadFirebase();
    app = f.initializeApp(window.CMA_FIREBASE_CONFIG);
    db = f.initializeFirestore(app, {
      localCache: f.persistentLocalCache({ tabManager: f.persistentMultipleTabManager() }),
    });
    auth = f.getAuth(app);
    await f.setPersistence(auth, f.browserLocalPersistence);
    f.onAuthStateChanged(auth, async (user) => {
      state.user = user ? userPayload(user) : null;
      state.mode = user && !user.isAnonymous ? "cloud" : "guest";
      state.cloudStatus = state.mode === "cloud" ? "Signed in" : "Guest mode";
      emit();
      if (state.mode === "cloud") {
        await ensureUserDoc();
        await manualSync("session-restore");
        startBackgroundSync();
      }
    });
    setStatus("Cloud ready", { configured: true, cloudStatus: "Auth ready" });
    return true;
  } catch (error) {
    setStatus("Guest mode", { mode: "guest", cloudStatus: "Cloud unavailable", error: error.message });
    return false;
  }
}

function userDoc() {
  return firebase.doc(db, "users", state.user.uid);
}

function subDoc(collectionName, id) {
  return firebase.doc(db, "users", state.user.uid, collectionName, id);
}

function subCollection(collectionName) {
  return firebase.collection(db, "users", state.user.uid, collectionName);
}

function updatedMs(value) {
  return value?.updatedAtMs || Date.parse(value?.updatedAt || value?.lastAt || value?.timestamp || value?.at || "") || 0;
}

function summary(progressValue) {
  const answers = Object.values(progressValue.answers || {});
  const attempts = answers.reduce((sum, row) => sum + (row.attempts || 0), 0);
  const correct = answers.reduce((sum, row) => sum + (row.correct || 0), 0);
  return {
    attempts,
    correct,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
    answeredQuestions: answers.length,
    bookmarks: Object.keys(progressValue.bookmarks || {}).length,
    needsReview: Object.keys(progressValue.needsReview || {}).length,
    missedQuestions: Object.keys(progressValue.missed || {}).length,
    flashcards: Object.keys(progressValue.flashcards || {}).length,
    examAttempts: (progressValue.exams || []).length,
    updatedAt: progressValue.updatedAt || nowIso(),
    updatedAtMs: updatedMs(progressValue) || nowMs(),
  };
}

async function ensureUserDoc() {
  if (!signedInCloudUser()) return;
  const current = progress();
  await firebase.setDoc(userDoc(), {
    profile: {
      uid: state.user.uid,
      email: state.user.email,
      displayName: state.user.displayName,
      providerId: state.user.providerId,
      updatedAt: nowIso(),
    },
    preferences: {
      darkMode: Boolean(current.darkMode),
      updatedAt: nowIso(),
    },
    devices: {
      [state.device.id]: {
        ...state.device,
        lastSeenAt: nowIso(),
      },
    },
    analytics: summary(current),
    updatedAt: nowIso(),
    updatedAtMs: nowMs(),
  }, { merge: true });
}

function envelope(id, data = {}, extra = {}) {
  return {
    id,
    ...data,
    ...extra,
    deviceId: state.device.id,
    updatedAt: data.updatedAt || data.lastAt || data.timestamp || data.at || nowIso(),
    updatedAtMs: updatedMs(data) || nowMs(),
  };
}

function asCloud(progressValue) {
  const days = new Set([
    ...Object.keys(progressValue.reviewed || {}),
    ...Object.keys(progressValue.daily || {}),
    ...Object.keys(progressValue.adaptive?.sessionsByDay || {}),
  ]);
  return {
    summary: summary(progressValue),
    questions: Object.entries(progressValue.answers || {}).map(([id, row]) => envelope(id, row, { questionId: id, adaptive: progressValue.adaptive?.questions?.[id] || null })),
    bookmarks: Object.keys(progressValue.bookmarks || {}).map((id) => envelope(id, {}, { questionId: id, active: true })),
    needsReview: Object.entries(progressValue.needsReview || {}).map(([id, row]) => envelope(id, row, { questionId: id, active: true })),
    missedQuestions: Object.entries(progressValue.missed || {}).map(([id, row]) => envelope(id, row, { questionId: id, active: true })),
    flashcards: Object.entries(progressValue.flashcards || {}).map(([id, row]) => envelope(id, row, { questionId: id })),
    examAttempts: (progressValue.exams || []).map((row) => envelope(row.id || row.at || `exam-${Date.now()}`, row, { attemptId: row.id || row.at })),
    reports: (progressValue.reports || []).map((row) => envelope(row.id || row.reportId || row.timestamp || `report-${Date.now()}`, row, { reportId: row.id || row.reportId })),
    studySessions: [...days].map((day) =>
      envelope(day, {
        day,
        reviewed: Object.keys(progressValue.reviewed?.[day] || {}),
        reviewedCount: Object.keys(progressValue.reviewed?.[day] || {}).length,
        daily: progressValue.daily?.[day] || null,
        adaptiveSession: progressValue.adaptive?.sessionsByDay?.[day] || null,
        updatedAt: progressValue.adaptive?.sessionsByDay?.[day]?.updatedAt || `${day}T23:59:59.000Z`,
      }, { sessionId: day })
    ),
  };
}

async function batchWrite(collectionName, items) {
  for (let index = 0; index < items.length; index += 400) {
    const batch = firebase.writeBatch(db);
    items.slice(index, index + 400).forEach((item) => {
      batch.set(subDoc(collectionName, item.id || item.questionId), item, { merge: true });
    });
    await batch.commit();
  }
}

async function upload(progressValue = progress()) {
  if (!signedInCloudUser()) return false;
  const cloud = asCloud(progressValue);
  await ensureUserDoc();
  await firebase.setDoc(subDoc("progress", "summary"), cloud.summary, { merge: true });
  await Promise.all([
    batchWrite("questions", cloud.questions),
    batchWrite("bookmarks", cloud.bookmarks),
    batchWrite("needsReview", cloud.needsReview),
    batchWrite("missedQuestions", cloud.missedQuestions),
    batchWrite("flashcards", cloud.flashcards),
    batchWrite("examAttempts", cloud.examAttempts),
    batchWrite("studySessions", cloud.studySessions),
    batchWrite("reports", cloud.reports),
  ]);
  return true;
}

async function changed(collectionName, sinceMs) {
  const col = subCollection(collectionName);
  const query = sinceMs
    ? firebase.query(col, firebase.where("updatedAtMs", ">", sinceMs), firebase.orderBy("updatedAtMs"), firebase.limit(500))
    : firebase.query(col, firebase.limit(500));
  const snapshot = await firebase.getDocs(query);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

async function pull() {
  const sinceMs = Number(meta().lastSyncMs || 0);
  const [questions, bookmarks, needsReview, missedQuestions, flashcards, examAttempts, studySessions, reports] = await Promise.all([
    changed("questions", sinceMs),
    changed("bookmarks", sinceMs),
    changed("needsReview", sinceMs),
    changed("missedQuestions", sinceMs),
    changed("flashcards", sinceMs),
    changed("examAttempts", sinceMs),
    changed("studySessions", sinceMs),
    changed("reports", sinceMs),
  ]);
  return { questions, bookmarks, needsReview, missedQuestions, flashcards, examAttempts, studySessions, reports };
}

function newest(localValue, cloudValue) {
  return updatedMs(cloudValue) > updatedMs(localValue) ? cloudValue : localValue;
}

function merge(local, cloud) {
  if (!cloud) return local;
  const next = { ...local };
  if (window.CMAAdaptiveEngine) window.CMAAdaptiveEngine.ensure(next);
  next.answers = { ...(local.answers || {}) };
  cloud.questions.forEach((row) => {
    const id = row.questionId || row.id;
    next.answers[id] = newest(next.answers[id], row);
    if (row.adaptive && next.adaptive) next.adaptive.questions[id] = newest(next.adaptive.questions[id], row.adaptive);
  });
  next.bookmarks = { ...(local.bookmarks || {}) };
  cloud.bookmarks.filter((row) => row.active !== false).forEach((row) => { next.bookmarks[row.questionId || row.id] = true; });
  next.needsReview = { ...(local.needsReview || {}) };
  cloud.needsReview.filter((row) => row.active !== false).forEach((row) => {
    const id = row.questionId || row.id;
    next.needsReview[id] = newest(next.needsReview[id], row);
  });
  next.missed = { ...(local.missed || {}) };
  cloud.missedQuestions.filter((row) => row.active !== false).forEach((row) => {
    const id = row.questionId || row.id;
    next.missed[id] = newest(next.missed[id], row);
  });
  next.flashcards = { ...(local.flashcards || {}) };
  cloud.flashcards.forEach((row) => {
    const id = row.questionId || row.id;
    next.flashcards[id] = newest(next.flashcards[id], row);
  });
  const exams = new Map((local.exams || []).map((row) => [row.id || row.at, row]));
  cloud.examAttempts.forEach((row) => exams.set(row.id || row.attemptId || row.at, newest(exams.get(row.id || row.attemptId || row.at), row)));
  next.exams = [...exams.values()].sort((a, b) => updatedMs(b) - updatedMs(a)).slice(0, 50);
  const reports = new Map((local.reports || []).map((row) => [row.id || row.reportId || row.timestamp, row]));
  cloud.reports.forEach((row) => reports.set(row.id || row.reportId || row.timestamp, newest(reports.get(row.id || row.reportId || row.timestamp), row)));
  next.reports = [...reports.values()].sort((a, b) => updatedMs(b) - updatedMs(a)).slice(0, 500);
  next.reviewed = { ...(local.reviewed || {}) };
  next.daily = { ...(local.daily || {}) };
  cloud.studySessions.forEach((row) => {
    const day = row.day || row.id;
    next.reviewed[day] = { ...(next.reviewed[day] || {}) };
    (row.reviewed || []).forEach((questionId) => { next.reviewed[day][questionId] = true; });
    if (row.daily) next.daily[day] = newest(next.daily[day], row.daily);
    if (row.adaptiveSession && next.adaptive) next.adaptive.sessionsByDay[day] = newest(next.adaptive.sessionsByDay[day], row.adaptiveSession);
  });
  if (next.adaptive) {
    next.adaptive.lastSessionSummary = Object.values(next.adaptive.sessionsByDay || {}).sort((a, b) => updatedMs(b) - updatedMs(a))[0] || next.adaptive.lastSessionSummary || null;
  }
  next.updatedAt = nowIso();
  return next;
}

function enqueue(reason = "progress-write") {
  if (applyingRemote) return;
  const items = queue();
  items.push({ id: `queue-${Date.now()}-${Math.random().toString(16).slice(2)}`, reason, createdAt: nowIso(), retries: 0 });
  setQueue(items);
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => manualSync("queued"), SYNC_DELAY_MS);
}

async function flushQueue() {
  if (!signedInCloudUser() || !navigator.onLine || !queue().length) return;
  await upload(progress());
  setQueue([]);
}

async function manualSync(reason = "manual") {
  if (!signedInCloudUser()) {
    setStatus("Guest mode", { cloudStatus: "Sign in to enable cloud sync" });
    return { ok: false, reason: "guest" };
  }
  if (!navigator.onLine) {
    enqueue("offline-sync");
    setStatus("Offline queued", { cloudStatus: "Will sync when online" });
    return { ok: false, reason: "offline" };
  }
  try {
    setStatus("Syncing", { cloudStatus: "Merging local and cloud" });
    const merged = merge(progress(), await pull());
    writeProgress(merged);
    await upload(merged);
    await flushQueue();
    const nextMeta = { ...meta(), lastSync: nowIso(), lastSyncMs: nowMs(), reason };
    setMeta(nextMeta);
    state.lastSync = nextMeta.lastSync;
    setStatus("Synced", { cloudStatus: "Cloud up to date", error: "" });
    return { ok: true };
  } catch (error) {
    const items = queue();
    items.push({ id: `retry-${Date.now()}`, reason, createdAt: nowIso(), retries: 1, error: error.message });
    setQueue(items);
    setStatus("Sync retry queued", { cloudStatus: "Sync error", error: error.message });
    return { ok: false, error };
  }
}

function startBackgroundSync() {
  window.clearInterval(syncTimer);
  syncTimer = window.setInterval(() => manualSync("background"), BACKGROUND_SYNC_MS);
}

async function backupNow() {
  if (!signedInCloudUser()) {
    setStatus("Guest mode", { backupStatus: "Sign in to back up" });
    return false;
  }
  const day = todayKey();
  const current = progress();
  await firebase.setDoc(subDoc("dailyBackups", day), {
    day,
    progress: current,
    summary: summary(current),
    deviceId: state.device.id,
    createdAt: nowIso(),
    updatedAtMs: nowMs(),
  }, { merge: true });
  const nextMeta = { ...meta(), lastBackup: nowIso() };
  setMeta(nextMeta);
  state.lastBackup = nextMeta.lastBackup;
  setStatus("Backup complete", { backupStatus: `Backed up ${day}` });
  return true;
}

async function restoreDate(day) {
  if (!signedInCloudUser() || !day) return false;
  const snapshot = await firebase.getDoc(subDoc("dailyBackups", day));
  if (!snapshot.exists()) {
    setStatus("Restore unavailable", { backupStatus: `No backup for ${day}` });
    return false;
  }
  const data = snapshot.data();
  if (data.progress) {
    writeProgress({ ...data.progress, updatedAt: nowIso() });
    enqueue(`restore-${day}`);
    setStatus("Restore complete", { backupStatus: `Restored ${day}` });
    return true;
  }
  return false;
}

async function restoreLatest() {
  if (!signedInCloudUser()) return false;
  const query = firebase.query(subCollection("dailyBackups"), firebase.orderBy("updatedAtMs", "desc"), firebase.limit(1));
  const snapshot = await firebase.getDocs(query);
  if (snapshot.empty) {
    setStatus("Restore unavailable", { backupStatus: "No cloud backups found" });
    return false;
  }
  return restoreDate(snapshot.docs[0].id);
}

function exportProgress() {
  const payload = { exportedAt: nowIso(), device: state.device, user: state.user, progress: progress() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `captain-master-academy-progress-${todayKey()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function importProgress(file) {
  const payload = JSON.parse(await file.text());
  if (!payload.progress) throw new Error("Import file does not contain progress.");
  writeProgress(merge(progress(), asCloud(payload.progress)));
  enqueue("import-progress");
  setStatus("Import queued", { cloudStatus: "Imported progress will sync" });
}

async function ensureAuth() {
  await init();
  if (!auth) throw new Error("Firebase is not configured. Fill js/firebase-config.js first.");
}

async function signInEmail(email, password) {
  await ensureAuth();
  return firebase.signInWithEmailAndPassword(auth, email, password);
}

async function createEmail(email, password) {
  await ensureAuth();
  return firebase.createUserWithEmailAndPassword(auth, email, password);
}

async function signInGoogle() {
  await ensureAuth();
  const provider = new firebase.GoogleAuthProvider();
  try {
    return await firebase.signInWithPopup(auth, provider);
  } catch (error) {
    if (["auth/popup-blocked", "auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(error.code)) {
      return firebase.signInWithRedirect(auth, provider);
    }
    throw error;
  }
}

async function useGuestMode() {
  if (auth?.currentUser) await firebase.signOut(auth).catch(() => {});
  state.user = null;
  state.mode = "guest";
  setStatus("Guest mode", { cloudStatus: "Local progress only" });
}

async function signOutUser() {
  if (auth) await firebase.signOut(auth);
  state.user = null;
  state.mode = "guest";
  setStatus("Signed out", { cloudStatus: "Guest mode" });
}

window.addEventListener("online", () => {
  state.online = true;
  emit();
  if (signedInCloudUser()) manualSync("online");
});

window.addEventListener("offline", () => {
  state.online = false;
  setStatus("Offline ready", { cloudStatus: "Changes will queue" });
});

window.addEventListener("cma-storage-write", (event) => {
  if (event.detail?.key === PROGRESS_KEY && signedInCloudUser()) enqueue("progress-write");
});

window.CMASyncEngine = {
  state,
  init,
  manualSync,
  backupNow,
  restoreLatest,
  restoreDate,
  exportProgress,
  importProgress,
  signInEmail,
  createEmail,
  signInGoogle,
  useGuestMode,
  signOut: signOutUser,
  enqueue,
  getProgress: progress,
};

window.dispatchEvent(new CustomEvent("cma-sync-ready", { detail: state }));
init();
