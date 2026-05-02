import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, onSnapshot } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDO82ttBrhtTNnD654GvBj5GbuhqwQCkFw",
  authDomain: "information-box-pro.firebaseapp.com",
  projectId: "information-box-pro",
  appId: "1:460288669016:web:4308c89220dd7589cfe12d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, provider, signInWithPopup, signOut, onAuthStateChanged, db, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, onSnapshot };
