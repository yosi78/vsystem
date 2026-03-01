# דוח שינויים - מערכת הזמנת ציוד
**תאריך:** 27 פברואר 2026
**גרסה:** 0.4

---

## סקירה כללית

בעדכון זה נוספו שתי פיצ'רים מרכזיות:
1. **שליחת מייל אוטומטי למנהל** בכל הזמנה חדשה
2. **ארכיון הזמנות** - העברת הזמנות ישנות לארכיון עם מסך ייעודי

---

## קבצים שעודכנו

| קובץ | סוג שינוי |
|------|-----------|
| `index.html` | הוספת טאבים חדשים + תוכן EmailJS |
| `app.js` | פונקציות חדשות + עדכון פונקציות קיימות |
| `styles.css` | הוספת סגנונות לסטטוסים חדשים |

---

## פירוט השינויים

### 1. `index.html`

#### א. הוספת ספריית EmailJS
```html
<!-- EmailJS (לפני Firebase) -->
<script type="text/javascript"
  src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js">
</script>
```

#### ב. הוספת כפתורי טאב חדשים במסך המנהל
נוספו שני כפתורים בשורת הטאבים:
- `📦 ארכיון` - פותח את מסך הארכיון
- `🔔 הגדרות` - פותח את מסך הגדרות המייל

#### ג. טאב ארכיון (`#archiveTab`)
תוכן חדש:
- כותרת: "📦 הזמנות ישנות - ארכיון"
- תפריט סינון לפי סטטוס (חולקו / נדחו / התקבלו)
- כפתור "📊 ייצוא ארכיון" לייצוא לאקסל
- רשימת הזמנות ארכיון (`#archivedOrdersList`)

#### ד. טאב הגדרות (`#settingsTab`)
תוכן חדש:
- שדה כתובת מייל של המנהל
- שדה EmailJS Public Key
- שדה EmailJS Service ID
- שדה EmailJS Template ID
- כפתור "💾 שמור הגדרות"
- הוראות מפורטות בעברית להגדרת EmailJS

---

### 2. `app.js`

#### א. משתני State חדשים
```javascript
let appSettings = {};       // הגדרות מערכת (מייל, EmailJS)
let archivedOrders = [];    // הזמנות בארכיון
```

#### ב. `initializeApp()` - עדכון
נוספה קריאה ל-`loadSettings()` באתחול:
```javascript
loadSettings();      // טעינת הגדרות לצורך שליחת מייל
loadItemsFromStorage();
```

#### ג. `loadTeacherOrders()` - עדכון
נוסף סינון שמונע הצגת הזמנות ארכיון למורה:
```javascript
.filter(id => data[id] && data[id].userId === userId && data[id].status !== 'archived')
```

#### ד. `loadAllOrders()` - עדכון
שני שינויים:
1. נוספה קריאה ל-`await loadSettings()` בתחילת הפונקציה
2. נוסף סינון שמונע הצגת הזמנות ארכיון ברשימה הראשית:
```javascript
.filter(o => o.status !== 'archived')
```

#### ה. `submitOrder()` - עדכון
לאחר שמירת ההזמנה, נשלח מייל למנהל:
```javascript
const orderId = await saveOrder(orderData);
sendOrderEmail(orderData, orderId);   // שורה חדשה
```

#### ו. `displayAdminOrders()` ו-`filterOrdersByStatus()` - עדכון
נוסף כפתור "📦 ארכיון" על הזמנות בסטטוס "חולק" או "נדחה":
```javascript
${(order.status === 'distributed' || order.status === 'rejected') ? `
    <button class="btn btn-archive" onclick="archiveOrder('${order.id}')">📦 ארכיון</button>
` : ''}
```

#### ז. `switchAdminTab()` - עדכון
- נוספו `#archiveTab` ו-`#settingsTab` לרשימת הטאבים בסלקטור
- נוספו תנאים לזיהוי הכפתורים הפעילים (ארכיון / הגדרות)
- נוספו קריאות לטעינת נתונים בפתיחת טאב:
  - פתיחת טאב ארכיון → `loadArchivedOrders()`
  - פתיחת טאב הגדרות → `loadSettingsForm()`

#### ח. `getStatusText()` - עדכון
נוסף ערך לסטטוס ארכיון:
```javascript
'archived': 'בארכיון'
```

#### ט. פונקציות חדשות - הגדרות ומייל

| פונקציה | תיאור |
|---------|-------|
| `loadSettings()` | טוען הגדרות מ-Firebase (`/settings`), מאתחל EmailJS |
| `loadSettingsForm()` | ממלא את שדות הטופס בהגדרות השמורות |
| `saveEmailSettings()` | שומר הגדרות מייל ל-Firebase |
| `sendOrderEmail(orderData, orderId)` | שולח מייל התראה למנהל דרך EmailJS |

#### י. פונקציות חדשות - ארכיון

| פונקציה | תיאור |
|---------|-------|
| `archiveOrder(orderId)` | מעביר הזמנה לסטטוס `archived`, שומר סטטוס מקורי |
| `loadArchivedOrders()` | טוען הזמנות ארכיון מ-Firebase |
| `displayArchivedOrders(list)` | מציג הזמנות ארכיון על המסך |
| `filterArchivedOrders()` | מסנן ארכיון לפי סטטוס מקורי |
| `exportArchivedOrders()` | מייצא את הארכיון לקובץ CSV |

---

### 3. `styles.css`

נוספו הסגנונות הבאים:

```css
/* סטטוס נדחה - לא היה קיים קודם */
.status-rejected {
    background-color: #FFEBEE;
    color: #C62828;
}

/* סטטוס ארכיון */
.status-archived {
    background-color: #ECEFF1;
    color: #546E7A;
}

/* כרטיסית הזמנה בארכיון */
.order-card.archived {
    opacity: 0.75;
    border-right-color: #90A4AE;
}

/* כפתור ארכיון */
.btn-archive {
    background-color: #78909C;
    color: white;
}

.btn-archive:hover {
    background-color: #546E7A;
    transform: translateY(-2px);
}
```

---

## מבנה נתונים ב-Firebase

### נוסף: `/settings`
```json
{
  "adminEmail": "admin@school.com",
  "emailjsPublicKey": "xxxxxxxxxxxxxxxx",
  "emailjsServiceId": "service_xxxxxxx",
  "emailjsTemplateId": "template_xxxxxxx"
}
```

### עודכן: `/orders/{orderId}`
שדות חדשים בהזמנה מועברת לארכיון:
```json
{
  "status": "archived",
  "originalStatus": "distributed",
  "archivedAt": "2026-02-27T10:00:00.000Z"
}
```

---

## תהליכי עבודה חדשים

### שליחת מייל
```
מורה שולח הזמנה
    → saveOrder() שומר ב-Firebase
    → sendOrderEmail() נשלח ברקע
    → מייל מגיע לכתובת שהוגדרה בהגדרות
```

### העברה לארכיון
```
מנהל לוחץ "📦 ארכיון" על הזמנה שחולקה/נדחתה
    → archiveOrder() שומר originalStatus, מחליף ל-"archived"
    → ההזמנה נעלמת מרשימות הראשיות
    → ניתן לצפות בה בטאב "📦 ארכיון"
    → ניתן לייצא לאקסל מהארכיון
```

---

## הוראות הגדרת המייל (EmailJS)

1. היכנס לאתר **emailjs.com** וצור חשבון חינמי
2. הוסף שירות Gmail → קבל **Service ID**
3. צור תבנית מייל עם המשתנים הבאים:
   - `{{to_email}}` - בשדה "To Email"
   - `{{teacher_name}}` - שם המורה
   - `{{order_class}}` - כיתה
   - `{{order_date}}` - תאריך
   - `{{items_list}}` - רשימת פריטים
4. קבל **Template ID** ו-**Public Key** מהגדרות החשבון
5. הזן את כל הפרטים בטאב "🔔 הגדרות" במסך המנהל

**מגבלת EmailJS חינמי:** 200 מיילים בחודש

---

*דוח זה נוצר אוטומטית ב-27.02.2026*
