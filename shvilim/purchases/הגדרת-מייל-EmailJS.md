# הגדרת EmailJS עם Gmail - הוראות הפעלה

---

## שלב 1 - יצירת חשבון EmailJS
1. היכנס לאתר **emailjs.com**
2. לחץ **Sign Up** → הירשם עם כל מייל שתרצה
3. אמת את החשבון דרך המייל

---

## שלב 2 - חיבור Gmail (קבלת Service ID)
1. בתפריט הצדדי לחץ **Email Services**
2. לחץ **Add New Service**
3. בחר **Gmail**
4. לחץ **Connect Account** → תיפתח חלון של Google → בחר את חשבון Gmail שלך ואשר גישה
5. לחץ **Create Service**
6. העתק את **Service ID** (נראה כך: `service_xxxxxxx`)

---

## שלב 3 - יצירת תבנית מייל (קבלת Template ID)
1. בתפריט לחץ **Email Templates**
2. לחץ **Create New Template**
3. מלא את השדות כך:

| שדה | מה לרשום |
|-----|----------|
| To Email | {{to_email}} |
| Subject | הזמנה חדשה - {{teacher_name}} |
| Content (גוף המייל) | ראה למטה |

תוכן גוף המייל:
```
מורה: {{teacher_name}}
כיתה: {{order_class}}
תאריך: {{order_date}}

פריטים שהוזמנו:
{{items_list}}
```

4. לחץ **Save**
5. העתק את **Template ID** (נראה כך: `template_xxxxxxx`)

---

## שלב 4 - קבלת Public Key
1. לחץ על שמך בפינה הימנית העליונה ← **Account**
2. לחץ על **General**
3. תחת **API Keys** העתק את **Public Key**

---

## שלב 5 - הזנה במסך ההגדרות
היכנס למערכת כמנהל ← טאב **הגדרות** ומלא:

| שדה | מה להכניס |
|-----|-----------|
| כתובת מייל לקבלת התראות | כתובת Gmail שלך |
| Public Key | מה שהעתקת בשלב 4 |
| Service ID | מה שהעתקת בשלב 2 |
| Template ID | מה שהעתקת בשלב 3 |

לחץ **שמור הגדרות** - המיילים יתחילו להגיע אוטומטית.

---

> בחשבון חינמי: 200 מיילים בחודש.
