import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// --- Firebase設定 ---
// アップロードされたファイルの設定値を適用しています
const firebaseConfig = {
    apiKey: "AIzaSyAvxKaj49CfK9T5-h4AycKcguU2gsSXTxc",
    authDomain: "new-check-137f9.firebaseapp.com",
    projectId: "new-check-137f9",
    storageBucket: "new-check-137f9.firebasestorage.app",
    messagingSenderId: "534868750946",
    appId: "1:534868750946:web:8e4341569853712bd8573b",
    measurementId: "G-QN9H01RKQV"
};

// Canvas環境での安定動作のため、Firebase初期化はコンポーネント外で行います
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
