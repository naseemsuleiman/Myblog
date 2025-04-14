import { initializeApp } from "firebase/app";
import { 
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; 

const firebaseConfig = {
  apiKey: "AIzaSyBkNJuthLKc2zhqlFWWwnpJbQYdsfFsQNA",
  authDomain: "blog-7d4bb.firebaseapp.com",
  projectId: "blog-7d4bb",
  storageBucket: "blog-7d4bb.firebasestorage.app",
  messagingSenderId: "423801267499",
  appId: "1:423801267499:web:58f2338b6ae4d2b0fc516e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); 

export const loginWithEmail = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signUpWithEmail = (email, password) => {
  return createUserWithEmailAndPassword(auth, email, password);
};

export const handleLogout = () => {
  return signOut(auth);
};

export const onAuthStateChangedListener = (callback) => {
  return onAuthStateChanged(auth, callback);
};
export const updateUserProfile = async (userId, data) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, data);
    return { success: true, message: 'Profile updated successfully!' };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, message: 'Failed to update profile: ' + error.message };
  }
};
export { db, auth, storage }; 
