📖 הוראות התקנה - מערכת הזמנת ציוד
=====================================

## שלב 1️⃣: יצירת Firebase Project

1. לך לאתר: https://firebase.google.com/
2. לחץ "Go to console"
3. השתמש בחשבון Google שלך
4. לחץ "Create project"
5. בחר שם פרויקט (לדוגמה: "equipment-order-system")
6. בחר את המדינה שלך
7. לחץ "Create project"

---

## שלב 2️⃣: הפעלת Authentication

1. בתפריט בצד שמאל, לחץ "Authentication"
2. לחץ "Get started"
3. בחר "Email/Password"
4. הפעל את זה (Enable)
5. לחץ "Save"

---

## שלב 3️⃣: הפעלת Firestore Database

1. בתפריט בצד שמאל, לחץ "Firestore Database"
2. לחץ "Create database"
3. בחר "Start in test mode" (זה בסדר לתחילה, אחר כך תוכל לשנות)
4. בחר את מיקום הנתונים הקרוב אלייך
5. לחץ "Create"

---

## שלב 4️⃣: קבל את Firebase Config

1. לך ל- Project Settings (גלגל שיניים בפינה העליונה)
2. בטאב "General" גלול למטה
3. תחת "Your apps" תקליק על "</> (Web)"
4. עם זה, יופיע קוד - **עתק את כל firebaseConfig**

זה יראה ככה:
```
const firebaseConfig = {
    apiKey: "AIzaSyD...",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789...",
    appId: "1:123456789:web:abc123..."
};
```

---

## שלב 5️⃣: עדכן את firebase-config.js

1. פתח את הקובץ `firebase-config.js` בעורך קוד
2. החלף את הערכים בפרטים שקיבלת מ-Firebase
3. שמור את הקובץ

---

## שלב 6️⃣: הרצת האפליקציה

### אפשרות א: בדוק מקומי (פשוט ביותר)
1. הורד את Python (אם אין לך)
2. פתח Terminal/Command Prompt
3. עבור לתיקיית `equipment-order-system`
4. הקלד: `python -m http.server 8000`
5. בדפדפן, לך ל: http://localhost:8000

### אפשרות ב: GitHub Pages (חינם, כולל לאינטרנט)
1. עלה ל- https://github.com (עם חשבון)
2. יצור repository חדש: "equipment-order-system"
3. Upload את כל הקבצים
4. הגדרות → Pages
5. בחר "main branch" as source
6. זהו! האפליקציה תהיה זמינה ב: https://your-username.github.io/equipment-order-system

---

## 🔓 Firebase Security Rules

בשלב בדיקה (Test Mode), הכל פתוח. אבל כדי לאבטח:

1. לך ל- Firestore Database
2. כנס לטאב "Rules"
3. החלף את התוכן בזה:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // Orders collection
    match /orders/{orderId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' || resource.data.teacherId == request.auth.uid);
    }
  }
}
```

4. לחץ "Publish"

---

## 🧪 בדיקה ראשונית

1. פתח את האפליקציה בדפדפן
2. לחץ "הרשמה"
3. הזן:
   - שם: "מורה בדיקה"
   - אימייל: "teacher@test.com"
   - סיסמה: "123456"
   - תפקיד: בחר "מורה"
4. לחץ "הרשמה"
5. כניסה עם הפרטים הנ"ל
6. צפה בממשק המורה!

7. בהרשמה נוספת:
   - שם: "ניהול"
   - אימייל: "admin@test.com"
   - סיסמה: "123456"
   - תפקיד: בחר "אחראי ציוד"
8. כניסה עם "admin@test.com"
9. תראה את לוח הבקרה!

---

## 🐛 אם משהו לא עובד:

1. בדוק את Browser Console (F12 → Console)
2. ודא שהנתונים בـ `firebase-config.js` נכונים
3. בדוק אם Firebase Firestore מופעל
4. בדוק אם Authentication Email/Password מופעל
5. נסה Ctrl+Shift+Delete כדי למחוק cookies

---

## 📁 מבנה הקבצים

```
equipment-order-system/
├── index.html          ← ממשק ראשי
├── styles.css          ← סטילינג
├── app.js              ← כל הלוגיקה
├── firebase-config.js  ← תצורת Firebase (צריך להשתנות!)
└── README.md           ← הקובץ הזה
```

---

## 🎉 בהצלחה!

אם יש שאלות, תוכל תמיד לשנות את הקובץ שלי :)
