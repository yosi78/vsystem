// ============= הגדרת Firebase =============
// ⚠️ תחליף את הערכים האלה עם ה-config שלך מ-Firebase Console
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

const firebaseConfig = {
  apiKey: "AIzaSyDSM34F-l_Zt-MQmAbGWi-AHg-rInIJzhs",
  authDomain: "computer-room-booking.firebaseapp.com",
  databaseURL: "https://computer-room-booking-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "computer-room-booking",
  storageBucket: "computer-room-booking.firebasestorage.app",
  messagingSenderId: "1033131890195",
  appId: "1:1033131890195:web:9a497ab2da156d07c491e6",
  measurementId: "G-C24BG9R15L"
};


// Initialize Firebase

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
let db = null;
let isConnectedToFirebase = false;

// ניסיון חיבור ל-Firebase
try {
    if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("YOUR_")) {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        isConnectedToFirebase = true;
    }
} catch (error) {
    console.log("Firebase לא מחובר:", error.message);
    isConnectedToFirebase = false;
}

// עדכון סטטוס החיבור
function updateConnectionStatus() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (isConnectedToFirebase) {
        statusDot.style.background = '#4CAF50';
        statusText.textContent = '✓ מחובר ל-Firebase';
    } else {
        statusDot.style.background = '#ff9800';
        statusText.textContent = '⚠️ Local Storage (ללא Firebase)';
    }
}

// ============= מערכת אחסון נתונים =============
class DataManager {
    constructor() {
        this.bookingsKey = 'computerRoom_bookings';
        this.scheduleKey = 'computerRoom_schedule';
        this.initializeData();
    }

    initializeData() {
        if (!localStorage.getItem(this.scheduleKey)) {
            const defaultSchedule = {
                0: { 8: true, 9: true, 10: true, 11: true, 12: false, 13: true, 14: true, 15: true, 16: true, 17: true },
                1: { 8: true, 9: true, 10: true, 11: true, 12: false, 13: true, 14: true, 15: true, 16: true, 17: true },
                2: { 8: true, 9: true, 10: true, 11: true, 12: false, 13: true, 14: true, 15: true, 16: true, 17: true },
                3: { 8: true, 9: true, 10: true, 11: true, 12: false, 13: true, 14: true, 15: true, 16: true, 17: true },
                4: { 8: true, 9: true, 10: true, 11: true, 12: false, 13: true, 14: true, 15: true, 16: true, 17: true },
                5: { 8: true, 9: true, 10: true, 11: true, 12: false, 13: true, 14: true, 15: true, 16: true, 17: true },
                6: { 8: false, 9: false, 10: false, 11: false, 12: false, 13: false, 14: false, 15: false, 16: false, 17: false }
            };
            localStorage.setItem(this.scheduleKey, JSON.stringify(defaultSchedule));
        }

        if (!localStorage.getItem(this.bookingsKey)) {
            localStorage.setItem(this.bookingsKey, JSON.stringify({}));
        }
    }

    getSchedule() {
        return JSON.parse(localStorage.getItem(this.scheduleKey)) || {};
    }

    setSchedule(schedule) {
        localStorage.setItem(this.scheduleKey, JSON.stringify(schedule));
        this.notifyListeners();
    }

    getBookings() {
        return JSON.parse(localStorage.getItem(this.bookingsKey)) || {};
    }

    addBooking(date, hours, teacher) {
        const bookings = this.getBookings();
        if (!bookings[date]) {
            bookings[date] = {};
        }
        
        hours.forEach(hour => {
            const bookingId = `${date}-${hour}-${Date.now()}`;
            bookings[date][bookingId] = {
                teacher: teacher,
                hour: hour,
                date: date,
                timestamp: Date.now()
            };
        });

        localStorage.setItem(this.bookingsKey, JSON.stringify(bookings));
        this.notifyListeners();
    }

    deleteBooking(date, bookingId) {
        const bookings = this.getBookings();
        if (bookings[date]) {
            delete bookings[date][bookingId];
            if (Object.keys(bookings[date]).length === 0) {
                delete bookings[date];
            }
            localStorage.setItem(this.bookingsKey, JSON.stringify(bookings));
            this.notifyListeners();
        }
    }

    getBookingsForDate(date) {
        const bookings = this.getBookings();
        return bookings[date] || {};
    }

    isHourAvailable(date, hour) {
        const bookings = this.getBookingsForDate(date);
        const dayBookings = Object.values(bookings).map(b => b.hour);
        return !dayBookings.includes(hour);
    }

    isHourInSchedule(dayOfWeek, hour) {
        const schedule = this.getSchedule();
        return schedule[dayOfWeek] && schedule[dayOfWeek][hour] === true;
    }

    notifyListeners() {
        window.dispatchEvent(new Event('dataChanged'));
    }
}

const dataManager = new DataManager();

// ============= متغيرات عامة =============
let currentTeacherName = '';
let selectedDate = null;
let selectedHours = [];
const ADMIN_PASSWORD = 'n0987';

// ============= وظائف واجهة المستخدم الأساسية =============
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    window.scrollTo(0, 0);
}

// ============= مسح الشاشة الرئيسية =============
function initHomeScreen() {
    const datePicker = document.getElementById('datePicker');
    const today = new Date();
    datePicker.min = today.toISOString().split('T')[0];
    datePicker.max = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    datePicker.addEventListener('change', (e) => {
        selectedDate = new Date(e.target.value);
        loadCalendar();
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        const teacherName = document.getElementById('teacherName').value.trim();
        if (!teacherName) {
            alert('אנא הכנס את שמך');
            return;
        }
        if (!selectedDate) {
            alert('אנא בחר תאריך');
            return;
        }
        currentTeacherName = teacherName;
        loadTimesScreen();
    });

    document.getElementById('adminBtn').addEventListener('click', () => {
        document.getElementById('adminLoginForm').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminError').textContent = '';
        showScreen('adminScreen');
    });
}

function loadCalendar() {
    const container = document.getElementById('calendarContainer');
    container.innerHTML = '';
    
    if (!selectedDate) return;

    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    const prevLastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0);
    
    const startDay = firstDay.getDay();
    
    // ימים מהחודש הקודם
    for (let i = startDay - 1; i >= 0; i--) {
        const day = prevLastDay.getDate() - i;
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day other-month';
        dayEl.textContent = day;
        container.appendChild(dayEl);
    }

    // ימים מהחודש הנוכחי
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        dayEl.textContent = day;
        
        // בדיקה אם היום תפוס לחלוטין
        const bookings = dataManager.getBookingsForDate(dateStr);
        const dayOfWeek = date.getDay();
        const schedule = dataManager.getSchedule();
        const availableHours = schedule[dayOfWeek] || {};
        const availableCount = Object.values(availableHours).filter(v => v === true).length;
        const bookedCount = Object.keys(bookings).length;
        
        if (bookedCount >= availableCount && availableCount > 0) {
            dayEl.classList.add('fully-booked');
        }

        dayEl.addEventListener('click', () => {
            document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
            dayEl.classList.add('selected');
            selectedDate = date;
            document.getElementById('datePicker').value = dateStr;
        });

        if (dateStr === selectedDate.toISOString().split('T')[0]) {
            dayEl.classList.add('selected');
        }

        container.appendChild(dayEl);
    }

    // ימים מהחודש הבא
    const nextDays = 42 - (startDay + lastDay.getDate());
    for (let day = 1; day <= nextDays; day++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day other-month';
        dayEl.textContent = day;
        container.appendChild(dayEl);
    }
}

// ============= مسح اختيار الساعات =============
function loadTimesScreen() {
    showScreen('timesScreen');
    
    const dateTitle = document.getElementById('dateTitle');
    const dateSubtitle = document.getElementById('dateSubtitle');
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    dateTitle.textContent = formatDateHebrew(selectedDate);
    dateSubtitle.textContent = `בחר שעות פנויות להזמנה`;
    
    const hoursContainer = document.getElementById('hoursContainer');
    hoursContainer.innerHTML = '';
    selectedHours = [];
    updateSelectedCount();

    const bookings = dataManager.getBookingsForDate(dateStr);
    const dayOfWeek = selectedDate.getDay();
    const schedule = dataManager.getSchedule();
    const daySchedule = schedule[dayOfWeek] || {};

    for (let hour = 8; hour < 18; hour++) {
        const hourStr = String(hour).padStart(2, '0') + ':00';
        const hourBox = document.createElement('div');
        hourBox.className = 'hour-box';
        
        // בדיקה אם השעה בחדוה
        const bookingForHour = Object.values(bookings).find(b => b.hour === hour);
        
        if (bookingForHour) {
            // שעה תפוסה
            hourBox.classList.add('booked');
            hourBox.innerHTML = `<div>${hourStr}</div><div class="booked-teacher">${bookingForHour.teacher}</div>`;
        } else if (!daySchedule[hour]) {
            // שעה לא זמינה להזמנה
            hourBox.classList.add('unavailable');
            hourBox.textContent = hourStr;
        } else {
            // שעה פנויה
            hourBox.classList.add('available');
            hourBox.textContent = hourStr;
            
            hourBox.addEventListener('click', () => {
                hourBox.classList.toggle('selected');
                if (selectedHours.includes(hour)) {
                    selectedHours = selectedHours.filter(h => h !== hour);
                } else {
                    selectedHours.push(hour);
                }
                updateSelectedCount();
            });
        }
        
        hoursContainer.appendChild(hourBox);
    }
}

function formatDateHebrew(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    return date.toLocaleDateString('he-IL', options);
}

function updateSelectedCount() {
    document.getElementById('selectedCount').textContent = selectedHours.length;
}

// ============= تأكيد الحجز =============
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('confirmBtn')?.addEventListener('click', () => {
        if (selectedHours.length === 0) {
            alert('אנא בחר לפחות שעה אחת');
            return;
        }

        const dateStr = selectedDate.toISOString().split('T')[0];
        dataManager.addBooking(dateStr, selectedHours, currentTeacherName);
        
        alert('✓ ההזמנה אושרה בהצלחה!');
        showScreen('homeScreen');
        document.getElementById('teacherName').value = '';
        document.getElementById('datePicker').value = '';
        document.getElementById('calendarContainer').innerHTML = '';
        selectedDate = null;
        selectedHours = [];
    });

    document.getElementById('backBtn')?.addEventListener('click', () => {
        showScreen('homeScreen');
    });
});

// ============= لوحة المسؤول =============
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('adminLoginBtn')?.addEventListener('click', () => {
        const password = document.getElementById('adminPassword').value;
        if (password === ADMIN_PASSWORD) {
            document.getElementById('adminLoginForm').style.display = 'none';
            document.getElementById('adminPanel').style.display = 'block';
            loadAdminPanel();
        } else {
            document.getElementById('adminError').textContent = '❌ סיסמה שגויה';
        }
    });

    document.getElementById('backAdminBtn')?.addEventListener('click', () => {
        showScreen('homeScreen');
    });

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        document.getElementById('adminLoginForm').style.display = 'block';
        document.getElementById('adminPanel').style.display = 'none';
        document.getElementById('adminPassword').value = '';
        document.getElementById('adminError').textContent = '';
    });

    // טאבים
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
            
            if (tabId === 'hoursTab') {
                loadHoursTab();
            }
        });
    });
});

function loadAdminPanel() {
    loadScheduleTab();
    loadBookingsTab();
}

// ============= تبويب الجدول الأسبوعي =============
function loadScheduleTab() {
    const weekSchedule = document.getElementById('weekSchedule');
    weekSchedule.innerHTML = '';

    const schedule = dataManager.getSchedule();
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const daySchedule = document.createElement('div');
        daySchedule.className = 'day-schedule';
        
        const dayTitle = document.createElement('h4');
        dayTitle.textContent = dayNames[dayOfWeek];
        daySchedule.appendChild(dayTitle);

        const hoursRow = document.createElement('div');
        hoursRow.className = 'hours-row';

        for (let hour = 8; hour < 18; hour++) {
            const hourToggle = document.createElement('button');
            hourToggle.className = 'hour-toggle';
            hourToggle.textContent = String(hour).padStart(2, '0');

            if (schedule[dayOfWeek] && schedule[dayOfWeek][hour]) {
                hourToggle.classList.add('active');
            }

            hourToggle.addEventListener('click', () => {
                hourToggle.classList.toggle('active');
            });

            hoursRow.appendChild(hourToggle);
        }

        daySchedule.appendChild(hoursRow);
        weekSchedule.appendChild(daySchedule);
    }

    document.getElementById('saveScheduleBtn').addEventListener('click', saveSchedule, { once: true });
}

function saveSchedule() {
    const newSchedule = {};
    const daySchedules = document.querySelectorAll('.day-schedule');

    daySchedules.forEach((dayEl, dayOfWeek) => {
        newSchedule[dayOfWeek] = {};
        const hourToggles = dayEl.querySelectorAll('.hour-toggle');
        hourToggles.forEach((toggle, hourIndex) => {
            const hour = 8 + hourIndex;
            newSchedule[dayOfWeek][hour] = toggle.classList.contains('active');
        });
    });

    dataManager.setSchedule(newSchedule);
    alert('✓ המערכת נשמרה בהצלחה!');
    loadScheduleTab();
}

// ============= تبويب إدارة الحجوزات =============
function loadBookingsTab() {
    const bookingsList = document.getElementById('bookingsList');
    bookingsList.innerHTML = '';

    const bookings = dataManager.getBookings();
    const allBookings = [];

    Object.keys(bookings).forEach(dateStr => {
        Object.keys(bookings[dateStr]).forEach(bookingId => {
            const booking = bookings[dateStr][bookingId];
            allBookings.push({
                id: bookingId,
                date: dateStr,
                ...booking
            });
        });
    });

    allBookings.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.hour - b.hour;
    });

    if (allBookings.length === 0) {
        bookingsList.innerHTML = '<p style="text-align: center; color: #999;">אין הזמנות</p>';
        return;
    }

    allBookings.forEach(booking => {
        const bookingItem = document.createElement('div');
        bookingItem.className = 'booking-item';

        const bookingInfo = document.createElement('div');
        bookingInfo.className = 'booking-info';
        bookingInfo.innerHTML = `
            <p><strong>👤 מורה:</strong> ${booking.teacher}</p>
            <p><strong>📅 תאריך:</strong> ${formatDateHebrew(new Date(booking.date))}</p>
            <p><strong>⏰ שעה:</strong> ${String(booking.hour).padStart(2, '0')}:00</p>
        `;

        const bookingActions = document.createElement('div');
        bookingActions.className = 'booking-actions';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete';
        deleteBtn.textContent = '🗑️ מחק';
        deleteBtn.addEventListener('click', () => {
            if (confirm('האם בטוח שברצונך למחוק הזמנה זו?')) {
                dataManager.deleteBooking(booking.date, booking.id);
                alert('ההזמנה נמחקה');
                loadBookingsTab();
            }
        });

        bookingActions.appendChild(deleteBtn);
        bookingItem.appendChild(bookingInfo);
        bookingItem.appendChild(bookingActions);
        bookingsList.appendChild(bookingItem);
    });
}

// ============= تبويب إدارة الساعات =============
function loadHoursTab() {
    const dateToEdit = document.getElementById('dateToEdit');
    const today = new Date();
    dateToEdit.min = today.toISOString().split('T')[0];
    dateToEdit.max = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    dateToEdit.addEventListener('change', loadDayHours);
}

function loadDayHours() {
    const dateToEdit = document.getElementById('dateToEdit').value;
    if (!dateToEdit) return;

    const dayHoursList = document.getElementById('dayHoursList');
    dayHoursList.innerHTML = '';

    const date = new Date(dateToEdit);
    const dayOfWeek = date.getDay();
    const bookings = dataManager.getBookingsForDate(dateToEdit);
    const schedule = dataManager.getSchedule();
    const daySchedule = schedule[dayOfWeek] || {};

    for (let hour = 8; hour < 18; hour++) {
        const hourItem = document.createElement('div');
        hourItem.className = 'day-hour-item';

        const bookingForHour = Object.values(bookings).find(b => b.hour === hour);
        const isInSchedule = daySchedule[hour] === true;

        let status = 'unavailable';
        let statusText = '❌ לא זמין';
        let statusClass = 'unavailable-status';

        if (bookingForHour) {
            status = 'booked';
            statusText = `🔴 תפוס - ${bookingForHour.teacher}`;
            statusClass = 'booked-status';
        } else if (isInSchedule) {
            status = 'available';
            statusText = '🟢 זמין';
            statusClass = 'available-status';
        }

        const statusEl = document.createElement('span');
        statusEl.className = `hour-status ${statusClass}`;
        statusEl.textContent = `${String(hour).padStart(2, '0')}:00 - ${statusText}`;

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn-toggle-status';
        
        if (status === 'booked') {
            toggleBtn.textContent = '🗑️ בטל הזמנה';
            toggleBtn.addEventListener('click', () => {
                const bookingId = Object.keys(bookings).find(id => bookings[id].hour === hour);
                if (confirm('בטל הזמנה זו?')) {
                    dataManager.deleteBooking(dateToEdit, bookingId);
                    loadDayHours();
                }
            });
        } else if (status === 'available') {
            toggleBtn.textContent = '🔒 הגדר כלא זמין';
            toggleBtn.addEventListener('click', () => {
                const newSchedule = dataManager.getSchedule();
                newSchedule[dayOfWeek][hour] = false;
                dataManager.setSchedule(newSchedule);
                loadDayHours();
            });
        } else {
            toggleBtn.textContent = '🔓 הגדר כזמין';
            toggleBtn.addEventListener('click', () => {
                const newSchedule = dataManager.getSchedule();
                newSchedule[dayOfWeek][hour] = true;
                dataManager.setSchedule(newSchedule);
                loadDayHours();
            });
        }

        hourItem.appendChild(statusEl);
        hourItem.appendChild(toggleBtn);
        dayHoursList.appendChild(hourItem);
    }
}

// ============= תחזוקה =============
document.addEventListener('DOMContentLoaded', () => {
    updateConnectionStatus();
    initHomeScreen();
    showScreen('homeScreen');

    window.addEventListener('dataChanged', () => {
        if (document.querySelector('.screen.active').id === 'timesScreen') {
            loadTimesScreen();
        } else if (document.querySelector('.screen.active').id === 'homeScreen') {
            loadCalendar();
        }
    });
});
