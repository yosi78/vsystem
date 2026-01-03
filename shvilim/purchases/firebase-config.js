// ⚠️ **חשוב: החלף את הערכים הבאים בפרטי Firebase שלך**
// לך ל- Firebase Console → Project Settings → Config

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCUc2QW8CEtJXfJJzh75J2KKZ7--Rb1Sls",
  authDomain: "purchases-a4b7f.firebaseapp.com",
  databaseURL: "https://purchases-a4b7f-default-rtdb.firebaseio.com",
  projectId: "purchases-a4b7f",
  storageBucket: "purchases-a4b7f.firebasestorage.app",
  messagingSenderId: "31923674034",
  appId: "1:31923674034:web:b7a3e21abd805d4140e2ab",
  measurementId: "G-DFPTCQBGQH"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log('✓ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

// ============================================
// אפשרויות הגדרה - ערוך כאן אם צריך
// ============================================

const APP_CONFIG = {
    items: [
        { id: 1, name: 'עטים שחורים', category: 'משרדי' },
        { id: 2, name: 'עטים אדומים', category: 'משרדי' },
        { id: 3, name: 'עטים כחולים', category: 'משרדי' },
        { id: 4, name: 'עפרונות', category: 'משרדי' },
        { id: 5, name: 'מחקים', category: 'משרדי' },
        { id: 6, name: 'דבק סטיק', category: 'משרדי' },
        { id: 7, name: 'דבק נוזלי', category: 'משרדי' },
        { id: 8, name: 'נייר A4', category: 'משרדי' },
        { id: 9, name: 'מחברות', category: 'משרדי' },
        { id: 10, name: 'דפי צבע', category: 'משרדי' },
        { id: 11, name: 'חרוזים', category: 'יצירה' },
        { id: 12, name: 'חוט צמר', category: 'יצירה' },
        { id: 13, name: 'סרטים דבקים', category: 'יצירה' },
        { id: 14, name: 'טוש צבעוני', category: 'יצירה' },
        { id: 15, name: 'טושים שחורים', category: 'יצירה' },
        { id: 16, name: 'עלי נייר צבוע', category: 'יצירה' },
        { id: 17, name: 'בלונים', category: 'יצירה' },
        { id: 18, name: 'ספוג קרפט', category: 'יצירה' }
    ]
};
