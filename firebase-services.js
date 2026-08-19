import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { 
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, doc, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Suas credenciais do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAJ6VYr6vU4_l3zVJsXb1TdK6dFo40UG2E",
  authDomain: "arenadesombra.firebaseapp.com",
  projectId: "arenadesombra",
  storageBucket: "arenadesombra.firebasestorage.app",
  messagingSenderId: "683203571514",
  appId: "1:683203571514:web:63666a86613fd0d7282a03",
  measurementId: "G-TBEGT5EYSR"
};

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export function monitorAuthState(callback) {
  onAuthStateChanged(auth, callback);
}

export async function loginWithGoogle() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Erro no login:", error);
    throw error;
  }
}

export async function logout() {
  await signOut(auth);
}

export async function loadPlayerData(uid) {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    return null;
  }
}

export async function savePlayerData(uid, data) {
  try {
    const docRef = doc(db, "users", uid);
    // setDoc com merge garante que não apagamos campos acidentalmente caso a estrutura mude
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (error) {
    console.error("Erro ao salvar no Firestore:", error);
    return false;
  }
}