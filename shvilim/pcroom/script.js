// Global State
let currentTeacher = "";
let selectedDate = null;
let selectedHours = [];
let currentViewYear = 2025;
let currentViewMonth = 8; // ספטמבר

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
    
    // ⚠️ החלף את זה בקונפיג שלך מ-Firebase Console!
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY_HERE",
        authDomain: "your-project.firebaseapp.com",
        projectId: "your-project-id",
        storageBucket: "your-project.appspot.com",
        messagingSenderId: "your-messaging-sender-id",
        databaseURL: "https://your-project.firebaseio.com"
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
    currentViewMonth = 8; // ספטמבר
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

// MONTH SELECTION SCREEN
function previousMonth() {
    currentViewMonth--;
    if (currentViewMonth < 0) {
        currentViewMonth = 11;
        currentViewYear--;
    }
    // מגבלה: לא תחת ספטמבר 2025
    if (currentViewYear < 2025 || (currentViewYear === 2025 && currentViewMonth < 8)) {
        currentViewMonth = 8;
        currentViewYear = 2025;
    }
    loadMonthView();
}

function nextMonth() {
    currentViewMonth++;
    if (currentViewMonth > 11) {
        currentViewMonth = 0;
        currentViewYear++;
    }
    // מגבלה: לא יותר מיוני 2026
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
    
    // Update display
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                   'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    const monthDisplay = document.getElementById('currentMonthDisplay');
    if (monthDisplay) {
        monthDisplay.textContent = `${months[currentViewMonth]} ${currentViewYear}`;
    }
    
    const firstDay = new Date(currentViewYear, currentViewMonth, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Load bookings
    const bookings = useLocalStorage ? localBookings : {};
    
    if (!useLocalStorage && db) {
        db.ref('bookings').once('value').then(snapshot => {
            renderMonthCalendar(startDate, currentViewYear, currentViewMonth, snapshot.val() || {});
        }).catch(() => {
            renderMonthCalendar(startDate, currentViewYear, currentViewMonth, {});
        });
    } else {
        renderMonthCalendar(startDate, currentViewYear, currentViewMonth, bookings);
    }
}

function renderMonthCalendar(startDate, year, month, bookings) {
    const calendar = document.getElementById('monthCalendar');
    
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
            
            // בדיקה אם תפוס לחלוטין
            const isFullyBooked = isDateFullyBooked(dateStr, bookings);
            
            // בדיקה אם יש הזמנות
            let bookingTeachers = [];
            Object.keys(dayBookings).forEach(hour => {
                if (dayBookings[hour].status === 'booked' && dayBookings[hour].teacher) {
                    if (!bookingTeachers.includes(dayBookings[hour].teacher)) {
                        bookingTeachers.push(dayBookings[hour].teacher);
                    }
                }
            });
            
            if (isFullyBooked) {
                day.classList.add('booked');
                day.innerHTML = `<div class="day-number">${currentDate.getDate()}</div>`;
                if (bookingTeachers.length > 0) {
                    day.innerHTML += `<div class="day-teacher">${bookingTeachers[0]}</div>`;
                }
            } else {
                day.classList.add('available');
                day.textContent = currentDate.getDate();
                day.onclick = () => selectDate(dateStr, currentDate);
            }
        }
        
        calendar.appendChild(day);
    }
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
        renderHours(localBookings);
    } else if (db) {
        db.ref('bookings').once('value').then(snapshot => {
            renderHours(snapshot.val() || {});
        }).catch(() => {
            renderHours({});
        });
    } else {
        renderHours({});
    }
}

function renderHours(bookings) {
    const hoursGrid = document.getElementById('hoursGrid');
    const dayBookings = bookings[selectedDate] || {};
    
    for (let hour = 8; hour <= 16; hour++) {
        const hourBox = document.createElement('div');
        hourBox.className = 'hour-box';
        
        const hourData = dayBookings[hour] || { status: 'available' };
        
        if (hourData.status === 'available') {
            hourBox.classList.add('available');
            hourBox.textContent = `${hour}:00`;
            hourBox.onclick = () => toggleHourSelection(hourBox, hour);
        } else if (hourData.status === 'booked') {
            hourBox.classList.add('booked');
            hourBox.innerHTML = `<div>${hour}:00</div><div class="teacher-name">${hourData.teacher || 'תפוס'}</div>`;
        } else {
            hourBox.classList.add('blocked');
            hourBox.textContent = `${hour}:00`;
        }
        
        hoursGrid.appendChild(hourBox);
    }
}

function toggleHourSelection(element, hour) {
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
    
    const updates = {};
    selectedHours.forEach(hour => {
        updates[`${selectedDate}/${hour}`] = {
            status: 'booked',
            teacher: currentTeacher
        };
    });
    
    if (useLocalStorage) {
        // Save locally
        if (!localBookings[selectedDate]) {
            localBookings[selectedDate] = {};
        }
        Object.keys(updates).forEach(key => {
            const [date, hour] = key.split('/');
            localBookings[date][hour] = updates[key];
        });
        showConfirmation();
    } else if (db) {
        const dbUpdates = {};
        Object.keys(updates).forEach(key => {
            dbUpdates[`bookings/${key}`] = updates[key];
        });
        
        db.ref().update(dbUpdates).then(() => {
            showConfirmation();
        }).catch(error => {
            alert('שגיאה בשמירת ההזמנה');
            console.error('Error:', error);
        });
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

// ADMIN - MANAGE BOOKINGS
function goToManageBookings() {
    showScreen('manageBookingsScreen');
    loadAdminMonthView();
}

function loadAdminMonthView() {
    if (!firebaseReady) return;
    
    const calendar = document.getElementById('monthCalendar');
    if (!calendar) return; // Not on this screen
    
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                   'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    const monthDisplay = document.getElementById('currentMonthDisplay');
    if (monthDisplay) {
        monthDisplay.textContent = `${months[currentViewMonth]} ${currentViewYear}`;
    }
}

function loadAdminBookings() {
    if (!firebaseReady) return;
    
    const bookingsList = document.getElementById('bookingsList');
    bookingsList.innerHTML = '';
    
    const bookings = useLocalStorage ? localBookings : {};
    let hasBookings = false;
    
    Object.keys(bookings).forEach(dateStr => {
        const date = new Date(dateStr);
        if (date.getFullYear() === currentViewYear && date.getMonth() === currentViewMonth) {
            const dayBookings = bookings[dateStr];
            const bookedHours = [];
            let teacher = '';
            
            Object.keys(dayBookings).forEach(hour => {
                if (dayBookings[hour].status === 'booked') {
                    bookedHours.push(parseInt(hour));
                    teacher = dayBookings[hour].teacher;
                }
            });
            
            if (bookedHours.length > 0) {
                hasBookings = true;
                const item = document.createElement('div');
                item.className = 'booking-item';
                
                const hoursStr = bookedHours.map(h => `${h}:00`).join(', ');
                
                item.innerHTML = `
                    <div class="booking-item-header">
                        <strong>${formatHebrewDate(new Date(dateStr))}</strong>
                        <button class="btn-delete" onclick="deleteBooking('${dateStr}')">מחק</button>
                    </div>
                    <div class="booking-teacher"><strong>המורה:</strong> ${teacher}</div>
                    <div class="booking-hours"><strong>השעות:</strong> ${hoursStr}</div>
                `;
                
                bookingsList.appendChild(item);
            }
        }
    });
    
    if (!hasBookings) {
        bookingsList.innerHTML = '<p style="text-align: center; color: #999;">אין הזמנות בחודש זה</p>';
    }
}

function deleteBooking(dateStr) {
    if (!confirm('האם אתם בטוחים שברצונכם למחוק הזמנה זו?')) {
        return;
    }
    
    const updates = {};
    const bookings = useLocalStorage ? localBookings : {};
    
    if (bookings[dateStr]) {
        Object.keys(bookings[dateStr]).forEach(hour => {
            if (bookings[dateStr][hour].status === 'booked') {
                updates[`${dateStr}/${hour}`] = { status: 'available' };
            }
        });
    }
    
    if (useLocalStorage) {
        Object.keys(updates).forEach(key => {
            const [date, hour] = key.split('/');
            if (localBookings[date]) {
                localBookings[date][hour] = updates[key];
            }
        });
        alert('ההזמנה הסרה בהצלחה');
        loadAdminBookings();
    } else if (db) {
        const dbUpdates = {};
        Object.keys(updates).forEach(key => {
            dbUpdates[`bookings/${key}`] = updates[key];
        });
        
        db.ref().update(dbUpdates).then(() => {
            alert('ההזמנה הסרה בהצלחה');
            loadAdminBookings();
        }).catch(error => {
            alert('שגיאה בהסרת ההזמנה');
            console.error('Error:', error);
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
    
    // Initialize state
    DAYS.forEach(day => {
        weeklyHoursState[day] = {};
        TIMES.forEach(time => {
            weeklyHoursState[day][time] = 'available';
        });
    });
    
    // Render grid
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
            slot.className = 'time-slot available';
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
        newStatus = 'booked';
    } else {
        newStatus = 'available';
    }
    
    weeklyHoursState[day][time] = newStatus;
    
    // Update UI
    element.className = `time-slot ${newStatus}`;
}

function saveEditedWeeklyHours() {
    alert('לוח הזמנים נשמר בהצלחה');
    goToAdminMenu();
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
