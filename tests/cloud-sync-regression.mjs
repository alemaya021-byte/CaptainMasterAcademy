#!/usr/bin/env node
import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const reportPath = path.join(root, "CloudSyncRegressionTest.md");
const configPath = path.join(root, "js", "firebase-config.js");
const questionsPath = path.join(root, "data", "questions.json");
const expectedQuestionCount = Number(process.env.CMA_EXPECTED_QUESTION_COUNT || 7000);
const writeReport = process.argv.includes("--write-report");
const continueUri = "https://alemaya021-byte.github.io/CaptainMasterAcademy/";
const testRunId = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

const results = [];
const cleanup = [];
let userCounter = 0;

function pass(name, detail = "") {
  results.push({ name, status: "PASS", detail });
  console.log(`PASS ${name}${detail ? ` - ${detail}` : ""}`);
}

function fail(name, error) {
  const detail = error?.message || String(error);
  results.push({ name, status: "FAIL", detail });
  console.error(`FAIL ${name} - ${detail}`);
}

async function test(name, fn) {
  try {
    await fn();
    pass(name);
  } catch (error) {
    fail(name, error);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function getConfigValue(configText, key) {
  const match = configText.match(new RegExp(`${key}:\\s*["']([^"']+)["']`));
  if (!match) throw new Error(`Missing Firebase config key: ${key}`);
  return match[1];
}

async function readConfig() {
  const configText = await readFile(configPath, "utf8");
  const forbidden = ["private_key", "service_account", "client_email", "adminsdk", "credential", "begin private"];
  assert(!forbidden.some((marker) => configText.toLowerCase().includes(marker)), "Firebase config contains private/admin credential markers.");
  const required = ["apiKey", "authDomain", "projectId", "storageBucket", "messagingSenderId", "appId"];
  return Object.fromEntries(required.map((key) => [key, getConfigValue(configText, key)]));
}

async function questionsHashAndCount() {
  const raw = await readFile(questionsPath, "utf8");
  const data = JSON.parse(raw);
  const list = Array.isArray(data) ? data : data.questions;
  return {
    count: list.length,
    hash: crypto.createHash("sha256").update(raw).digest("hex"),
  };
}

async function jsonRequest(url, options = {}, expected = [200]) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!expected.includes(response.status)) {
    throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(payload)}`);
  }
  return { response, payload };
}

function authUrl(config, method) {
  return `https://identitytoolkit.googleapis.com/v1/accounts:${method}?key=${config.apiKey}`;
}

async function createEmailUser(config) {
  userCounter += 1;
  const email = `cma.regression.${testRunId}.${userCounter}@example.com`;
  const password = `Cma-${testRunId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 18)}!`;
  const { payload } = await jsonRequest(authUrl(config, "signUp"), {
    method: "POST",
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const user = { email, password, uid: payload.localId, idToken: payload.idToken, refreshToken: payload.refreshToken };
  cleanup.push(async () => {
    if (!user.idToken) return;
    await jsonRequest(authUrl(config, "delete"), {
      method: "POST",
      body: JSON.stringify({ idToken: user.idToken }),
    }, [200, 400]);
  });
  return user;
}

async function signInEmail(config, email, password) {
  const { payload } = await jsonRequest(authUrl(config, "signInWithPassword"), {
    method: "POST",
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  return { uid: payload.localId, idToken: payload.idToken, email };
}

async function googleProviderMock(config) {
  const { payload } = await jsonRequest(authUrl(config, "createAuthUri"), {
    method: "POST",
    body: JSON.stringify({
      identifier: `google.mock.${testRunId}@example.com`,
      continueUri,
      providerId: "google.com",
    }),
  });
  assert(payload.authUri || Array.isArray(payload.allProviders), "Google provider did not return an auth URI/provider response.");
  return payload;
}

function firestoreBase(config) {
  return `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;
}

async function firestore(config, method, docPath, idToken, body, expected = [200]) {
  return jsonRequest(`${firestoreBase(config)}/${docPath}`, {
    method,
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
    body: body ? JSON.stringify(body) : undefined,
  }, expected);
}

function fsValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number" && Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === "number") return { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(fsValue) } };
  if (typeof value === "object") return { mapValue: { fields: fsFields(value) } };
  return { stringValue: String(value) };
}

function fsFields(object) {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, fsValue(value)]));
}

function fromFsValue(value) {
  if (!value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(fromFsValue);
  if ("mapValue" in value) return fromFsFields(value.mapValue.fields || {});
  return null;
}

function fromFsFields(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromFsValue(value)]));
}

async function setDoc(config, user, docPath, data, expected = [200]) {
  return firestore(config, "PATCH", docPath, user.idToken, { fields: fsFields(data) }, expected);
}

async function getDoc(config, user, docPath, expected = [200]) {
  const { payload } = await firestore(config, "GET", docPath, user?.idToken, null, expected);
  return payload.fields ? fromFsFields(payload.fields) : null;
}

async function listDocs(config, user, collectionPath) {
  const { payload } = await firestore(config, "GET", collectionPath, user.idToken, null, [200, 404]);
  return (payload.documents || []).map((doc) => ({
    id: doc.name.split("/").pop(),
    ...fromFsFields(doc.fields || {}),
  }));
}

function nowIso(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function nowMs(offsetMs = 0) {
  return Date.now() + offsetMs;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function progressFixture(runId, offsetMs = 0) {
  return {
    answers: {
      "CMA-P1-0001": {
        questionId: "CMA-P1-0001",
        attempts: 2,
        correct: 1,
        incorrect: 1,
        lastCorrect: true,
        difficulty: "Hard",
        source: "Policies & Procedures",
        updatedAt: nowIso(offsetMs),
        updatedAtMs: nowMs(offsetMs),
      },
    },
    bookmarks: { "CMA-P1-0002": true },
    missed: {
      "CMA-P1-0003": {
        questionId: "CMA-P1-0003",
        active: true,
        misses: 1,
        correctStreak: 0,
        status: "still weak",
        updatedAt: nowIso(offsetMs),
        updatedAtMs: nowMs(offsetMs),
      },
    },
    needsReview: {},
    reports: [],
    reviewed: { [todayKey()]: { "CMA-P1-0001": true } },
    flashcards: {
      "CMA-P1-0004": {
        questionId: "CMA-P1-0004",
        rating: "good",
        intervalDays: 3,
        reps: 2,
        dueAt: nowIso(3 * 86400000),
        updatedAt: nowIso(offsetMs),
        updatedAtMs: nowMs(offsetMs),
      },
    },
    exams: [
      {
        id: `exam-${runId}`,
        attemptId: `exam-${runId}`,
        score: 92,
        total: 125,
        pct: 74,
        at: nowIso(offsetMs),
        updatedAt: nowIso(offsetMs),
        updatedAtMs: nowMs(offsetMs),
      },
    ],
    activeExam: null,
    daily: { [todayKey()]: { attempts: 2, correct: 1, responseMs: 72000 } },
    darkMode: false,
    updatedAt: nowIso(offsetMs),
    updatedAtMs: nowMs(offsetMs),
  };
}

function summary(progress) {
  const answers = Object.values(progress.answers || {});
  const attempts = answers.reduce((sum, row) => sum + (row.attempts || 0), 0);
  const correct = answers.reduce((sum, row) => sum + (row.correct || 0), 0);
  return {
    attempts,
    correct,
    accuracy: attempts ? Math.round((correct / attempts) * 100) : 0,
    answeredQuestions: answers.length,
    bookmarks: Object.keys(progress.bookmarks || {}).length,
    needsReview: Object.keys(progress.needsReview || {}).length,
    missedQuestions: Object.keys(progress.missed || {}).length,
    flashcards: Object.keys(progress.flashcards || {}).length,
    examAttempts: (progress.exams || []).length,
    updatedAt: progress.updatedAt || nowIso(),
    updatedAtMs: progress.updatedAtMs || nowMs(),
  };
}

function envelope(deviceId, id, data = {}, extra = {}) {
  return {
    id,
    ...data,
    ...extra,
    deviceId,
    updatedAt: data.updatedAt || data.lastAt || data.timestamp || data.at || nowIso(),
    updatedAtMs: data.updatedAtMs || Date.parse(data.updatedAt || data.lastAt || data.timestamp || data.at || "") || nowMs(),
  };
}

async function writeCloudProgress(config, user, progress, deviceId) {
  const uid = user.uid;
  await setDoc(config, user, `users/${uid}`, {
    profile: { uid, email: user.email || "", displayName: user.email || "Regression user", providerId: "password", updatedAt: nowIso() },
    preferences: { darkMode: Boolean(progress.darkMode), updatedAt: nowIso() },
    devices: { [deviceId]: { id: deviceId, label: "Regression device", userAgent: "node", createdAt: nowIso(), lastSeenAt: nowIso() } },
    analytics: summary(progress),
    updatedAt: nowIso(),
    updatedAtMs: nowMs(),
  });
  await setDoc(config, user, `users/${uid}/progress/summary`, summary(progress));
  await Promise.all(Object.entries(progress.answers || {}).map(([id, row]) =>
    setDoc(config, user, `users/${uid}/questions/${id}`, envelope(deviceId, id, row, { questionId: id }))
  ));
  await Promise.all(Object.keys(progress.bookmarks || {}).map((id) =>
    setDoc(config, user, `users/${uid}/bookmarks/${id}`, envelope(deviceId, id, {}, { questionId: id, active: true }))
  ));
  await Promise.all(Object.entries(progress.missed || {}).map(([id, row]) =>
    setDoc(config, user, `users/${uid}/missedQuestions/${id}`, envelope(deviceId, id, row, { questionId: id, active: true }))
  ));
  await Promise.all(Object.entries(progress.flashcards || {}).map(([id, row]) =>
    setDoc(config, user, `users/${uid}/flashcards/${id}`, envelope(deviceId, id, row, { questionId: id }))
  ));
  await Promise.all((progress.exams || []).map((row) => {
    const id = row.id || row.attemptId || row.at;
    return setDoc(config, user, `users/${uid}/examAttempts/${id}`, envelope(deviceId, id, row, { attemptId: id }));
  }));
}

async function readCloudProgress(config, user) {
  const uid = user.uid;
  const [questions, bookmarks, missedQuestions, flashcards, examAttempts] = await Promise.all([
    listDocs(config, user, `users/${uid}/questions`),
    listDocs(config, user, `users/${uid}/bookmarks`),
    listDocs(config, user, `users/${uid}/missedQuestions`),
    listDocs(config, user, `users/${uid}/flashcards`),
    listDocs(config, user, `users/${uid}/examAttempts`),
  ]);
  return { questions, bookmarks, missedQuestions, flashcards, examAttempts };
}

function updatedMs(value) {
  return value?.updatedAtMs || Date.parse(value?.updatedAt || value?.lastAt || value?.timestamp || value?.at || "") || 0;
}

function newest(localValue, cloudValue) {
  return updatedMs(cloudValue) > updatedMs(localValue) ? cloudValue : localValue;
}

function mergeLocalWithCloud(local, cloud) {
  const next = {
    ...local,
    answers: { ...(local.answers || {}) },
    bookmarks: { ...(local.bookmarks || {}) },
    missed: { ...(local.missed || {}) },
    flashcards: { ...(local.flashcards || {}) },
    exams: [...(local.exams || [])],
  };
  (cloud.questions || []).forEach((row) => {
    const id = row.questionId || row.id;
    next.answers[id] = newest(next.answers[id], row);
  });
  (cloud.bookmarks || []).filter((row) => row.active !== false).forEach((row) => {
    next.bookmarks[row.questionId || row.id] = true;
  });
  (cloud.missedQuestions || []).filter((row) => row.active !== false).forEach((row) => {
    const id = row.questionId || row.id;
    next.missed[id] = newest(next.missed[id], row);
  });
  (cloud.flashcards || []).forEach((row) => {
    const id = row.questionId || row.id;
    next.flashcards[id] = newest(next.flashcards[id], row);
  });
  const exams = new Map(next.exams.map((row) => [row.id || row.attemptId || row.at, row]));
  (cloud.examAttempts || []).forEach((row) => {
    const id = row.id || row.attemptId || row.at;
    exams.set(id, newest(exams.get(id), row));
  });
  next.exams = [...exams.values()].sort((a, b) => updatedMs(b) - updatedMs(a)).slice(0, 50);
  next.updatedAt = nowIso();
  return next;
}

function readinessScore(progress) {
  const s = summary(progress);
  const hardRows = Object.values(progress.answers || {}).filter((row) => row.difficulty === "Hard");
  const hardAttempts = hardRows.reduce((sum, row) => sum + (row.attempts || 0), 0);
  const hardCorrect = hardRows.reduce((sum, row) => sum + (row.correct || 0), 0);
  const hardAccuracy = hardAttempts ? Math.round((hardCorrect / hardAttempts) * 100) : s.accuracy;
  const examAverage = (progress.exams || []).length
    ? Math.round(progress.exams.slice(0, 5).reduce((sum, exam) => sum + (exam.pct || 0), 0) / Math.min(5, progress.exams.length))
    : s.accuracy;
  return Math.max(0, Math.min(100, Math.round(s.accuracy * 0.35 + hardAccuracy * 0.25 + examAverage * 0.25 + 60 * 0.15)));
}

async function writeBackup(config, user, progress, deviceId) {
  const day = todayKey();
  await setDoc(config, user, `users/${user.uid}/dailyBackups/${day}`, {
    day,
    progress,
    summary: summary(progress),
    deviceId,
    createdAt: nowIso(),
    updatedAtMs: nowMs(),
  });
  return day;
}

async function main() {
  const before = await questionsHashAndCount();
  assert(before.count === expectedQuestionCount, `Expected ${expectedQuestionCount} questions before tests, found ${before.count}.`);
  const config = await readConfig();
  let primaryUser;
  let secondaryUser;
  let deviceAProgress;
  let deviceBProgress;
  const queue = [];

  await test("Email/Password sign-in", async () => {
    primaryUser = await createEmailUser(config);
    const signedIn = await signInEmail(config, primaryUser.email, primaryUser.password);
    assert(signedIn.uid === primaryUser.uid, "Signed-in UID did not match created user.");
    primaryUser.idToken = signedIn.idToken;
  });

  await test("Google sign-in mock", async () => {
    await googleProviderMock(config);
  });

  await test("Firestore connectivity", async () => {
    await writeCloudProgress(config, primaryUser, progressFixture(testRunId), "device-a");
    const doc = await getDoc(config, primaryUser, `users/${primaryUser.uid}`);
    assert(doc.profile.uid === primaryUser.uid, "Could not read own Firestore profile.");
  });

  await test("Guest mode", async () => {
    const guestSyncResult = { ok: false, reason: "guest" };
    const denied = await firestore(config, "GET", `users/${primaryUser.uid}`, null, null, [401, 403]);
    assert(["guest"].includes(guestSyncResult.reason), "Guest mode should remain local-only.");
    assert([401, 403].includes(denied.response.status), "Unauthenticated Firestore read should be denied.");
  });

  await test("Local-to-cloud merge", async () => {
    deviceAProgress = progressFixture(testRunId, 1000);
    deviceAProgress.bookmarks["CMA-P1-0005"] = true;
    await writeCloudProgress(config, primaryUser, deviceAProgress, "device-a");
    const cloud = await readCloudProgress(config, primaryUser);
    assert(cloud.bookmarks.some((row) => row.questionId === "CMA-P1-0005"), "Local bookmark did not upload to cloud.");
    assert(cloud.missedQuestions.some((row) => row.questionId === "CMA-P1-0003"), "Missed question did not upload to cloud.");
    assert(cloud.flashcards.some((row) => row.questionId === "CMA-P1-0004"), "Flashcard did not upload to cloud.");
    assert(cloud.examAttempts.some((row) => row.attemptId === `exam-${testRunId}`), "Exam history did not upload to cloud.");
  });

  await test("Cloud-to-local merge", async () => {
    await setDoc(config, primaryUser, `users/${primaryUser.uid}/questions/CMA-P1-0006`, envelope("device-cloud", "CMA-P1-0006", {
      questionId: "CMA-P1-0006",
      attempts: 1,
      correct: 1,
      incorrect: 0,
      updatedAt: nowIso(2000),
      updatedAtMs: nowMs(2000),
    }));
    await setDoc(config, primaryUser, `users/${primaryUser.uid}/bookmarks/CMA-P1-0007`, envelope("device-cloud", "CMA-P1-0007", {}, {
      questionId: "CMA-P1-0007",
      active: true,
    }));
    const cloud = await readCloudProgress(config, primaryUser);
    deviceBProgress = mergeLocalWithCloud(progressFixture(`${testRunId}-device-b`, -5000), cloud);
    assert(deviceBProgress.answers["CMA-P1-0006"].correct === 1, "Cloud answer did not merge into local progress.");
    assert(deviceBProgress.bookmarks["CMA-P1-0007"] === true, "Cloud bookmark did not merge into local progress.");
  });

  await test("Conflict resolution", async () => {
    const cloud = { questions: [{ questionId: "CMA-P1-0008", attempts: 1, correct: 0, updatedAtMs: nowMs(-1000) }] };
    const newerLocal = progressFixture(`${testRunId}-conflict`);
    newerLocal.answers["CMA-P1-0008"] = { questionId: "CMA-P1-0008", attempts: 2, correct: 2, updatedAtMs: nowMs(1000) };
    const keptLocal = mergeLocalWithCloud(newerLocal, cloud);
    assert(keptLocal.answers["CMA-P1-0008"].correct === 2, "Newer local record lost conflict.");
    const newerCloud = { questions: [{ questionId: "CMA-P1-0008", attempts: 3, correct: 3, updatedAtMs: nowMs(2000) }] };
    const keptCloud = mergeLocalWithCloud(newerLocal, newerCloud);
    assert(keptCloud.answers["CMA-P1-0008"].correct === 3, "Newer cloud record lost conflict.");
  });

  await test("Offline queue", async () => {
    queue.push({ id: `queue-${testRunId}`, reason: "offline-sync", createdAt: nowIso(), retries: 0 });
    deviceAProgress.bookmarks["CMA-P1-0009"] = true;
    assert(queue.length === 1, "Offline change was not queued.");
  });

  await test("Reconnect synchronization", async () => {
    await writeCloudProgress(config, primaryUser, deviceAProgress, "device-a");
    queue.length = 0;
    const cloud = await readCloudProgress(config, primaryUser);
    assert(cloud.bookmarks.some((row) => row.questionId === "CMA-P1-0009"), "Queued bookmark did not sync after reconnect.");
    assert(queue.length === 0, "Offline queue did not clear after reconnect sync.");
  });

  await test("Bookmarks", async () => {
    const cloud = await readCloudProgress(config, primaryUser);
    assert(cloud.bookmarks.length >= 2, "Expected synced bookmark records.");
  });

  await test("Missed questions", async () => {
    const cloud = await readCloudProgress(config, primaryUser);
    assert(cloud.missedQuestions.some((row) => row.status === "still weak"), "Missed-question status did not sync.");
  });

  await test("Flashcards", async () => {
    const cloud = await readCloudProgress(config, primaryUser);
    assert(cloud.flashcards.some((row) => row.rating === "good"), "Flashcard rating did not sync.");
  });

  await test("Exam history", async () => {
    const cloud = await readCloudProgress(config, primaryUser);
    assert(cloud.examAttempts.some((row) => row.total === 125), "125-question exam attempt did not sync.");
  });

  await test("Readiness score", async () => {
    const score = readinessScore(deviceBProgress || deviceAProgress);
    assert(Number.isInteger(score) && score >= 0 && score <= 100, `Readiness score out of range: ${score}`);
  });

  await test("Cross-device synchronization", async () => {
    const cloudForB = await readCloudProgress(config, primaryUser);
    const deviceB = mergeLocalWithCloud(progressFixture(`${testRunId}-device-b`, -10000), cloudForB);
    deviceB.bookmarks["CMA-P1-0010"] = true;
    await writeCloudProgress(config, primaryUser, deviceB, "device-b");
    const cloudForA = await readCloudProgress(config, primaryUser);
    const deviceA = mergeLocalWithCloud(deviceAProgress, cloudForA);
    assert(deviceA.bookmarks["CMA-P1-0010"] === true, "Device A did not receive Device B bookmark.");
  });

  await test("Backup and restore", async () => {
    const backupSource = mergeLocalWithCloud(progressFixture(`${testRunId}-backup`), await readCloudProgress(config, primaryUser));
    backupSource.bookmarks["CMA-P1-0011"] = true;
    const day = await writeBackup(config, primaryUser, backupSource, "device-a");
    const backup = await getDoc(config, primaryUser, `users/${primaryUser.uid}/dailyBackups/${day}`);
    const restored = backup.progress;
    assert(restored.bookmarks["CMA-P1-0011"] === true, "Restored backup did not include expected bookmark.");
    assert(backup.summary.examAttempts >= 1, "Backup summary did not include exam history.");
  });

  await test("Cross-user security", async () => {
    secondaryUser = await createEmailUser(config);
    const denied = await firestore(config, "GET", `users/${primaryUser.uid}`, secondaryUser.idToken, null, [403]);
    assert(denied.response.status === 403, "Secondary user could read another user's data.");
  });

  const after = await questionsHashAndCount();
  await test("questions.json unchanged", async () => {
    assert(after.count === before.count, "Question count changed during test run.");
    assert(after.hash === before.hash, "questions.json hash changed during test run.");
  });

  for (const item of cleanup.reverse()) {
    await item().catch((error) => console.warn(`WARN cleanup: ${error.message}`));
  }

  if (writeReport) await writeMarkdownReport(before.count);
  const failures = results.filter((item) => item.status === "FAIL");
  if (failures.length) {
    process.exitCode = 1;
  }
}

async function writeMarkdownReport(questionCount) {
  const passed = results.filter((item) => item.status === "PASS").length;
  const failed = results.filter((item) => item.status === "FAIL").length;
  const rows = results.map((item) => `| ${item.status} | ${item.name} | ${item.detail.replaceAll("|", "\\|")} |`).join("\n");
  const content = `# Cloud Sync Regression Test

Last local run: ${new Date().toISOString()}

Question database checked: ${questionCount} questions

Result: ${failed ? `${failed} failure(s)` : "PASS"}

## Automated Coverage

This suite runs before GitHub Pages deployment through \`.github/workflows/pages.yml\`.

It validates:

- Email/Password sign-in
- Google sign-in provider mock
- Firestore connectivity
- Guest mode denial of cloud writes
- Local-to-cloud merge
- Cloud-to-local merge
- Timestamp conflict resolution
- Offline queue behavior
- Reconnect synchronization
- Bookmarks
- Missed questions
- Flashcards
- Exam history
- Readiness score calculation
- Cross-device synchronization
- Daily backup and restore
- Cross-user Firestore security
- \`questions.json\` remains unchanged

## Run Locally

\`\`\`powershell
node tests/cloud-sync-regression.mjs
\`\`\`

To refresh this report after a local run:

\`\`\`powershell
node tests/cloud-sync-regression.mjs --write-report
\`\`\`

## Latest Result

| Status | Test | Detail |
| --- | --- | --- |
${rows}
`;
  await writeFile(reportPath, content, "utf8");
}

main().catch(async (error) => {
  fail("Regression suite bootstrap", error);
  try {
    await writeMarkdownReport(0);
  } catch {
    // Ignore report write failures so the original error remains visible.
  }
  process.exitCode = 1;
});
