// ========================================
// Global State & Variables
// ========================================

let currentUser = null;
let tickets = [];
let selectedTicketId = null;
let filteredTickets = [];

// Test users database
const users = {
    'teacher1@school.com': { name: '👩‍🏫 מורה א', role: 'teacher' },
    'teacher2@school.com': { name: '👨‍🏫 מורה ב', role: 'teacher' },
    'admin@school.com': { name: '👨‍💼 יוסי - מנהל', role: 'admin' },
    'maintenance@school.com': { name: '🔧 אב בית', role: 'maintenance' }
};

// Initialize sample tickets
function initializeSampleTickets() {
    tickets = [
        {
            id: 1,
            title: 'דלת כיתה 4/3 לא נפתחת',
            description: 'הדלת לא נפתחת ממש. נראה שהנעל תקוע',
            location: 'כיתה 4/3',
            category: 'ריהוט',
            priority: 'high',
            status: 'open',
            createdBy: 'teacher1@school.com',
            teacherName: '👩‍🏫 מורה א',
            createdDate: '2024-11-24',
            assignedTo: null,
            notes: [],
            updates: []
        },
        {
            id: 2,
            title: 'מנורה בכיתה 2/1 לא דולקת',
            description: 'המנורה בפינת הכיתה לא עובדת',
            location: 'כיתה 2/1',
            category: 'חשמל',
            priority: 'medium',
            status: 'assigned',
            createdBy: 'teacher2@school.com',
            teacherName: '👨‍🏫 מורה ב',
            createdDate: '2024-11-23',
            assignedTo: 'maintenance',
            notes: [
                { user: '👨‍💼 יוסי - מנהל', text: 'בדוק את תקע החשמל', timestamp: '2024-11-24 10:30' }
            ],
            updates: []
        }
    ];
}

// ========================================
// Login Functions
// ========================================

function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Simple validation - in production this would call a real API
    if (!email || !password) {
        alert('אנא מלא את כל השדות');
        return;
    }

    if (users[email]) {
        currentUser = {
            email: email,
            ...users[email]
        };
        
        // Update UI
        initializeSampleTickets();
        showMainApp();
        updateDashboard();
        document.getElementById('loginForm').reset();
    } else {
        alert('דוא״ל או סיסמה לא נכונים');
    }
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    const button = document.querySelector('.password-toggle');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        button.textContent = '🙈';
    } else {
        passwordInput.type = 'password';
        button.textContent = '👁️';
    }
}

function handleLogout() {
    if (confirm('האם אתה בטוח שתרצה להתנתק?')) {
        currentUser = null;
        selectedTicketId = null;
        showLoginScreen();
        clearSelection();
    }
}

// ========================================
// Screen Management
// ========================================

function showLoginScreen() {
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('mainApp').classList.remove('active');
}

function showMainApp() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('mainApp').classList.add('active');
    updateDashboard();
}

// ========================================
// Dashboard Management
// ========================================

function updateDashboard() {
    // Update header
    document.getElementById('headerUser').textContent = `${currentUser.name} (${getRoleLabel(currentUser.role)})`;

    // Hide all dashboards first
    document.getElementById('teacherDashboard').classList.remove('active');
    document.getElementById('adminDashboard').classList.remove('active');
    document.getElementById('maintenanceDashboard').classList.remove('active');

    // Show appropriate dashboard
    switch (currentUser.role) {
        case 'teacher':
            document.getElementById('teacherDashboard').classList.add('active');
            renderTeacherDashboard();
            break;
        case 'admin':
            document.getElementById('adminDashboard').classList.add('active');
            renderAdminDashboard();
            break;
        case 'maintenance':
            document.getElementById('maintenanceDashboard').classList.add('active');
            renderMaintenanceDashboard();
            break;
    }
}

function getRoleLabel(role) {
    const labels = {
        'teacher': 'מורה',
        'admin': 'מנהל',
        'maintenance': 'אב בית'
    };
    return labels[role] || role;
}

// ========================================
// Teacher Dashboard
// ========================================

function toggleAddTicketForm() {
    const form = document.getElementById('addTicketForm');
    form.classList.toggle('hidden');
}

function addTicket(event) {
    event.preventDefault();

    const title = document.getElementById('ticketTitle').value;
    const description = document.getElementById('ticketDescription').value;
    const location = document.getElementById('ticketLocation').value;
    const category = document.getElementById('ticketCategory').value;

    if (!title || !description || !location) {
        alert('אנא מלא את כל השדות הנדרשים');
        return;
    }

    const newTicket = {
        id: Math.max(...tickets.map(t => t.id), 0) + 1,
        title,
        description,
        location,
        category,
        priority: 'medium',
        status: 'open',
        createdBy: currentUser.email,
        teacherName: currentUser.name,
        createdDate: new Date().toISOString().split('T')[0],
        assignedTo: null,
        notes: [],
        updates: []
    };

    tickets.push(newTicket);
    
    // Clear form and hide it
    document.getElementById('addTicketForm').reset();
    toggleAddTicketForm();
    
    // Update display
    renderTeacherDashboard();
    
    alert('✅ התקלה נוספה בהצלחה!');
}

function renderTeacherDashboard() {
    const teacherTickets = tickets.filter(t => t.createdBy === currentUser.email);
    
    // Update count
    document.getElementById('teacherTicketCount').textContent = teacherTickets.length;

    // Render tickets list
    const ticketsList = document.getElementById('teacherTicketsList');
    
    if (teacherTickets.length === 0) {
        ticketsList.innerHTML = '<p class="empty-state">לא דיווחת על תקלות עדיין</p>';
        return;
    }

    ticketsList.innerHTML = teacherTickets.map(ticket => `
        <div class="ticket-item">
            <div class="ticket-header">
                <div>
                    <div class="ticket-title">${ticket.title}</div>
                    <div class="ticket-id">#${ticket.id}</div>
                </div>
                <span class="status-badge status-${ticket.status}">
                    ${getStatusLabel(ticket.status)}
                </span>
            </div>
            <p style="margin: 10px 0; color: var(--text-light); font-size: 13px;">
                ${ticket.description}
            </p>
            <div class="ticket-info">
                <div class="ticket-info-item">📍 ${ticket.location}</div>
                <div class="ticket-info-item">🏷️ ${ticket.category}</div>
                <div class="ticket-info-item">📅 ${ticket.createdDate}</div>
            </div>
        </div>
    `).join('');
}

// ========================================
// Admin Dashboard
// ========================================

function renderAdminDashboard() {
    applyFilters();
}

function applyFilters() {
    const statusFilter = document.getElementById('filterStatus').value;
    const priorityFilter = document.getElementById('filterPriority').value;
    const categoryFilter = document.getElementById('filterCategory').value;

    filteredTickets = tickets.filter(ticket => {
        let matches = true;
        
        if (statusFilter !== 'all' && ticket.status !== statusFilter) matches = false;
        if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) matches = false;
        if (categoryFilter !== 'all' && ticket.category !== categoryFilter) matches = false;
        
        return matches;
    });

    // Update stats
    document.getElementById('statsCount').textContent = filteredTickets.length;

    // Render tickets list
    renderAdminTicketsList();
    
    // Clear details if selected ticket is not in filtered list
    if (selectedTicketId && !filteredTickets.find(t => t.id === selectedTicketId)) {
        clearSelection();
    }
}

function renderAdminTicketsList() {
    const ticketsList = document.getElementById('adminTicketsList');
    
    if (filteredTickets.length === 0) {
        ticketsList.innerHTML = '<p class="empty-state">לא קיימות תקלות בפילטר זה</p>';
        document.getElementById('ticketDetailsPanel').classList.add('hidden');
        return;
    }

    ticketsList.innerHTML = filteredTickets.map(ticket => `
        <div class="ticket-item ${selectedTicketId === ticket.id ? 'selected' : ''}" 
             onclick="selectTicket(${ticket.id})">
            <div class="ticket-header">
                <div>
                    <div class="ticket-title">#${ticket.id} ${ticket.title}</div>
                    <div class="ticket-teacher">${ticket.teacherName}</div>
                </div>
                <span class="status-badge status-${ticket.status}">
                    ${getStatusLabel(ticket.status)}
                </span>
            </div>
            <div class="ticket-info">
                <div class="ticket-info-item">📍 ${ticket.location}</div>
                <div class="ticket-info-item">🏷️ ${ticket.category}</div>
            </div>
        </div>
    `).join('');
}

function selectTicket(ticketId) {
    selectedTicketId = ticketId;
    renderAdminTicketsList();
    renderTicketDetails();
}

function renderTicketDetails() {
    const ticket = tickets.find(t => t.id === selectedTicketId);
    if (!ticket) return;

    const detailsPanel = document.getElementById('ticketDetailsPanel');
    const detailsDiv = document.getElementById('ticketDetails');

    const statusOptions = ['open', 'assigned', 'in_progress', 'completed'];
    const priorityOptions = ['high', 'medium', 'low'];

    detailsDiv.innerHTML = `
        <div class="detail-section">
            <div class="detail-label">כותרה</div>
            <div class="detail-value">${ticket.title}</div>
        </div>

        <div class="detail-section">
            <div class="detail-label">תיאור</div>
            <div class="detail-value">${ticket.description}</div>
        </div>

        <div class="detail-section">
            <div class="detail-label">מורה</div>
            <div class="detail-value">${ticket.teacherName}</div>
        </div>

        <div class="detail-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
                <div class="detail-label">מיקום</div>
                <div class="detail-value">${ticket.location}</div>
            </div>
            <div>
                <div class="detail-label">קטגוריה</div>
                <div class="detail-value">${ticket.category}</div>
            </div>
        </div>

        <div class="detail-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
                <div class="detail-label">עדיפות</div>
                <select class="priority-select" onchange="updatePriority(${ticket.id}, this.value)">
                    ${priorityOptions.map(p => `<option value="${p}" ${ticket.priority === p ? 'selected' : ''}>${getPriorityLabel(p)}</option>`).join('')}
                </select>
            </div>
            <div>
                <div class="detail-label">סטטוס</div>
                <select class="status-select" onchange="updateStatus(${ticket.id}, this.value)">
                    ${statusOptions.map(s => `<option value="${s}" ${ticket.status === s ? 'selected' : ''}>${getStatusLabel(s)}</option>`).join('')}
                </select>
            </div>
        </div>

        <div class="detail-section">
            <div class="detail-label">פעולות</div>
            <div class="action-buttons">
                ${ticket.status === 'open' ? `<button class="btn btn-info" onclick="assignTicket(${ticket.id})">📍 הקצה לאב בית</button>` : ''}
                ${ticket.status !== 'completed' ? `<button class="btn btn-success" onclick="completeTicket(${ticket.id})">✅ סגור תקלה</button>` : '<p style="color: var(--text-light); font-size: 13px;">תקלה סגורה</p>'}
            </div>
        </div>

        <div class="notes-section">
            <div class="detail-label">הערות</div>
            <div class="notes-list">
                ${ticket.notes.length === 0 ? '<p style="color: var(--text-light); font-size: 13px;">אין הערות עדיין</p>' : ticket.notes.map(note => `
                    <div class="note-item">
                        <div class="note-user">${note.user}</div>
                        <div class="note-text">${note.text}</div>
                    </div>
                `).join('')}
            </div>
            <div class="notes-input-group">
                <input type="text" placeholder="הוסף הערה..." id="noteInput">
                <button class="btn btn-primary btn-small" onclick="addNote(${ticket.id})">הוסף</button>
            </div>
        </div>
    `;

    detailsPanel.classList.remove('hidden');
}

function assignTicket(ticketId) {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
        ticket.status = 'assigned';
        ticket.assignedTo = 'maintenance';
        renderTicketDetails();
        renderAdminTicketsList();
        alert('✅ התקלה הוקצתה לאב הבית');
    }
}

function completeTicket(ticketId) {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
        ticket.status = 'completed';
        renderTicketDetails();
        renderAdminTicketsList();
        alert('✅ התקלה סגורה');
    }
}

function addNote(ticketId) {
    const input = document.getElementById('noteInput');
    const noteText = input.value.trim();

    if (!noteText) {
        alert('אנא הזן הערה');
        return;
    }

    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
        ticket.notes.push({
            user: currentUser.name,
            text: noteText,
            timestamp: new Date().toLocaleString('he-IL')
        });
        input.value = '';
        renderTicketDetails();
    }
}

function updatePriority(ticketId, priority) {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
        ticket.priority = priority;
    }
}

function updateStatus(ticketId, status) {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
        ticket.status = status;
    }
}

function clearSelection() {
    selectedTicketId = null;
    document.getElementById('ticketDetailsPanel').classList.add('hidden');
}

// ========================================
// Maintenance Dashboard
// ========================================

function renderMaintenanceDashboard() {
    const maintenanceTasks = tickets.filter(t => t.assignedTo === 'maintenance');
    
    // Update count
    document.getElementById('maintenanceTaskCount').textContent = `משימות להשלמה: ${maintenanceTasks.length}`;

    // Render tasks list
    const tasksList = document.getElementById('maintenanceTasksList');
    
    if (maintenanceTasks.length === 0) {
        tasksList.innerHTML = '<p class="empty-state">אין משימות בהקצאה</p>';
        document.getElementById('taskDetailsPanel').classList.add('hidden');
        return;
    }

    tasksList.innerHTML = maintenanceTasks.map(ticket => `
        <div class="ticket-item ${selectedTicketId === ticket.id ? 'selected' : ''}"
             onclick="selectMaintenanceTask(${ticket.id})">
            <div class="ticket-header">
                <div>
                    <div class="ticket-title">#${ticket.id} ${ticket.title}</div>
                    <div class="ticket-teacher">מורה: ${ticket.teacherName}</div>
                </div>
                <span class="status-badge status-${ticket.status}">
                    ${getMaintenanceStatusLabel(ticket.status)}
                </span>
            </div>
            <div class="ticket-info">
                <div class="ticket-info-item">📍 ${ticket.location}</div>
                <div class="ticket-info-item">🏷️ ${ticket.category}</div>
            </div>
        </div>
    `).join('');
}

function selectMaintenanceTask(ticketId) {
    selectedTicketId = ticketId;
    renderMaintenanceDashboard();
    renderMaintenanceTaskDetails();
}

function renderMaintenanceTaskDetails() {
    const ticket = tickets.find(t => t.id === selectedTicketId);
    if (!ticket) return;

    const detailsPanel = document.getElementById('taskDetailsPanel');
    const detailsDiv = document.getElementById('taskDetails');

    const maintenanceStatuses = [
        { value: 'in_progress', label: 'בטיפול' },
        { value: 'pending_parts', label: 'ממתין לחלק' },
        { value: 'pending_review', label: 'דורש בדיקה נוספת' },
        { value: 'completed', label: 'הושלם' }
    ];

    detailsDiv.innerHTML = `
        <div class="detail-section">
            <div class="detail-label">כותרה</div>
            <div class="detail-value">${ticket.title}</div>
        </div>

        <div class="detail-section">
            <div class="detail-label">תיאור</div>
            <div class="detail-value">${ticket.description}</div>
        </div>

        <div class="detail-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
                <div class="detail-label">מיקום</div>
                <div class="detail-value">${ticket.location}</div>
            </div>
            <div>
                <div class="detail-label">קטגוריה</div>
                <div class="detail-value">${ticket.category}</div>
            </div>
        </div>

        <div class="detail-section">
            <div class="detail-label">עדכון סטטוס</div>
            <select class="status-select" onchange="updateMaintenanceStatus(${ticket.id}, this.value)">
                ${maintenanceStatuses.map(s => `<option value="${s.value}" ${ticket.status === s.value ? 'selected' : ''}>${s.label}</option>`).join('')}
            </select>
        </div>

        <div class="notes-section">
            <div class="detail-label">הערות וטיפול</div>
            <div class="notes-list">
                ${ticket.notes.length === 0 ? '<p style="color: var(--text-light); font-size: 13px;">אין הערות עדיין</p>' : ticket.notes.map(note => `
                    <div class="note-item">
                        <div class="note-user">${note.user}</div>
                        <div class="note-text">${note.text}</div>
                    </div>
                `).join('')}
            </div>
            <div class="notes-input-group">
                <input type="text" placeholder="הוסף הערה..." id="maintenanceNoteInput">
                <button class="btn btn-primary btn-small" onclick="addMaintenanceNote(${ticket.id})">הוסף</button>
            </div>
        </div>
    `;

    detailsPanel.classList.remove('hidden');
}

function updateMaintenanceStatus(ticketId, status) {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
        ticket.status = status;
        renderMaintenanceDashboard();
        renderMaintenanceTaskDetails();
    }
}

function addMaintenanceNote(ticketId) {
    const input = document.getElementById('maintenanceNoteInput');
    const noteText = input.value.trim();

    if (!noteText) {
        alert('אנא הזן הערה');
        return;
    }

    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
        ticket.notes.push({
            user: currentUser.name,
            text: noteText,
            timestamp: new Date().toLocaleString('he-IL')
        });
        input.value = '';
        renderMaintenanceTaskDetails();
    }
}

// ========================================
// Utility Functions
// ========================================

function getStatusLabel(status) {
    const labels = {
        'open': '🔴 פתוחה',
        'assigned': '🔵 הוקצתה',
        'in_progress': '🟡 בטיפול',
        'completed': '🟢 הושלמה'
    };
    return labels[status] || status;
}

function getMaintenanceStatusLabel(status) {
    const labels = {
        'in_progress': '🟡 בטיפול',
        'pending_parts': '🟣 ממתין לחלק',
        'pending_review': '🟠 דורש בדיקה',
        'completed': '🟢 הושלם'
    };
    return labels[status] || status;
}

function getPriorityLabel(priority) {
    const labels = {
        'high': '🔴 גבוה',
        'medium': '🟡 בינוני',
        'low': '🟢 נמוך'
    };
    return labels[priority] || priority;
}

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the app
    showLoginScreen();
    initializeSampleTickets();
    
    // Set focus on email input
    document.getElementById('email').focus();
});
