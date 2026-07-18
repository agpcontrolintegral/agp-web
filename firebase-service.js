import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { firebaseConfig, AGP_WORKSPACE_ID } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
await setPersistence(auth, browserLocalPersistence);

const workspaceRef = doc(firestore, "workspaces", AGP_WORKSPACE_ID);
let saveChain = Promise.resolve();

function cleanForFirestore(value) {
  if (Array.isArray(value)) return value.map(cleanForFirestore);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, cleanForFirestore(v)])
    );
  }
  return value;
}

export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function logout() {
  await signOut(auth);
}

export function observeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export function requireAuth(redirect = "login.html") {
  return new Promise((resolve) => {
    const stop = onAuthStateChanged(auth, (user) => {
      stop();
      if (!user) {
        location.replace(redirect);
        return;
      }
      resolve(user);
    });
  });
}

export async function saveWorkspace(data) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("AUTH_REQUIRED");
  const payload = cleanForFirestore(data);

  saveChain = saveChain.then(() => setDoc(workspaceRef, {
    data: payload,
    updatedAt: serverTimestamp(),
    updatedBy: currentUser.uid,
    updatedByEmail: currentUser.email || ""
  }, { merge: true }));

  return saveChain;
}

export async function loadWorkspace() {
  const snapshot = await getDoc(workspaceRef);
  return snapshot.exists() ? snapshot.data()?.data || null : null;
}

export function subscribeWorkspace(callback, onError = console.error) {
  return onSnapshot(workspaceRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.data()?.data || null : null);
  }, onError);
}

export async function createPublicLead(payload) {
  const result = await addDoc(collection(firestore, "publicLeads"), {
    ...cleanForFirestore(payload),
    status: "Nuevo",
    source: "AGP Web",
    createdAt: serverTimestamp()
  });
  return result.id;
}

export function subscribePublicLeads(callback, onError = console.error) {
  const leadsQuery = query(collection(firestore, "publicLeads"), orderBy("createdAt", "desc"));
  return onSnapshot(leadsQuery, (snapshot) => {
    callback(snapshot.docs.map(item => ({
      firestoreId: item.id,
      ...item.data()
    })));
  }, onError);
}

export async function deletePublicLead(id) {
  if (!auth.currentUser) throw new Error("AUTH_REQUIRED");
  await deleteDoc(doc(firestore, "publicLeads", id));
}

export async function ensureUserProfile(user) {
  const ref = doc(firestore, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email || "",
      displayName: user.displayName || "Administrador AGP",
      role: "admin",
      active: true,
      createdAt: serverTimestamp()
    });
  }
}

export { auth, firestore };
