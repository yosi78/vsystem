// ===== הגדרות Firebase =====
// יש להחליף בנתונים שלך מ-Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyDSM34F-l_Zt-MQmAbGWi-AHg-rInIJzhs",
  authDomain: "computer-room-booking.firebaseapp.com",
  projectId: "computer-room-booking",
  storageBucket: "computer-room-booking.firebasestorage.app",
  messagingSenderId: "1033131890195",
  appId: "1:1033131890195:web:9a497ab2da156d07c491e6",
  measurementId: "G-C24BG9R15L"
};


// ===== משתנים גלובליים =====
const ADMIN_PASSWORD = "n0987";
const HOURS = ["8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

let db;
let currentTeacher = "";
let selectedDate = "";
let selectedHour = "";
let weeklySchedule = {};

// ===== אתחול =====
document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();
    setupEventListeners();
    setupDateInputs();
});

// ===== אתחול Firebase =====
function initializeFirebase() {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        
        // מעקב אחר סטטוס החיבור
        const connectedRef = db.ref('.info/connected');
        connectedRef.on('value', (snapshot) => {
            const statusDot = document.getElementById('statusDot');
            const statusText = document.getElementById('connectionText');
            
            if (snapshot.val() === true) {
                statusDot.className = 'status-dot connected';
                statusText.textContent = 'מחובר לענן ✓';
            } else {
                statusDot.className = 'status-dot error';
                statusText.textContent = 'לא מחובר לענן';
            }
        });
        
        // טעינת מערכת שבועית
        loadWeeklySchedule();
        
    } catch (error) {
        console.error('שגיאה באתחול Firebase:', error);
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('connectionText');
        statusDot.className = 'status-dot error';
        statusText.textContent = 'שגיאת חיבור - בדוק הגדרות Firebase';
    }
}

// ===== הגדרת מאזיני אירועים =====
function setupEventListeners() {
    // זרימה ראשית
    document.getElementById('btnNext1').addEventListener('click', goToDateScreen);
    document.getElementById('btnBack1').addEventListener('click', goToLoginScreen);
    document.getElementById('btnNext2').addEventListener('click', goToHoursScreen);
    document.getElementById('btnBack2').addEventListener('click', goToDateScreen);
    document.getElementById('btnConfirm').addEventListener('click', confirmBooking);
    document.getElementById('btnNewBooking').addEventListener('click', goToLoginScreen);
    
    // זרימת מנהל
    document.getElementById('btnAdmin').addEventListener('click', goToAdminLoginScreen);
    document.getElementById('btnBackAdmin').addEventListener('click', goToLoginScreen);
    document.getElementById('btnAdminLogin').addEventListener('click', adminLogin);
    document.getElementById('btnLogout').addEventListener('click', goToLoginScreen);
    
    // טאבים במסך מנהל
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // פעולות מנהל
    document.getElementById('btnSaveSchedule').addEventListener('click', saveWeeklySchedule);
    document.getElementById('adminDatePicker').addEventListener('change', loadBookingsForDate);
    
    // שינוי תאריך
    document.getElementById('dateInput').addEventListener('change', handleDateChange);
    
    // Enter במקלדת
    document.getElementById('teacherName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') goToDateScreen();
    });
    
    document.getElementById('adminPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') adminLogin();
    });
}

// ===== הגדרת שדות תאריך =====
function setupDateInputs() {
    const today = new Date();
    const dateStr = formatDateForInput(today);
    
    document.getElementById('dateInput').min = dateStr;
    document.getElementById('dateInput').value = dateStr;
    document.getElementById('adminDatePicker').min = dateStr;
    document.getElementById('adminDatePicker').value = dateStr;
}

// ===== פונקציות עזר לתאריכים =====
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateForDisplay(dateStr) {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(dateStr + 'T00:00:00');
    const dayName = DAYS[date.getDay()];
    return `${dayName}, ${day}/${month}/${year}`;
}

function getDayOfWeek(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.getDay();
}

// ===== ניווט בין מסכים =====
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function goToLoginScreen() {
    currentTeacher = "";
    selectedDate = "";
    selectedHour = "";
    document.getElementById('teacherName').value = "";
    document.getElementById('adminPassword').value = "";
    showScreen('loginScreen');
}

function goToDateScreen() {
    const name = document.getElementById('teacherName').value.trim();
    
    if (!name) {
        alert('נא להזין שם מורה');
        return;
    }
    
    currentTeacher = name;
    document.getElementById('teacherNameDisplay').textContent = name;
    showScreen('dateScreen');
}

function handleDateChange() {
    selectedDate = document.getElementById('dateInput').value;
}

async function goToHoursScreen() {
    selectedDate = document.getElementById('dateInput').value;
    
    if (!selectedDate) {
        alert('נא לבחור תאריך');
        return;
    }
    
    const dayOfWeek = getDayOfWeek(selectedDate);
    const availableHours = weeklySchedule[dayOfWeek] || [];
    
    if (availableHours.length === 0) {
        alert('החדר לא זמין בתאריך זה');
        return;
    }
    
    document.getElementById('selectedDateDisplay').textContent = formatDateForDisplay(selectedDate);
    showScreen('hoursScreen');
    
    await renderHoursGrid();
}

// ===== רינדור רשת השעות =====
async function renderHoursGrid() {
    const container = document.getElementById('hoursContainer');
    container.innerHTML = '';
    
    const dayOfWeek = getDayOfWeek(selectedDate);
    const availableHours = weeklySchedule[dayOfWeek] || [];
    const bookings = await getBookingsForDate(selectedDate);
    
    HOURS.forEach(hour => {
        const slot = document.createElement('div');
        slot.className = 'hour-slot';
        
        const isAvailable = availableHours.includes(hour);
        const booking = bookings[hour];
        
        if (booking) {
            // שעה תפוסה
            slot.classList.add('booked');
            slot.innerHTML = `
                <div>${hour}</div>
                <div class="teacher-name">${booking.teacher}</div>
            `;
        } else if (isAvailable) {
            // שעה זמינה
            slot.classList.add('available');
            slot.textContent = hour;
            slot.addEventListener('click', () => selectHour(hour, slot));
        } else {
            // שעה לא זמינה
            slot.classList.add('unavailable');
            slot.textContent = hour;
        }
        
        container.appendChild(slot);
    });
}

// ===== בחירת שעה =====
function selectHour(hour, element) {
    // הסרת בחירה קודמת
    document.querySelectorAll('.hour-slot.selected').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // בחירה חדשה
    element.classList.add('selected');
    selectedHour = hour;
    
    // הפעלת כפתור אישור
    document.getElementById('btnConfirm').disabled = false;
}

// ===== אישור הזמנה =====
async function confirmBooking() {
    if (!selectedHour) {
        alert('נא לבחור שעה');
        return;
    }
    
    try {
        // שמירה ב-Firebase
        await db.ref(`bookings/${selectedDate}/${selectedHour}`).set({
            teacher: currentTeacher,
            timestamp: Date.now()
        });
        
        // הצגת מסך אישור
        const summary = document.getElementById('bookingSummary');
        summary.innerHTML = `
            <div class="summary-row">
                <span class="label">מורה:</span>
                <span class="value">${currentTeacher}</span>
            </div>
            <div class="summary-row">
                <span class="label">תאריך:</span>
                <span class="value">${formatDateForDisplay(selectedDate)}</span>
            </div>
            <div class="summary-row">
                <span class="label">שעה:</span>
                <span class="value">${selectedHour}</span>
            </div>
        `;
        
        showScreen('confirmScreen');
        
    } catch (error) {
        console.error('שגיאה בשמירת הזמנה:', error);
        alert('שגיאה בשמירת ההזמנה. נסי שוב.');
    }
}

// ===== כניסת מנהל =====
function goToAdminLoginScreen() {
    showScreen('adminLoginScreen');
}

function adminLogin() {
    const password = document.getElementById('adminPassword').value;
    
    if (password === ADMIN_PASSWORD) {
        showScreen('adminScreen');
        renderScheduleForm();
        loadBookingsForDate();
    } else {
        alert('סיסמה שגויה');
        document.getElementById('adminPassword').value = "";
    }
}

// ===== החלפת טאבים במנהל =====
function switchTab(tabName) {
    // עדכון כפתורי טאב
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // עדכון תוכן טאב
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tabName === 'schedule') {
        document.getElementById('scheduleTab').classList.add('active');
    } else {
        document.getElementById('bookingsTab').classList.add('active');
    }
}

// ===== טעינת מערכת שבועית =====
async function loadWeeklySchedule() {
    try {
        const snapshot = await db.ref('weeklySchedule').once('value');
        weeklySchedule = snapshot.val() || {};
        
        // אם אין מערכת, צור מערכת ברירת מחדל
        if (Object.keys(weeklySchedule).length === 0) {
            // ימי א'-ה' עם כל השעות
            for (let i = 0; i <= 4; i++) {
                weeklySchedule[i] = [...HOURS];
            }
            // שישי ושבת ריקים
            weeklySchedule[5] = [];
            weeklySchedule[6] = [];
        }
        
    } catch (error) {
        console.error('שגיאה בטעינת מערכת:', error);
    }
}

// ===== רינדור טופס מערכת שבועית =====
function renderScheduleForm() {
    const container = document.getElementById('scheduleContainer');
    container.innerHTML = '';
    
    DAYS.forEach((dayName, dayIndex) => {
        const dayRow = document.createElement('div');
        dayRow.className = 'day-row';
        
        const header = document.createElement('div');
        header.className = 'day-header';
        header.textContent = `יום ${dayName}`;
        dayRow.appendChild(header);
        
        const hoursGrid = document.createElement('div');
        hoursGrid.className = 'hours-grid';
        
        HOURS.forEach(hour => {
            const hourCheck = document.createElement('div');
            hourCheck.className = 'hour-check';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `day${dayIndex}-${hour}`;
            checkbox.value = hour;
            
            // סימון אם השעה זמינה במערכת
            if (weeklySchedule[dayIndex] && weeklySchedule[dayIndex].includes(hour)) {
                checkbox.checked = true;
            }
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = hour;
            
            hourCheck.appendChild(checkbox);
            hourCheck.appendChild(label);
            hoursGrid.appendChild(hourCheck);
        });
        
        dayRow.appendChild(hoursGrid);
        container.appendChild(dayRow);
    });
}

// ===== שמירת מערכת שבועית =====
async function saveWeeklySchedule() {
    const newSchedule = {};
    
    DAYS.forEach((_, dayIndex) => {
        const hours = [];
        
        HOURS.forEach(hour => {
            const checkbox = document.getElementById(`day${dayIndex}-${hour}`);
            if (checkbox && checkbox.checked) {
                hours.push(hour);
            }
        });
        
        newSchedule[dayIndex] = hours;
    });
    
    try {
        await db.ref('weeklySchedule').set(newSchedule);
        weeklySchedule = newSchedule;
        alert('המערכת השבועית נשמרה בהצלחה! ✓');
    } catch (error) {
        console.error('שגיאה בשמירת מערכת:', error);
        alert('שגיאה בשמירת המערכת. נסה שוב.');
    }
}

// ===== טעינת הזמנות לתאריך =====
async function loadBookingsForDate() {
    const date = document.getElementById('adminDatePicker').value;
    const container = document.getElementById('bookingsList');
    
    if (!date) {
        container.innerHTML = '<div class="empty-state">בחר תאריך לצפייה בהזמנות</div>';
        return;
    }
    
    try {
        const bookings = await getBookingsForDate(date);
        
        if (Object.keys(bookings).length === 0) {
            container.innerHTML = '<div class="empty-state">אין הזמנות לתאריך זה</div>';
            return;
        }
        
        container.innerHTML = '';
        
        // מיון לפי שעה
        const sortedBookings = Object.entries(bookings).sort((a, b) => {
            return a[0].localeCompare(b[0]);
        });
        
        sortedBookings.forEach(([hour, booking]) => {
            const item = document.createElement('div');
            item.className = 'booking-item';
            
            item.innerHTML = `
                <div class="booking-info">
                    <div class="time">${hour}</div>
                    <div class="teacher">${booking.teacher}</div>
                </div>
                <button class="btn-delete" onclick="deleteBooking('${date}', '${hour}')">
                    מחק
                </button>
            `;
            
            container.appendChild(item);
        });
        
    } catch (error) {
        console.error('שגיאה בטעינת הזמנות:', error);
        container.innerHTML = '<div class="empty-state">שגיאה בטעינת הזמנות</div>';
    }
}

// ===== מחיקת הזמנה =====
async function deleteBooking(date, hour) {
    if (!confirm(`האם למחוק את ההזמנה לשעה ${hour}?`)) {
        return;
    }
    
    try {
        await db.ref(`bookings/${date}/${hour}`).remove();
        await loadBookingsForDate();
        alert('ההזמנה נמחקה בהצלחה ✓');
    } catch (error) {
        console.error('שגיאה במחיקת הזמנה:', error);
        alert('שגיאה במחיקת ההזמנה. נסה שוב.');
    }
}

// ===== קבלת הזמנות לתאריך =====
async function getBookingsForDate(date) {
    try {
        const snapshot = await db.ref(`bookings/${date}`).once('value');
        return snapshot.val() || {};
    } catch (error) {
        console.error('שגיאה בקבלת הזמנות:', error);
        return {};
    }
}

// ===== בדיקה אם תאריך תפוס לחלוטין =====
async function isDateFullyBooked(date) {
    const dayOfWeek = getDayOfWeek(date);
    const availableHours = weeklySchedule[dayOfWeek] || [];
    const bookings = await getBookingsForDate(date);
    
    // אם אין שעות זמינות בכלל
    if (availableHours.length === 0) {
        return true;
    }
    
    // בדיקה אם כל השעות הזמינות תפוסות
    const bookedHours = Object.keys(bookings);
    const allBooked = availableHours.every(hour => bookedHours.includes(hour));
    
    return allBooked;
}

// הפיכת הפונקציה לגלובלית לשימוש ב-HTML
window.deleteBooking = deleteBooking;
