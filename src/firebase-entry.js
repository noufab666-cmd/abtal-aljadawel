// يجمع ما نحتاجه من مكتبة Firebase في ملف واحد داخل المشروع (بدون الاعتماد على روابط خارجية)
export { initializeApp } from 'firebase/app';
export {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, connectAuthEmulator, updatePassword,
} from 'firebase/auth';
export {
  getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, getDocs, addDoc,
  deleteDoc, updateDoc, collection, writeBatch, serverTimestamp, query, orderBy, limit,
} from 'firebase/firestore';
