// 🔧 Firebase Configuration
// ⚠️ עדכן את הערכים הבאים בפרטי Firebase שלך
// לך ל- Firebase Console → Project Settings → Your apps → Config

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

// ============================================
// Firebase Initialization
// ============================================

try {
    firebase.initializeApp(firebaseConfig);
    console.log('✓ Firebase initialized successfully');
    
    // Initialize Realtime Database
    const database = firebase.database();
    console.log('✓ Realtime Database ready');
    
    // בדוק חיבור ל-Database
    firebase.database().ref('.info/connected').on('value', (snapshot) => {
        if (snapshot.val() === true) {
            console.log('✓ Connected to Realtime Database');
        } else {
            console.log('⚠️ Disconnected from Realtime Database');
        }
    });
    
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
{ id: 18, name: 'ספוג קרפט', category: 'יצירה' },
{ id: 19, name: 'טוש לוח מחיק', category: 'משרדי' },
{ id: 20, name: 'מחק ללוח', category: 'משרדי' },
{ id: 21, name: 'דלי טושים עבים', category: 'יצירה' },
{ id: 22, name: 'דלי טושים דקים', category: 'יצירה' },
{ id: 23, name: 'שמרדף', category: 'משרדי' },
{ id: 24, name: 'עפרונות צבעוניים דקים', category: 'משרדי' },
{ id: 25, name: 'עפרונות צבעוניים עבים', category: 'משרדי' },
{ id: 26, name: 'עפרונות עם מחק', category: 'משרדי' },
{ id: 27, name: 'פלסטלינה', category: 'יצירה' },
{ id: 28, name: 'פנדה 24', category: 'יצירה' },
{ id: 29, name: 'מספריים', category: 'משרדי' },
{ id: 30, name: 'מספריים שמאליים', category: 'משרדי' },
{ id: 31, name: 'שדכן 10 קנגרו', category: 'משרדי' },
{ id: 32, name: 'מחדד מתכת', category: 'משרדי' },
{ id: 33, name: 'דבק סטיק 8', category: 'משרדי' },
{ id: 34, name: 'חוצץ צבעוני A4', category: 'משרדי' },
{ id: 35, name: 'חוצץ שחור A4', category: 'משרדי' },
{ id: 36, name: 'חוצץ כסף A4', category: 'משרדי' },
{ id: 37, name: 'חוצץ זהב A4', category: 'משרדי' },
{ id: 38, name: 'חוצץ לבן A4', category: 'משרדי' },
{ id: 39, name: 'סיכות ראש צבעוני', category: 'משרדי' },
{ id: 40, name: 'טוש שקפים שחור M', category: 'יצירה' },
{ id: 41, name: 'טוש שקפים שחור S', category: 'יצירה' },
{ id: 42, name: 'דפי דפדפת A4 משובץ', category: 'משרדי' },
{ id: 43, name: 'סרגל 15 פלסטיק', category: 'משרדי' },
{ id: 44, name: 'מחק', category: 'משרדי' },
{ id: 45, name: 'חוט ריקמה', category: 'יצירה' },
{ id: 46, name: 'צמר', category: 'יצירה' },
{ id: 47, name: 'דיסק למחשב', category: 'משרדי' },
{ id: 48, name: 'חוט דיג', category: 'יצירה' },
{ id: 49, name: 'גומיות דקות צבעוניות', category: 'משרדי' },
{ id: 50, name: 'צבעי מים גיוטו', category: 'יצירה' },
{ id: 51, name: 'מכחולים', category: 'יצירה' },
{ id: 52, name: 'דפי למינציה A4', category: 'משרדי' },
{ id: 53, name: 'דפי למינציה A3', category: 'משרדי' },
{ id: 54, name: 'בריסטול שחור', category: 'יצירה' },
{ id: 55, name: 'נרות חימום 50 יח\'', category: 'יצירה' },
{ id: 56, name: 'נצנצים', category: 'יצירה' },
{ id: 57, name: 'נרות דבק חם 1 קג\'', category: 'יצירה' },
{ id: 58, name: 'צלופן מעורב', category: 'יצירה' },
{ id: 59, name: 'מקלות רופא', category: 'משרדי' },
{ id: 60, name: 'נייר פרגמנט', category: 'משרדי' },
{ id: 61, name: 'טוש ארטליין 70', category: 'יצירה' },
{ id: 62, name: 'טוש ארטליין 90', category: 'יצירה' },
{ id: 63, name: 'נרות חנוכה', category: 'יצירה' },
{ id: 64, name: 'סרט הדבקה שקוף 2\'', category: 'משרדי' },
{ id: 65, name: 'בריסטול A4 לבן', category: 'יצירה' },
{ id: 66, name: 'בריסטול A4 פסטל', category: 'יצירה' },
{ id: 67, name: 'בריסטול A4 שחור', category: 'יצירה' },
{ id: 68, name: 'בריסטול A4 זהב', category: 'יצירה' },
{ id: 69, name: 'סט מכחולים', category: 'יצירה' },
{ id: 70, name: 'נייר קרפ', category: 'יצירה' },
{ id: 71, name: 'סיכות 10 מארז 3 יח\'', category: 'משרדי' },
{ id: 72, name: 'חימר דאס', category: 'יצירה' },
{ id: 73, name: 'דבק סטיק ביג שלישייה', category: 'משרדי' },
{ id: 74, name: 'בריסטול לבן', category: 'יצירה' },
{ id: 75, name: 'מספריים ידית שחורה', category: 'משרדי' },
{ id: 76, name: 'מנקה מקטרות', category: 'משרדי' },
{ id: 77, name: 'דבק פלסטי גלון', category: 'משרדי' },
{ id: 78, name: 'מספרי גננת', category: 'משרדי' },
{ id: 79, name: 'צבע אקריליק', category: 'יצירה' },
{ id: 80, name: 'עט כדורי לחצן שחור', category: 'משרדי' },
{ id: 81, name: 'מחברת ספירל A4', category: 'משרדי' },
{ id: 82, name: 'מדבקות נייר', category: 'משרדי' },
{ id: 83, name: 'סט טוש לשקף', category: 'יצירה' },
{ id: 84, name: 'מחברת קמפוס סיכה שורה', category: 'משרדי' },
{ id: 85, name: 'ניר קופי/פחם שחור', category: 'משרדי' },
{ id: 86, name: 'עטיפה שקופה למחברת', category: 'משרדי' },
{ id: 87, name: 'בלוק אקוורל A3', category: 'יצירה' },
{ id: 88, name: 'סרט דו צדדי', category: 'משרדי' },
{ id: 89, name: 'צמדן זכר', category: 'משרדי' },
{ id: 90, name: 'צמדן נקבה', category: 'משרדי' },
{ id: 91, name: 'קרטון ביצוע A3', category: 'משרדי' },
{ id: 92, name: 'סיכות מתפצלות', category: 'משרדי' },
{ id: 93, name: 'תומך ספר', category: 'משרדי' },
{ id: 94, name: 'מספריים קמפוס 8.25"', category: 'משרדי' },
{ id: 95, name: 'עיניים זזות 18מ"מ', category: 'יצירה' },
{ id: 96, name: 'עיניים זזות 10מ"מ', category: 'יצירה' },
{ id: 97, name: 'מסקינטייפ', category: 'משרדי' },
{ id: 98, name: 'סכין יפני רחב', category: 'משרדי' },
{ id: 99, name: 'סכין יפני צר', category: 'משרדי' }
    ]
};

// ============================================
// ודא שה-APP_CONFIG טוען בהצלחה
// ============================================

console.log('✓ APP_CONFIG loaded with', APP_CONFIG.items.length, 'items');
