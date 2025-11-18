// Global State
let currentTeacher = "";
let selectedDate = null;
let selectedHours = [];
let currentViewYear = 2025;
let currentViewMonth = 10; // נובמבר - החודש הנוכחי

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
function updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;
    
    const dot = document.querySelector('.status-dot');
    
    if (useLocalStorage) {
        if (dot) dot.style.backgroundColor = '#ff9800';
        statusElement.innerHTML = '<span class="status-dot"></span>מוד לוקאלי';
        return;
    }
    
    if (!db) {
        if (dot) dot.style.backgroundColor = '#ff9800';
        statusElement.innerHTML = '<span class="status-dot"></span>בחיבור...';
        return;
    }
    
    try {
        const connectedRef = db.ref('.info/connected');
        connectedRef.on('value', function(snap) {
            const dot = document.querySelector('.status-dot');
            if (snap.val() === true) {
                if (dot) dot.style.backgroundColor = '#4CAF50';
                if (statusElement) statusElement.innerHTML = '<span class="status-dot"></span>מחובר לענן';
            } else {
                if (dot) dot.style.backgroundColor = '#ff9800';
                if (statusElement) statusElement.innerHTML = '<span class="status-dot"></span>מנתק מהענן';
            }
        });
    } catch (error) {
        console.log("Connection status error:", error);
        if (dot) dot.style.backgroundColor = '#ff9800';
        statusElement.innerHTML = '<span class="status-dot"></span>מוד לוקאלי';
    }
}

// Page Load
document.addEventListener('DOMContentLoaded', function() {
    console.log("Page loaded");
    initFirebase();
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
    currentViewYear = 2025;
    currentViewMonth = 10; // נובמבר - החודש הנוכחי
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
}

// MONTH SELECTION SCREEN - ניווט בין חודשים
function previousMonth() {
    // החץ השמאלי - הקודם (אחורה)
    currentViewMonth--;
    if (currentViewMonth < 0) {
        currentViewMonth = 11;
        currentViewYear--;
    }
    if (currentViewYear < 2025 || (currentViewYear === 2025 && currentViewMonth < 10)) {
        currentViewMonth = 10;
        currentViewYear = 2025;
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
            let bookingTeachers = [];
            
            TIMES.forEach(timeStr => {
                const hour = parseInt(timeStr.split(':')[0]);
                const isBlocked = dayBlocked[timeStr];
                const hourStatus = dayBookings[hour]?.status || 'available';
                
                // שעה זמינה אם: לא חסומה AND לא תפוסה
                if (!isBlocked && hourStatus === 'available') {
                    hasAvailableHour = true;
                }
                
                if (hourStatus === 'booked' && dayBookings[hour]?.teacher) {
                    if (!bookingTeachers.includes(dayBookings[hour].teacher)) {
                        bookingTeachers.push(dayBookings[hour].teacher);
                    }
                }
            });
            
            if (hasAvailableHour) {
                day.classList.add('available');
                day.textContent = currentDate.getDate();
                day.onclick = () => selectDate(dateStr, currentDate);
            } else {
                day.classList.add('available');
                day.textContent = currentDate.getDate();
                day.onclick = () => selectDate(dateStr, currentDate);
            }
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
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });
    event.target.closest('.calendar-day').classList.add('selected');
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
    const dayBookings = bookings[selectedDate] || {};
    const dateObj = new Date(selectedDate);
    const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
    
    TIMES.forEach(timeStr => {
        const hourBox = document.createElement('div');
        hourBox.className = 'hour-box';
        
        // Extract hour as integer
        const hour = parseInt(timeStr.split(':')[0]);
        const hourData = dayBookings[hour] || { status: 'available' };
        
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
        }
    } else {
        selectedHours = selectedHours.filter(h => h !== hour);
    }
    
    selectedHours.sort((a, b) => a - b);
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
            
            // Check for blocked hours
            const hasBlockedHour = selectedHours.some(hour => dayBlocked[`${hour}:00`]);
            if (hasBlockedHour) {
                alert('לא ניתן להזמין שעות חסומות');
                return;
            }
            
            proceedWithBooking();
        });
    } else {
        const blockedHours = JSON.parse(localStorage.getItem('blockedHours') || '{}');
        const dayBlocked = blockedHours[dayOfWeek] || {};
        
        const hasBlockedHour = selectedHours.some(hour => dayBlocked[`${hour}:00`]);
        if (hasBlockedHour) {
            alert('לא ניתן להזמין שעות חסומות');
            return;
        }
        
        proceedWithBooking();
    }
}

function proceedWithBooking() {
    const updates = {};
    selectedHours.forEach(hour => {
        updates[`${selectedDate}/${hour}`] = {
            status: 'booked',
            teacher: currentTeacher
        };
    });
    
    if (useLocalStorage) {
        if (!localBookings[selectedDate]) {
            localBookings[selectedDate] = {};
        }
        Object.keys(updates).forEach(key => {
            const [date, hour] = key.split('/');
            localBookings[date][hour] = updates[key];
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
    const hoursStr = selectedHours.map(h => `${h}:00`).join(', ');
    
    document.getElementById('confirmTeacher').textContent = currentTeacher;
    document.getElementById('confirmDate').textContent = formatHebrewDate(dateObj);
    document.getElementById('confirmHours').textContent = hoursStr;
    
    showScreen('confirmScreen');
    selectedDate = null;
    selectedHours = [];
}

function backToMonth() {
    showScreen('monthScreen');
    selectedDate = null;
    selectedHours = [];
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
    
    let futureBookings = [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    Object.keys(bookings).forEach(dateStr => {
        const bookingDate = new Date(dateStr);
        if (bookingDate >= today) {
            const dayBookings = bookings[dateStr];
            const bookedHours = [];
            let teacher = '';
            
            Object.keys(dayBookings).forEach(hour => {
                if (dayBookings[hour] && dayBookings[hour].status === 'booked') {
                    bookedHours.push(parseInt(hour));
                    teacher = dayBookings[hour].teacher;
                }
            });
            
            if (bookedHours.length > 0) {
                futureBookings.push({
                    dateStr: dateStr,
                    bookedHours: bookedHours,
                    teacher: teacher
                });
            }
        }
    });
    
    futureBookings.sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));
    
    if (futureBookings.length === 0) {
        bookingsList.innerHTML = '<p style="text-align: center; color: #999;">אין הזמנות עתידיות</p>';
        return;
    }
    
    futureBookings.forEach(booking => {
        const item = document.createElement('div');
        item.className = 'booking-item';
        
        const hoursStr = booking.bookedHours.map(h => `${h}:00`).join(', ');
        
        item.innerHTML = `
            <div class="booking-item-header">
                <strong>${formatHebrewDate(new Date(booking.dateStr))}</strong>
                <button class="btn-delete" onclick="deleteBooking('${booking.dateStr}')">מחק</button>
            </div>
            <div class="booking-teacher"><strong>המורה:</strong> ${booking.teacher}</div>
            <div class="booking-hours"><strong>השעות:</strong> ${hoursStr}</div>
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
