// =========================================================
// إعدادات Firebase — مشروع الظلال
// =========================================================
const firebaseConfig = {
  apiKey: "AIzaSyDkhJKmko9lZlVdLfRtQlL_fuA5JLO9miY",
  authDomain: "elzilal-91011.firebaseapp.com",
  projectId: "elzilal-91011",
  storageBucket: "elzilal-91011.firebasestorage.app",
  messagingSenderId: "375286744895",
  appId: "1:375286744895:web:d4601a87a42ec3a0bff58a"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();
