const firebaseConfig = {
  apiKey: "AIzaSyDAqUbYPX5wVpRn1Tgs4uquB_qhMAUz8q0",
  authDomain: "logic-gadget-store.firebaseapp.com",
  projectId: "logic-gadget-store",
  storageBucket: "logic-gadget-store.firebasestorage.app",
  messagingSenderId: "914698370044",
  appId: "1:914698370044:web:a5bc33e15a76094a68d079"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
