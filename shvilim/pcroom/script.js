// Global State
let currentTeacher = "";
let selectedDate = null;
let selectedHours = [];
let selectedTimeStrings = []; // שמירת השעות המלאות (09:50, 09:00 וכו')
let currentViewYear = new Date().getFullYear();
let currentViewMonth = new Date().getMonth();

// Admin Password
const ADMIN_PASSWORD = "n0987";

// Firebase initialization
let db = null;
let firebaseReady = false;
let localBookings = {};
let useLocalStorage = false;

// Initialize Firebase
function initFirebase() {
    if (typeof firebase === 'undefined') {
        console.log("Firebase not available, using local storage");
        useLocalStorage = true;
        firebaseReady = true;
        return;
    }
    
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDSM34F-l_Zt-MQmAbGWi-AHg-rInIJzhs",
  authDomain: "computer-room-booking.firebaseapp.com",
  databaseURL: "https://computer-room-booking-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "computer-room-booking",
  storageBucket: "computer-room-booking.firebasestorage.app",
  messagingSenderId: "1033131890195",
  appId: "1:1033131890195:web:96e8556e6d2f6e4ec491e6",
  measurementId: "G-QNBJ4GJE8Q"
};

    try {
        if (!firebase.apps || firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.database();
        firebaseReady = true;
        useLocalStorage = false;
        console.log("Firebase connected successfully!");
        updateConnectionStatus();
    } catch (error) {
        console.log("Firebase unavailable, using local storage:", error);
        useLocalStorage = true;
        firebaseReady = true;
        updateConnectionStatus();
    }
}

// Update Connection Status
// Update Connection Status
function updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;
    
    console.log('📊 Connection status check:', {useLocalStorage, db: db ? 'exists' : 'null'});
    
    if (useLocalStorage || !db) {
        console.log('❌ Firebase not available - disconnected');
        statusElement.innerHTML = '<span class="status-dot" style="background-color: #f44336;"></span>מנותק';
        return;
    }
    
    try {
        console.log('🔍 Checking Firebase connection...');
        const connectedRef = db.ref('.info/connected');
        connectedRef.on('value', function(snap) {
            if (snap.val() === true) {
                console.log('✅ Firebase connected!');
                statusElement.innerHTML = '<span class="status-dot" style="background-color: #4CAF50;"></span>מחובר לענן';
            } else {
                console.log('⚠️ Firebase disconnected');
                statusElement.innerHTML = '<span class="status-dot" style="background-color: #f44336;"></span>מנותק';
            }
        });
    } catch (error) {
        console.log("❌ Connection status error:", error);
        statusElement.innerHTML = '<span class="status-dot" style="background-color: #f44336;"></span>מנותק';
    }
}

// Page Load
document.addEventListener('DOMContentLoaded', function() {
    console.log("Page loaded");
    initFirebase();
    // Update status after a short delay to ensure Firebase is initialized
    setTimeout(() => {
        updateConnectionStatus();
    }, 500);
});

// Screen Navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const screen = document.getElementById(screenId);
    if (screen) {
        screen.classList.add('active');
    }
    window.scrollTo(0, 0);
}

// LOGIN SCREEN
function goToMonthSelection() {
    const teacherName = document.getElementById('teacherName').value.trim();
    if (teacherName === '') {
        alert('אנא הקלידו את שמכם');
        return;
    }
    currentTeacher = teacherName;
    const now = new Date();
    currentViewYear = now.getFullYear();
    currentViewMonth = now.getMonth();
    showScreen('monthScreen');
    loadMonthView();
}

function goToAdminLogin() {
    showScreen('adminLoginScreen');
}

function backToLogin() {
    document.getElementById('teacherName').value = '';
    document.getElementById('adminPassword').value = '';
    showScreen('loginScreen');
    selectedDate = null;
    selectedHours = [];
    selectedTimeStrings = [];
}

// MONTH SELECTION SCREEN - ניווט בין חודשים
function previousMonth() {
    // החץ השמאלי - הקודם (אחורה)
    currentViewMonth--;
    if (currentViewMonth < 0) {
        currentViewMonth = 11;
        currentViewYear--;
    }
    const minDate = new Date();
    const minYear = minDate.getFullYear();
    const minMonth = minDate.getMonth();
    if (currentViewYear < minYear || (currentViewYear === minYear && currentViewMonth < minMonth)) {
        currentViewMonth = minMonth;
        currentViewYear = minYear;
    }
    loadMonthView();
}

function nextMonth() {
    // החץ הימני - הבא (קדימה)
    currentViewMonth++;
    if (currentViewMonth > 11) {
        currentViewMonth = 0;
        currentViewYear++;
    }
    if (currentViewYear > 2026 || (currentViewYear === 2026 && currentViewMonth > 5)) {
        currentViewMonth = 5;
        currentViewYear = 2026;
    }
    loadMonthView();
}

function loadMonthView() {
    if (!firebaseReady) return;
    
    const calendar = document.getElementById('monthCalendar');
    calendar.innerHTML = '';
    
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                   'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    const monthDisplay = document.getElementById('currentMonthDisplay');
    if (monthDisplay) {
        monthDisplay.textContent = `${months[currentViewMonth]} ${currentViewYear}`;
    }
    
    const firstDay = new Date(currentViewYear, currentViewMonth, 1);
    const startDate = new Date(firstDay);
    
    let daysBack = firstDay.getDay();
    if (daysBack === 0) daysBack = 0;
    
    startDate.setDate(startDate.getDate() - daysBack);
    
    const bookings = useLocalStorage ? localBookings : {};
    
    if (!useLocalStorage && db) {
        // Load both bookings and blocked hours
        Promise.all([
            db.ref('bookings').once('value'),
            db.ref('blockedHours').once('value')
        ]).then(([bookingsSnap, blockedSnap]) => {
            renderMonthCalendar(startDate, currentViewYear, currentViewMonth, 
                bookingsSnap.val() || {}, 
                blockedSnap.val() || {});
        }).catch(() => {
            renderMonthCalendar(startDate, currentViewYear, currentViewMonth, {}, {});
        });
    } else {
        const blockedHours = JSON.parse(localStorage.getItem('blockedHours') || '{}');
        renderMonthCalendar(startDate, currentViewYear, currentViewMonth, bookings, blockedHours);
    }
}

function renderMonthCalendar(startDate, year, month, bookings, blockedHours) {
    blockedHours = blockedHours || {};
    const calendar = document.getElementById('monthCalendar');
    calendar.innerHTML = '';
    
    // שורת כותרת עם שמות ימים - בסדר עברי (ראשון מימין)
    const daysOfWeek = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const headerRow = document.createElement('div');
    headerRow.className = 'calendar-header-row';
    
    daysOfWeek.forEach(dayName => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = dayName;
        headerRow.appendChild(dayHeader);
    });
    
    calendar.appendChild(headerRow);
    
    // רשת הימים
    const daysGrid = document.createElement('div');
    daysGrid.className = 'calendar-days-grid';
    
    for (let i = 0; i < 42; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        
        const day = document.createElement('div');
        day.className = 'calendar-day';
        
        const dateStr = formatDate(currentDate);
        const isCurrentMonth = currentDate.getFullYear() === year && currentDate.getMonth() === month;
        
        if (!isCurrentMonth) {
            day.classList.add('other-month');
            day.textContent = currentDate.getDate();
        } else {
            const dayBookings = bookings[dateStr] || {};
            const dayOfWeek = currentDate.getDay();
            const dayBlocked = blockedHours[dayOfWeek] || {};
            
            // בדיקה אם יש לפחות שעה אחת פנויה (לא תפוסה, לא חסומה)
            let hasAvailableHour = false;
            let isFull = true; // כל השעות תפוסות או חסומות?
            let bookingTeachers = [];
            
            TIMES.forEach(timeStr => {
                const hour = parseInt(timeStr.split(':')[0]);
                const isBlocked = dayBlocked[timeStr];
                // חפש בשעה המלאה (09:50) ובשעה הישנה (9) לתאימות לאחור
                const hourStatus = dayBookings[timeStr]?.status || dayBookings[hour]?.status || 'available';
                
                // שעה זמינה אם: לא חסומה AND לא תפוסה
                if (!isBlocked && hourStatus === 'available') {
                    hasAvailableHour = true;
                    isFull = false;
                }
                
                // אם כל שעה היא או חסומה או תפוסה
                if (!isBlocked && hourStatus !== 'booked') {
                    isFull = false;
                }
                
                // איסוף שמות המורים
                if (hourStatus === 'booked' && (dayBookings[timeStr]?.teacher || dayBookings[hour]?.teacher)) {
                    const teacher = dayBookings[timeStr]?.teacher || dayBookings[hour]?.teacher;
                    if (!bookingTeachers.includes(teacher)) {
                        bookingTeachers.push(teacher);
                    }
                }
            });
            
            // הצבעה לפי מצב היום
            if (isFull) {
                // כל השעות תפוסות - צבע אדום
                day.classList.add('full');
                day.innerHTML = `<div class="day-number">${currentDate.getDate()}</div>`;
                if (bookingTeachers.length > 0) {
                    day.innerHTML += `<div class="day-teachers">${bookingTeachers.join(', ')}</div>`;
                }
            } else if (hasAvailableHour) {
                // יש שעות פנויות - צבע ירוק
                day.classList.add('available');
                day.textContent = currentDate.getDate();
            } else {
                // יש כמה שעות פנויות - צבע צהוב/כתום
                day.classList.add('partial');
                day.innerHTML = `<div class="day-number">${currentDate.getDate()}</div>`;
                if (bookingTeachers.length > 0) {
                    day.innerHTML += `<div class="day-teachers">${bookingTeachers.join(', ')}</div>`;
                }
            }
            
            day.onclick = () => selectDate(dateStr, currentDate);
        }
        
        daysGrid.appendChild(day);
    }
    
    calendar.appendChild(daysGrid);
}

function isDateFullyBooked(dateStr, bookings) {
    if (!bookings[dateStr]) return false;
    
    const hours = bookings[dateStr];
    for (let hour = 8; hour <= 16; hour++) {
        const hourData = hours[hour] || {};
        if (hourData.status === 'available') {
            return false;
        }
    }
    return true;
}

function selectDate(dateStr, dateObj) {
    selectedDate = dateStr;
    showScreen('hoursScreen');
    loadHoursForDate();
}

// HOURS SELECTION SCREEN
function loadHoursForDate() {
    if (!firebaseReady) return;
    
    const header = document.getElementById('selectedDateHeader');
    const dateObj = new Date(selectedDate);
    header.textContent = formatHebrewDate(dateObj);
    
    const hoursGrid = document.getElementById('hoursGrid');
    hoursGrid.innerHTML = '';
    
    if (useLocalStorage) {
        const blockedHours = JSON.parse(localStorage.getItem('blockedHours') || '{}');
        renderHours(localBookings, blockedHours);
    } else if (db) {
        // Load bookings and blocked hours
        Promise.all([
            db.ref('bookings').once('value'),
            db.ref('blockedHours').once('value')
        ]).then(([bookingsSnap, blockedSnap]) => {
            renderHours(bookingsSnap.val() || {}, blockedSnap.val() || {});
        }).catch(() => {
            renderHours({}, {});
        });
    } else {
        renderHours({}, {});
    }
}

function renderHours(bookings, blockedHours) {
    blockedHours = blockedHours || {};
    const hoursGrid = document.getElementById('hoursGrid');
    hoursGrid.innerHTML = ''; 
    
    const dayBookings = bookings[selectedDate] || {};
    const dateObj = new Date(selectedDate);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
    
    TIMES.forEach(timeStr => {
        const hourBox = document.createElement('div');
        hourBox.className = 'hour-box';
        
        // Extract hour as integer
        const hour = parseInt(timeStr.split(':')[0]);
        // חפש בשעה המלאה (09:50) וגם בשעה הישנה (9) לתאימות לאחור
        const hourData = dayBookings[timeStr] || dayBookings[hour] || { status: 'available' };
        
        // Check if hour is blocked by admin
        const isBlocked = blockedHours[dayOfWeek] && blockedHours[dayOfWeek][timeStr];
        
        if (isBlocked) {
            // Admin blocked this hour - show in gray
            hourBox.classList.add('blocked');
            hourBox.textContent = timeStr;
        } else if (hourData.status === 'booked') {
            // Hour is booked - show in red with teacher name
            hourBox.classList.add('booked');
            hourBox.innerHTML = `<div>${timeStr}</div><div class="teacher-name">${hourData.teacher || 'תפוס'}</div>`;
        } else {
            // Hour is available - show in green
            hourBox.classList.add('available');
            hourBox.textContent = timeStr;
            hourBox.onclick = () => toggleHourSelection(hourBox, hour, timeStr);
        }
        
        hoursGrid.appendChild(hourBox);
    });
}

function toggleHourSelection(element, hour, timeStr) {
    if (element.classList.contains('blocked')) {
        return;
    }
    
    element.classList.toggle('selected');
    
    if (element.classList.contains('selected')) {
        if (!selectedHours.includes(hour)) {
            selectedHours.push(hour);
            selectedTimeStrings.push(timeStr);
        }
    } else {
        const idx = selectedHours.indexOf(hour);
        if (idx !== -1) {
            selectedHours.splice(idx, 1);
            selectedTimeStrings.splice(idx, 1);
        }
    }
    
    // Sort both arrays by hour value for consistency
    const combined = selectedHours.map((h, i) => ({hour: h, timeStr: selectedTimeStrings[i]}))
        .sort((a, b) => a.hour - b.hour);
    selectedHours = combined.map(item => item.hour);
    selectedTimeStrings = combined.map(item => item.timeStr);
}

function confirmBooking() {
    if (selectedHours.length === 0) {
        alert('אנא בחרו לפחות שעה אחת');
        return;
    }
    
    if (!firebaseReady) {
        alert('חיבור לשרת לא זמין');
        return;
    }
    
    // Check if any selected hours are blocked
    const dateObj = new Date(selectedDate);
    const dayOfWeek = dateObj.getDay();
    
    if (!useLocalStorage && db) {
        // Get blocked hours from Firebase
        db.ref('blockedHours').once('value').then(snapshot => {
            const blockedHours = snapshot.val() || {};
            const dayBlocked = blockedHours[dayOfWeek] || {};
            
            // Check for blocked hours - בדוק עם timeStr
            const hasBlockedHour = selectedTimeStrings.some(timeStr => dayBlocked[timeStr]);
            if (hasBlockedHour) {
                alert('לא ניתן להזמין שעות חסומות');
                return;
            }
            
            proceedWithBooking();
        });
    } else {
        const blockedHours = JSON.parse(localStorage.getItem('blockedHours') || '{}');
        const dayBlocked = blockedHours[dayOfWeek] || {};
        
        const hasBlockedHour = selectedTimeStrings.some(timeStr => dayBlocked[timeStr]);
        if (hasBlockedHour) {
            alert('לא ניתן להזמין שעות חסומות');
            return;
        }
        
        proceedWithBooking();
    }
}

function proceedWithBooking() {
    const updates = {};
    selectedTimeStrings.forEach((timeStr, idx) => {
        const hour = selectedHours[idx];
        // שמור עם timeStr מלא כמפתח (09:50 ולא 9)
        updates[`${selectedDate}/${timeStr}`] = {
            status: 'booked',
            teacher: currentTeacher,
            hour: hour,
            timeStr: timeStr
        };
    });
    
    if (useLocalStorage) {
        if (!localBookings[selectedDate]) {
            localBookings[selectedDate] = {};
        }
        Object.keys(updates).forEach(key => {
            const [date, timeStr] = key.split('/');
            localBookings[date][timeStr] = updates[key];
        });
        localStorage.setItem('bookings', JSON.stringify(localBookings));
        showConfirmation();
    } else if (db) {
        const dbUpdates = {};
        Object.keys(updates).forEach(key => {
            dbUpdates[`bookings/${key}`] = updates[key];
        });
        
        db.ref().update(dbUpdates).then(() => {
            console.log('✅ Booking saved successfully');
            showConfirmation();
        }).catch(error => {
            alert('שגיאה בשמירת ההזמנה: ' + error.message);
            console.error('Booking error:', error);
        });
    } else {
        alert('שגיאה: אין חיבור לשרת ולא אפשר לשמור');
    }
}

function showConfirmation() {
    const dateObj = new Date(selectedDate);
    const hoursStr = selectedTimeStrings.join(', ');
    
    document.getElementById('confirmTeacher').textContent = currentTeacher;
    document.getElementById('confirmDate').textContent = formatHebrewDate(dateObj);
    document.getElementById('confirmHours').textContent = hoursStr;
    
    showScreen('confirmScreen');
    selectedDate = null;
    selectedHours = [];
    selectedTimeStrings = [];
}

function backToMonth() {
    showScreen('monthScreen');
    selectedDate = null;
    selectedHours = [];
    selectedTimeStrings = [];
}

// ADMIN LOGIN
function checkAdminPassword() {
    const password = document.getElementById('adminPassword').value;
    
    if (password === ADMIN_PASSWORD) {
        showScreen('adminScreen');
    } else {
        alert('סיסמה שגויה');
        document.getElementById('adminPassword').value = '';
    }
}

function goToAdminMenu() {
    showScreen('adminScreen');
}

// ADMIN - MANAGE BOOKINGS - בלי בחירת חודש
function goToManageBookings() {
    showScreen('manageBookingsScreen');
    loadAdminBookings();
}

function loadAdminBookings() {
    if (!firebaseReady) return;
    
    const bookingsList = document.getElementById('bookingsList');
    bookingsList.innerHTML = '<p style="text-align: center; color: #999;">...טוען הזמנות</p>';
    
    if (useLocalStorage) {
        const bookings = localBookings || {};
        renderAdminBookings(bookings);
    } else if (db) {
        db.ref('bookings').once('value').then(snapshot => {
            const bookings = snapshot.val() || {};
            console.log('✅ Loaded bookings from Firebase:', bookings);
            renderAdminBookings(bookings);
        }).catch(error => {
            console.error('Error loading bookings:', error);
            bookingsList.innerHTML = '<p style="text-align: center; color: red;">שגיאה בטעינת הזמנות</p>';
        });
    } else {
        renderAdminBookings({});
    }
}

function renderAdminBookings(bookings) {
    const bookingsList = document.getElementById('bookingsList');
    bookingsList.innerHTML = '';
    
    let allBookings = [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // נסיור על כל התאריכים
    Object.keys(bookings).forEach(dateStr => {
        const bookingDate = new Date(dateStr);
        if (bookingDate >= today) {
            const dayBookings = bookings[dateStr];
            
            // נסיור על כל השעות באותו יום
            Object.keys(dayBookings).forEach(timeKey => {
                if (dayBookings[timeKey] && dayBookings[timeKey].status === 'booked') {
                    // timeKey יכול להיות "09:50" או "9"
                    const timeStr = dayBookings[timeKey].timeStr || timeKey;
                    const hour = dayBookings[timeKey].hour !== undefined ? dayBookings[timeKey].hour : parseInt(timeKey);
                    
                    allBookings.push({
                        dateStr: dateStr,
                        hour: hour,
                        teacher: dayBookings[timeKey].teacher,
                        timeStr: timeStr,
                        timeKey: timeKey
                    });
                }
            });
        }
    });
    
    // מיון לפי תאריך, ואחר כך לפי שעה
    allBookings.sort((a, b) => {
        const dateCompare = new Date(a.dateStr) - new Date(b.dateStr);
        if (dateCompare !== 0) return dateCompare;
        return a.hour - b.hour;
    });
    
    if (allBookings.length === 0) {
        bookingsList.innerHTML = '<p style="text-align: center; color: #999;">אין הזמנות עתידיות</p>';
        return;
    }
    
    // הצגה של כל הזמנה בנפרד
    allBookings.forEach(booking => {
        const item = document.createElement('div');
        item.className = 'booking-item';
        
        item.innerHTML = `
            <div class="booking-item-header">
                <strong>${formatHebrewDate(new Date(booking.dateStr))}</strong>
                <button class="btn-delete" onclick="deleteSingleBooking('${booking.dateStr}', '${booking.timeKey}')">מחק</button>
            </div>
            <div class="booking-teacher"><strong>המורה:</strong> ${booking.teacher}</div>
            <div class="booking-hours"><strong>השעה:</strong> ${booking.timeStr}</div>
        `;
        
        bookingsList.appendChild(item);
    });
}

function deleteBooking(dateStr) {
    if (!confirm('האם אתם בטוחים שברצונכם למחוק הזמנה זו?')) {
        return;
    }
    
    if (useLocalStorage) {
        if (localBookings[dateStr]) {
            Object.keys(localBookings[dateStr]).forEach(hour => {
                if (localBookings[dateStr][hour].status === 'booked') {
                    localBookings[dateStr][hour] = { status: 'available' };
                }
            });
            localStorage.setItem('bookings', JSON.stringify(localBookings));
            alert('ההזמנה הוסרה בהצלחה');
            loadAdminBookings();
        }
    } else if (db) {
        const updates = {};
        db.ref(`bookings/${dateStr}`).once('value').then(snapshot => {
            const dayBookings = snapshot.val() || {};
            Object.keys(dayBookings).forEach(hour => {
                if (dayBookings[hour] && dayBookings[hour].status === 'booked') {
                    updates[`bookings/${dateStr}/${hour}`] = { status: 'available' };
                }
            });
            
            if (Object.keys(updates).length > 0) {
                db.ref().update(updates).then(() => {
                    console.log('✅ Booking deleted successfully');
                    alert('ההזמנה הוסרה בהצלחה');
                    loadAdminBookings();
                }).catch(error => {
                    alert('שגיאה בהסרת ההזמנה: ' + error.message);
                    console.error('Delete error:', error);
                });
            }
        });
    }
}
// מחיקת הזמנה בודדת (שעה אחת ספציפית)
function deleteSingleBooking(dateStr, timeKey) {
    if (!confirm(`האם אתם בטוחים שברצונכם למחוק את ההזמנה?`)) {
        return;
    }
    
    if (useLocalStorage) {
        if (localBookings[dateStr] && localBookings[dateStr][timeKey]) {
            localBookings[dateStr][timeKey] = { status: 'available' };
            localStorage.setItem('bookings', JSON.stringify(localBookings));
            alert('ההזמנה הוסרה בהצלחה');
            loadAdminBookings();
        }
    } else if (db) {
        db.ref(`bookings/${dateStr}/${timeKey}`).set({ status: 'available' }).then(() => {
            console.log('✅ Single booking deleted successfully');
            alert('ההזמנה הוסרה בהצלחה');
            loadAdminBookings();
        }).catch(error => {
            alert('שגיאה בהסרת ההזמנה: ' + error.message);
            console.error('Delete error:', error);
        });
    }
}
// ADMIN - EDIT HOURS
const TIMES = ['08:00', '09:00', '09:50', '11:00', '12:00', '12:45', '13:45', '14:30'];
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];
let weeklyHoursState = {};

function goToEditHours() {
    showScreen('editHoursScreen');
    loadWeeklyHoursGrid();
}

function loadWeeklyHoursGrid() {
    weeklyHoursState = {};
    const grid = document.getElementById('weeklyHoursGrid');
    grid.innerHTML = '';
    
    // Initialize all as available
    DAYS.forEach(day => {
        weeklyHoursState[day] = {};
        TIMES.forEach(time => {
            weeklyHoursState[day][time] = 'available';
        });
    });
    
    // Load blocked hours from storage
    if (useLocalStorage) {
        const blockedHours = JSON.parse(localStorage.getItem('blockedHours') || '{}');
        renderWeeklyHoursGrid(blockedHours);
    } else if (db) {
        db.ref('blockedHours').once('value').then(snapshot => {
            const blockedHours = snapshot.val() || {};
            console.log('✅ Loaded blockedHours from Firebase:', blockedHours);
            renderWeeklyHoursGrid(blockedHours);
        }).catch(error => {
            console.error('Error loading blockedHours:', error);
            renderWeeklyHoursGrid({});
        });
    } else {
        renderWeeklyHoursGrid({});
    }
}

function renderWeeklyHoursGrid(blockedHours) {
    const grid = document.getElementById('weeklyHoursGrid');
    grid.innerHTML = '';
    
    // Update state with blocked hours
    DAYS.forEach((day, dayIndex) => {
        const dayBlocked = blockedHours[dayIndex] || {};
        TIMES.forEach(time => {
            if (dayBlocked[time]) {
                weeklyHoursState[day][time] = 'blocked';
            }
        });
    });
    
    DAYS.forEach((day, dayIndex) => {
        const daySection = document.createElement('div');
        daySection.className = 'day-section';
        
        const dayTitle = document.createElement('div');
        dayTitle.className = 'day-title';
        dayTitle.textContent = day;
        daySection.appendChild(dayTitle);
        
        const hoursGrid = document.createElement('div');
        hoursGrid.className = 'day-hours-grid';
        
        TIMES.forEach(time => {
            const slot = document.createElement('div');
            const status = weeklyHoursState[day][time];
            slot.className = `time-slot ${status}`;
            slot.textContent = time;
            slot.id = `slot-${dayIndex}-${time}`;
            slot.onclick = () => toggleTimeSlot(dayIndex, time, slot);
            hoursGrid.appendChild(slot);
        });
        
        daySection.appendChild(hoursGrid);
        grid.appendChild(daySection);
    });
}

function toggleTimeSlot(dayIndex, time, element) {
    const day = DAYS[dayIndex];
    const currentStatus = weeklyHoursState[day][time];
    let newStatus;
    
    if (currentStatus === 'available') {
        newStatus = 'blocked';
    } else if (currentStatus === 'blocked') {
        newStatus = 'available';
    } else {
        newStatus = 'available';
    }
    
    weeklyHoursState[day][time] = newStatus;
    element.className = `time-slot ${newStatus}`;
}

function saveEditedWeeklyHours() {
    if (!firebaseReady) {
        alert('שגיאה: אין חיבור לשרת');
        return;
    }
    
    // Build the blocked hours object with proper structure
    const blockedHoursData = {};
    DAYS.forEach((day, dayIndex) => {
        blockedHoursData[dayIndex] = {};
        TIMES.forEach(time => {
            const status = weeklyHoursState[day][time];
            if (status === 'blocked') {
                blockedHoursData[dayIndex][time] = true;
            }
        });
    });
    
    if (useLocalStorage) {
        localStorage.setItem('blockedHours', JSON.stringify(blockedHoursData));
        alert('לוח הזמנים נשמר בהצלחה');
        goToAdminMenu();
    } else if (db) {
        db.ref('blockedHours').set(blockedHoursData).then(() => {
            alert('לוח הזמנים נשמר בהצלחה');
            goToAdminMenu();
        }).catch(error => {
            alert('שגיאה בשמירה');
            console.error('Error:', error);
        });
    }
}

// UTILITY FUNCTIONS
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatHebrewDate(date) {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const months = [
        'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
        'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];
    
    const dayName = days[date.getDay()];
    const dayNum = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${dayName}, ${dayNum} ${monthName} ${year}`;
}
