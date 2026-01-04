// ===============================================
// STATE MANAGEMENT
// ===============================================

let currentUserName = null;
let currentUserRole = null;
let currentOrders = [];
let currentUserOrders = [];
let tempOrderItems = [];
let userSessionId = null;
let db = null;
let firebaseConnected = false;
let orderJustSubmitted = false; // משתנה לזכור שהזמנה בדיוק נשלחה

// ===============================================
// INITIALIZATION
// ===============================================

document.addEventListener('DOMContentLoaded', () => {
    // המתן לـ Firebase
    setTimeout(initializeApp, 500);
});

function initializeApp() {
    try {
        db = firebase.database();
        firebaseConnected = true;
        console.log('✓ Realtime Database initialized successfully');
        updateConnectionStatus();
    } catch (error) {
        console.error('Firebase error:', error);
        firebaseConnected = false;
        updateConnectionStatus();
    }

    // טען את רשימת הציוד מ-localStorage
    loadItemsFromStorage();

    // בדוק אם יש משתמש בסשן
    const stored = localStorage.getItem('currentSession');
    if (stored) {
        const session = JSON.parse(stored);
        currentUserName = session.name;
        currentUserRole = session.role;
        userSessionId = session.id;
        displayScreen(currentUserRole === 'admin' ? 'adminScreen' : 'teacherScreen');
        
        if (currentUserRole === 'admin') {
            loadAllOrders();
        } else {
            document.getElementById('teacherName').textContent = currentUserName;
            loadTeacherOrders(userSessionId);
            populateItemSelect();
            // שנה לטאב ההזמנה החדשה עבור מורות
            switchTab('newOrder');
        }
    } else {
        displayScreen('loginScreen');
    }

    // קשרו אירועים
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

// ===============================================
// FIRESTORE FUNCTIONS
// ===============================================

async function loadTeacherOrders(userId) {
    try {
        const database = firebase.database();
        const snapshot = await database.ref('orders').once('value');
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            currentUserOrders = Object.keys(data)
                .filter(id => data[id] && data[id].userId === userId)
                .map(id => ({
                    id,
                    ...data[id]
                }))
                .sort((a, b) => {
                    const dateA = new Date(a.createdAt);
                    const dateB = new Date(b.createdAt);
                    return dateB - dateA;
                });
        } else {
            currentUserOrders = [];
        }

        displayTeacherOrders();
    } catch (error) {
        console.error('שגיאה בטעינת הזמנות:', error);
    }
}

async function loadAllOrders() {
    try {
        const database = firebase.database();
        const snapshot = await database.ref('orders').once('value');

        if (snapshot.exists()) {
            const data = snapshot.val();
            currentOrders = Object.keys(data)
                .map(id => ({
                    id,
                    ...data[id]
                }))
                .sort((a, b) => {
                    const dateA = new Date(a.createdAt);
                    const dateB = new Date(b.createdAt);
                    return dateB - dateA;
                });
        } else {
            currentOrders = [];
        }

        displayAdminOrders();
        updateExportSummary();
        loadReceivingData();
    } catch (error) {
        console.error('שגיאה בטעינת כל ההזמנות:', error);
    }
}

async function saveOrder(orderData) {
    try {
        const database = firebase.database();
        const orderId = 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        await database.ref('orders/' + orderId).set({
            ...orderData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'pending'
        });

        console.log('✓ Order saved to Realtime Database:', orderId);
        return orderId;
    } catch (error) {
        throw new Error('שגיאה בשמירת ההזמנה: ' + error.message);
    }
}

async function updateOrderStatus(orderId, newStatus, rejectionReason = null) {
    try {
        const database = firebase.database();
        const updateData = {
            status: newStatus,
            updatedAt: new Date().toISOString()
        };

        // אם זה דחייה, הוסף סיבה
        if (newStatus === 'rejected' && rejectionReason) {
            updateData.rejectionReason = rejectionReason;
        }

        await database.ref('orders/' + orderId).update(updateData);
        loadAllOrders();
    } catch (error) {
        console.error('שגיאה בעדכון סטטוס:', error);
    }
}

// ===============================================
// AUTH HANDLERS
// ===============================================

function handleLogin(e) {
    e.preventDefault();
    const name = document.getElementById('loginName').value.trim();
    const role = document.getElementById('loginRole').value;
    const messageEl = document.getElementById('authMessage');

    if (!name) {
        messageEl.classList.add('error');
        messageEl.textContent = '❌ הזן שם משתמש';
        return;
    }

    if (!role) {
        messageEl.classList.add('error');
        messageEl.textContent = '❌ בחר תפקיד';
        return;
    }

    // בדיקת סיסמה לאחראי ציוד
    if (role === 'admin') {
        const password = prompt('הזן סיסמה לאחראי ציוד:');
        if (password !== 'n0987') {
            messageEl.classList.add('error');
            messageEl.textContent = '❌ סיסמה שגויה';
            return;
        }
    }

    // שמור בסשן
    // שתמש בשם המורה כ-ID (כדי שיהיה consistent)
    userSessionId = 'teacher_' + name.replace(/\s+/g, '_').toLowerCase();
    localStorage.setItem('currentSession', JSON.stringify({
        id: userSessionId,
        name: name,
        role: role
    }));

    currentUserName = name;
    currentUserRole = role;

    messageEl.classList.remove('error');
    messageEl.textContent = '';

    displayScreen(role === 'admin' ? 'adminScreen' : 'teacherScreen');
    
    if (role === 'admin') {
        loadAllOrders();
    } else {
        document.getElementById('teacherName').textContent = name;
        loadTeacherOrders(userSessionId);
        populateItemSelect();
        // החזרה לטאב הזמנה חדשה
        switchTab('newOrder');
    }
}

function logout() {
    localStorage.removeItem('currentSession');
    currentUserName = null;
    currentUserRole = null;
    userSessionId = null;
    tempOrderItems = [];
    displayScreen('loginScreen');
    clearForms();
}

// ===============================================
// UI FUNCTIONS
// ===============================================

function displayScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function switchTab(tabName, button) {
    // אם עוברים לטאב אחר (לא הזמנות), הסתר את ההודעה ואפס את הדגל
    if (tabName !== 'orders') {
        const messageEl = document.getElementById('ordersMessage');
        if (messageEl) {
            messageEl.style.display = 'none';
        }
        orderJustSubmitted = false;
    }
    
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // אם יש button, סמן אותו כactive
    if (button) {
        button.classList.add('active');
    } else {
        // אם אין button (קריאה מקוד), סמן ידנית
        const buttons = document.querySelectorAll('.tab-btn');
        buttons.forEach(btn => {
            if ((btn.textContent.includes('הזמנות') && tabName === 'orders') ||
                (btn.textContent.includes('חדשה') && tabName === 'newOrder')) {
                btn.classList.add('active');
            }
        });
    }
}

function switchAdminTab(tabName, button) {
    document.querySelectorAll('#allOrdersTab, #exportTab, #receivingTab, #itemsManagementTab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.navbar + .container .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // אם יש button, סמן אותו כactive
    if (button) {
        button.classList.add('active');
    } else {
        // אם אין button, סמן ידנית
        const tabNames = {
            'allOrders': 'כל ההזמנות',
            'export': 'ייצוא',
            'receiving': 'קליטה',
            'itemsManagement': 'ניהול'
        };
        
        const buttons = document.querySelectorAll('.navbar + .container .tab-btn');
        buttons.forEach(btn => {
            if (btn.textContent.includes('כל ההזמנות') && tabName === 'allOrders') {
                btn.classList.add('active');
            } else if (btn.textContent.includes('ייצוא') && tabName === 'export') {
                btn.classList.add('active');
            } else if (btn.textContent.includes('קליטה') && tabName === 'receiving') {
                btn.classList.add('active');
            } else if (btn.textContent.includes('ניהול') && tabName === 'itemsManagement') {
                btn.classList.add('active');
            }
        });
    }

    // אם זה טאב ניהול ציוד, טען את הרשימה
    if (tabName === 'itemsManagement') {
        displayItemsList();
    }
}

function populateItemSelect() {
    const container = document.getElementById('itemsChecklist');
    container.innerHTML = '';
    
    APP_CONFIG.items.forEach(item => {
        const checklistItem = document.createElement('div');
        checklistItem.className = 'checklist-item';
        checklistItem.id = 'item-' + item.id;
        checklistItem.innerHTML = `
            <input type="checkbox" id="check-${item.id}" onchange="toggleItem(${item.id})">
            <div class="checklist-item-info">
                <div class="checklist-item-name">${item.name}</div>
                <div class="checklist-item-category">${item.category}</div>
            </div>
            <div class="checklist-item-quantity">
                <label for="qty-${item.id}">כמות:</label>
                <input type="number" id="qty-${item.id}" min="1" value="1" disabled>
            </div>
        `;
        container.appendChild(checklistItem);
    });
}

// ===============================================
// TEACHER FUNCTIONS
// ===============================================

function toggleItem(itemId) {
    const checkbox = document.getElementById('check-' + itemId);
    const quantityInput = document.getElementById('qty-' + itemId);
    const itemContainer = document.getElementById('item-' + itemId);

    if (checkbox.checked) {
        quantityInput.disabled = false;
        itemContainer.classList.add('checked');
    } else {
        quantityInput.disabled = true;
        itemContainer.classList.remove('checked');
    }
}

function addItemToOrder() {
    const itemSelect = document.getElementById('itemSelect');
    const itemQuantity = document.getElementById('itemQuantity');
    const itemNotes = document.getElementById('itemNotes');

    if (!itemSelect.value) {
        alert('בחר פריט');
        return;
    }

    const itemId = parseInt(itemSelect.value);
    const item = APP_CONFIG.items.find(i => i.id === itemId);
    const quantity = parseInt(itemQuantity.value);

    const existingIndex = tempOrderItems.findIndex(i => i.id === itemId);
    
    if (existingIndex >= 0) {
        tempOrderItems[existingIndex].quantity += quantity;
    } else {
        tempOrderItems.push({
            id: itemId,
            name: item.name,
            quantity: quantity,
            notes: itemNotes.value
        });
    }

    itemSelect.value = '';
    itemQuantity.value = '1';
    itemNotes.value = '';

    displayOrderPreview();
}

function removeItemFromOrder(itemId) {
    tempOrderItems = tempOrderItems.filter(item => item.id !== itemId);
    displayOrderPreview();
}

function displayOrderPreview() {
    const container = document.getElementById('itemsPreview');
    
    if (tempOrderItems.length === 0) {
        container.innerHTML = '<p class="placeholder">אף פריט לא נבחר עדיין</p>';
        return;
    }

    container.innerHTML = tempOrderItems.map(item => `
        <div class="preview-item">
            <div class="preview-item-info">
                <div class="preview-item-name">${item.name}</div>
                ${item.notes ? `<div class="preview-item-notes">הערה: ${item.notes}</div>` : ''}
            </div>
            <div class="preview-item-quantity">${item.quantity} ✕</div>
            <button type="button" class="remove-btn" onclick="removeItemFromOrder(${item.id})">✕ הסר</button>
        </div>
    `).join('');
}

async function submitOrder(e) {
    if (e) e.preventDefault();

    // אסוף את הפריטים שנבחרו
    const selectedItems = [];
    APP_CONFIG.items.forEach(item => {
        const checkbox = document.getElementById('check-' + item.id);
        if (checkbox && checkbox.checked) {
            const quantityInput = document.getElementById('qty-' + item.id);
            const quantity = parseInt(quantityInput.value) || 1;
            selectedItems.push({
                id: item.id,
                name: item.name,
                quantity: quantity,
                notes: ''
            });
        }
    });

    // בדוק "אחר"
    const otherItem = document.getElementById('otherItem').value.trim();
    if (otherItem) {
        const otherQuantity = parseInt(document.getElementById('otherQuantity').value) || 1;
        selectedItems.push({
            id: 999,
            name: otherItem,
            quantity: otherQuantity,
            notes: 'פריט משתמש'
        });
    }

    if (selectedItems.length === 0) {
        alert('בחר לפחות פריט אחד');
        return;
    }

    const classInput = document.getElementById('orderClass').value;
    if (!classInput) {
        alert('הזן כיתה');
        return;
    }

    try {
        const orderData = {
            userId: userSessionId,
            teacherName: currentUserName,
            class: classInput,
            items: selectedItems,
            status: 'pending'
        };

        const orderId = await saveOrder(orderData);
        
        // הגדר שהזמנה בדיוק נשלחה
        orderJustSubmitted = true;
        
        // הצג הודעת הצלחה ברורה
        const messageEl = document.getElementById('newOrderMessage');
        if (messageEl) {
            messageEl.className = 'message success';
            messageEl.innerHTML = `
                <div style="font-size: 1.1rem; padding: 15px;">
                    <div style="margin-bottom: 10px;">✓ ההזמנה נשלחה בהצלחה!</div>
                    <div style="font-size: 0.95rem;">מספר הזמנה: <strong>${orderId.substring(0, 20)}...</strong></div>
                    <div style="font-size: 0.95rem; margin-top: 8px;">ההזמנה מחכה לאישור מאחראי הציוד</div>
                </div>
            `;
            messageEl.style.display = 'block';
        }
        
        // אפס את הטופס
        document.getElementById('orderClass').value = '';
        document.getElementById('otherItem').value = '';
        document.getElementById('otherQuantity').value = '1';
        
        // אפס את כל הקונטיינרים
        document.querySelectorAll('.checklist-item input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
            const itemContainer = cb.closest('.checklist-item');
            if (itemContainer) {
                itemContainer.classList.remove('checked');
                const qtyInput = itemContainer.querySelector('input[type="number"]');
                if (qtyInput) qtyInput.disabled = true;
            }
        });
        
        loadTeacherOrders(userSessionId);
        
        // חזור לטאב "הזמנות שלי" אחרי 2 שניות
        setTimeout(() => {
            switchTab('orders');
            // גלול למעלה כדי לראות את ההודעה
            const ordersTab = document.getElementById('ordersTab');
            if (ordersTab) {
                ordersTab.scrollTop = 0;
            }
        }, 2000);
    } catch (error) {
        showMessage('❌ שגיאה: ' + error.message, 'error');
    }
}

function displayTeacherOrders() {
    const container = document.getElementById('teacherOrdersList');
    
    // אם הזמנה בדיוק נשלחה, הצג הודעה
    if (orderJustSubmitted) {
        const messageEl = document.getElementById('ordersMessage');
        if (messageEl) {
            messageEl.className = 'message success';
            messageEl.innerHTML = `
                <div style="font-size: 1rem;">
                    <div style="margin-bottom: 8px;">✅ ההזמנה שלך נשלחה לאישור!</div>
                    <div style="font-size: 0.9rem;">אתה יכול לראות אותה בטבלה למטה</div>
                </div>
            `;
            messageEl.style.display = 'block';
        }
        
        // גלול למעלה כדי לראות את ההודעה
        const ordersTab = document.getElementById('ordersTab');
        if (ordersTab) {
            ordersTab.scrollTop = 0;
        }
        
        // אל תאפס את הדגל עד שמעברים לטאב אחר
        // orderJustSubmitted = false;
    }

    if (currentUserOrders.length === 0) {
        container.innerHTML = '<p class="placeholder">אין הזמנות עדיין</p>';
        return;
    }

    // חלק הזמנות לשתי קבוצות
    const activeOrders = currentUserOrders.filter(o => o.status !== 'rejected');
    const rejectedOrders = currentUserOrders.filter(o => o.status === 'rejected');

    let html = '';

    // הזמנות פעילות
    if (activeOrders.length > 0) {
        html += '<div class="orders-section"><h3 style="color: var(--primary); margin-bottom: 15px;">הזמנות פעילות</h3>';
        html += activeOrders.map(order => `
            <div class="order-card ${order.status}">
                <div class="order-header">
                    <div>
                        <div class="order-title">הזמנה - כיתה ${order.class}</div>
                        <div class="order-details">
                            <p>תאריך: ${formatDate(order.createdAt)}</p>
                        </div>
                    </div>
                    <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
                </div>
                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-item">
                            <span class="item-name">${item.name}</span>
                            <span class="item-quantity">כמות: ${item.quantity}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        html += '</div>';
    }

    // הזמנות שנדחו
    if (rejectedOrders.length > 0) {
        html += '<div class="orders-section"><h3 style="color: var(--danger); margin-bottom: 15px;">הזמנות שנדחו</h3>';
        html += rejectedOrders.map(order => `
            <div class="order-card ${order.status}" style="border-right: 4px solid var(--danger);">
                <div class="order-header">
                    <div>
                        <div class="order-title">הזמנה - כיתה ${order.class}</div>
                        <div class="order-details">
                            <p>תאריך: ${formatDate(order.createdAt)}</p>
                            ${order.rejectionReason ? `<p style="color: var(--danger); font-weight: 600;">סיבה: ${order.rejectionReason}</p>` : ''}
                        </div>
                    </div>
                    <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
                </div>
                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-item">
                            <span class="item-name">${item.name}</span>
                            <span class="item-quantity">כמות: ${item.quantity}</span>
                        </div>
                    `).join('')}
                </div>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button class="btn btn-danger" onclick="deleteOrder('${order.id}')">🗑️ מחוק</button>
                    <button class="btn btn-primary" onclick="resendOrder('${order.id}')">📤 שליחה מחדש</button>
                </div>
            </div>
        `).join('');
        html += '</div>';
    }

    container.innerHTML = html;
}

// ===============================================
// ADMIN FUNCTIONS
// ===============================================

async function deleteOrder(orderId) {
    if (confirm('האם אתה בטוח שברצונך למחוק הזמנה זו?')) {
        try {
            const database = firebase.database();
            await database.ref('orders/' + orderId).remove();
            console.log('✓ Order deleted:', orderId);
            loadTeacherOrders(userSessionId);
            showMessage('ההזמנה נמחקה בהצלחה', 'success');
        } catch (error) {
            console.error('Error deleting order:', error);
            showMessage('שגיאה במחיקת ההזמנה', 'error');
        }
    }
}

async function resendOrder(orderId) {
    try {
        // מצא את ההזמנה המקורית
        const order = currentUserOrders.find(o => o.id === orderId);
        if (!order) {
            alert('לא מצאנו את ההזמנה');
            return;
        }

        // שמור הזמנה חדשה (עם אותו תוכן אבל status חדש)
        const newOrderData = {
            userId: order.userId,
            teacherName: order.teacherName,
            class: order.class,
            items: order.items,
            status: 'pending'
        };

        const database = firebase.database();
        const newOrderId = 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        await database.ref('orders/' + newOrderId).set({
            ...newOrderData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        // מחוק את ההזמנה הישנה
        await database.ref('orders/' + orderId).remove();

        console.log('✓ Order resent:', newOrderId);
        loadTeacherOrders(userSessionId);
        showMessage('ההזמנה נשלחה מחדש בהצלחה!', 'success');
    } catch (error) {
        console.error('Error resending order:', error);
        showMessage('שגיאה בשליחה מחדש', 'error');
    }
}

function displayAdminOrders() {
    const container = document.getElementById('adminOrdersList');

    if (currentOrders.length === 0) {
        container.innerHTML = '<p class="placeholder">אין הזמנות</p>';
        return;
    }

    container.innerHTML = currentOrders.map(order => `
        <div class="order-card ${order.status}">
            <div class="order-header">
                <div>
                    <div class="order-title">הזמנה מ- ${order.teacherName}</div>
                    <div class="order-details">
                        <p>כיתה: ${order.class}</p>
                        <p>תאריך: ${formatDate(order.createdAt)}</p>
                    </div>
                </div>
                <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-item">
                        <span class="item-name">${item.name}</span>
                        <span class="item-quantity">כמות: ${item.quantity}</span>
                    </div>
                `).join('')}
            </div>
            <div class="order-actions">
                ${order.status === 'pending' ? `
                    <button class="btn btn-primary" onclick="approveOrder('${order.id}')">✓ אישור</button>
                    <button class="btn btn-danger" onclick="rejectOrder('${order.id}')">✕ דחייה</button>
                ` : ''}
                ${order.status === 'approved' ? `
                    <button class="btn btn-secondary" onclick="updateStatusOrder('${order.id}', 'ordered')">הזמן מספק</button>
                ` : ''}
                ${order.status === 'ordered' ? `
                    <button class="btn btn-secondary" onclick="updateStatusOrder('${order.id}', 'received')">✓ קיבלתי</button>
                ` : ''}
                ${order.status === 'received' ? `
                    <button class="btn btn-secondary" onclick="updateStatusOrder('${order.id}', 'distributed')">✓ חילקתי</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function approveOrder(orderId) {
    updateOrderStatus(orderId, 'approved');
}

function rejectOrder(orderId) {
    const reason = prompt('סיבת דחייה:');
    if (reason !== null) {
        updateOrderStatus(orderId, 'rejected', reason);
    }
}

function updateStatusOrder(orderId, newStatus) {
    updateOrderStatus(orderId, newStatus);
}

function filterOrdersByStatus() {
    const status = document.getElementById('statusFilter').value;
    const container = document.getElementById('adminOrdersList');

    const filtered = status ? currentOrders.filter(o => o.status === status) : currentOrders;

    if (filtered.length === 0) {
        container.innerHTML = '<p class="placeholder">אין הזמנות בסטטוס זה</p>';
        return;
    }

    container.innerHTML = filtered.map(order => `
        <div class="order-card ${order.status}">
            <div class="order-header">
                <div>
                    <div class="order-title">הזמנה מ- ${order.teacherName}</div>
                    <div class="order-details">
                        <p>כיתה: ${order.class}</p>
                        <p>תאריך: ${formatDate(order.createdAt)}</p>
                    </div>
                </div>
                <span class="order-status status-${order.status}">${getStatusText(order.status)}</span>
            </div>
            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-item">
                        <span class="item-name">${item.name}</span>
                        <span class="item-quantity">כמות: ${item.quantity}</span>
                    </div>
                `).join('')}
            </div>
            <div class="order-actions">
                ${order.status === 'pending' ? `
                    <button class="btn btn-primary" onclick="approveOrder('${order.id}')">✓ אישור</button>
                    <button class="btn btn-danger" onclick="rejectOrder('${order.id}')">✕ דחייה</button>
                ` : ''}
                ${order.status === 'approved' ? `
                    <button class="btn btn-secondary" onclick="updateStatusOrder('${order.id}', 'ordered')">הזמן מספק</button>
                ` : ''}
                ${order.status === 'ordered' ? `
                    <button class="btn btn-secondary" onclick="updateStatusOrder('${order.id}', 'received')">✓ קיבלתי</button>
                ` : ''}
                ${order.status === 'received' ? `
                    <button class="btn btn-secondary" onclick="updateStatusOrder('${order.id}', 'distributed')">✓ חילקתי</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function updateExportSummary() {
    const approvedOrders = currentOrders.filter(o => o.status === 'approved');
    const itemSummary = {};

    approvedOrders.forEach(order => {
        order.items.forEach(item => {
            if (!itemSummary[item.name]) {
                itemSummary[item.name] = 0;
            }
            itemSummary[item.name] += item.quantity;
        });
    });

    const container = document.getElementById('exportSummary');

    if (Object.keys(itemSummary).length === 0) {
        container.innerHTML = '<p class="placeholder">אין פריטים מאושרים</p>';
        return;
    }

    const tableHTML = `
        <table class="export-table">
            <thead>
                <tr>
                    <th>שם פריט</th>
                    <th>כמות להזמנה</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(itemSummary).map(([name, quantity]) => `
                    <tr>
                        <td>${name}</td>
                        <td>${quantity}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}

function loadReceivingData() {
    const approvedOrders = currentOrders.filter(o => o.status === 'approved' || o.status === 'ordered' || o.status === 'received');
    const container = document.getElementById('receivingList');

    if (approvedOrders.length === 0) {
        container.innerHTML = '<p class="placeholder">אין הזמנות מאושרות</p>';
        return;
    }

    const itemsMap = {};

    approvedOrders.forEach(order => {
        order.items.forEach(item => {
            if (!itemsMap[item.name]) {
                itemsMap[item.name] = [];
            }
            itemsMap[item.name].push({
                teacher: order.teacherName,
                quantity: item.quantity
            });
        });
    });

    const html = Object.entries(itemsMap).map(([itemName, details]) => {
        const total = details.reduce((sum, d) => sum + d.quantity, 0);
        const breakdown = details.map(d => `${d.teacher}: ${d.quantity}`).join(' | ');

        return `
            <div class="receiving-item">
                <input type="checkbox" onchange="this.parentElement.classList.toggle('received')">
                <div class="receiving-item-info">
                    <div class="receiving-item-name">${itemName}</div>
                    <div class="receiving-item-details">
                        <strong>סה"כ: ${total}</strong> | ${breakdown}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// ===============================================
// EXPORT FUNCTIONS
// ===============================================

function exportToExcel() {
    const approvedOrders = currentOrders.filter(o => o.status === 'approved');
    const itemSummary = {};

    approvedOrders.forEach(order => {
        order.items.forEach(item => {
            if (!itemSummary[item.name]) {
                itemSummary[item.name] = 0;
            }
            itemSummary[item.name] += item.quantity;
        });
    });

    // הוסף BOM לעברית בExcel
    let csv = '\uFEFFשם פריט,כמות להזמנה\n';
    Object.entries(itemSummary).forEach(([name, quantity]) => {
        csv += `"${name}",${quantity}\n`;
    });

    downloadFile(csv, 'הזמנה_לספק.csv', 'text/csv;charset=utf-8;');
}

function exportToPDF() {
    const approvedOrders = currentOrders.filter(o => o.status === 'approved');
    const itemSummary = {};

    approvedOrders.forEach(order => {
        order.items.forEach(item => {
            if (!itemSummary[item.name]) {
                itemSummary[item.name] = 0;
            }
            itemSummary[item.name] += item.quantity;
        });
    });

    let html = '<h2>הזמנה מרוכזת לספק</h2>';
    html += '<table border="1" cellpadding="10" style="width:100%; border-collapse:collapse;">';
    html += '<tr><th>שם פריט</th><th>כמות</th></tr>';
    
    Object.entries(itemSummary).forEach(([name, quantity]) => {
        html += `<tr><td>${name}</td><td>${quantity}</td></tr>`;
    });
    
    html += '</table>';

    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
        <html dir="rtl">
        <head><title>הזמנה לספק</title></head>
        <body>${html}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function exportReceivingReport() {
    const approvedOrders = currentOrders.filter(o => o.status === 'approved' || o.status === 'ordered' || o.status === 'received');
    const itemsMap = {};

    approvedOrders.forEach(order => {
        order.items.forEach(item => {
            if (!itemsMap[item.name]) {
                itemsMap[item.name] = [];
            }
            itemsMap[item.name].push({
                teacher: order.teacherName,
                quantity: item.quantity
            });
        });
    });

    let html = '<h2>מסמך קליטת ציוד</h2>';
    html += '<h3>טבלה 1: לפי פריט</h3>';
    html += '<table border="1" cellpadding="10" style="width:100%; border-collapse:collapse;">';
    html += '<tr><th>פריט</th><th>כמות כוללת</th><th>פירוט לפי מורות</th></tr>';
    
    // יוצר CSV גם:
    let csv = '\uFEFFפריט,כמות כוללת,פירוט לפי מורות\n';
    
    Object.entries(itemsMap).forEach(([itemName, details]) => {
        const total = details.reduce((sum, d) => sum + d.quantity, 0);
        const breakdown = details.map(d => `${d.teacher} - ${d.quantity}`).join(', ');
        html += `<tr><td>${itemName}</td><td>${total}</td><td>${breakdown}</td></tr>`;
        csv += `"${itemName}",${total},"${breakdown}"\n`;
    });
    
    html += '</table>';

    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(`
        <html dir="rtl">
        <head><title>דוח קליטה</title></head>
        <body>${html}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function downloadFile(content, filename, type) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:' + type + ';charset=UTF-8,' + encodeURIComponent(content));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// ===============================================
// ITEMS MANAGEMENT
// ===============================================

function displayItemsList() {
    const container = document.getElementById('itemsList');
    container.innerHTML = '';

    // קבץ לפי קטגוריה
    const categories = {};
    APP_CONFIG.items.forEach(item => {
        if (!categories[item.category]) {
            categories[item.category] = [];
        }
        categories[item.category].push(item);
    });

    Object.entries(categories).forEach(([category, items]) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.style.marginBottom = '25px';
        
        let html = `<h5 style="color: var(--primary); margin-bottom: 15px;">${category}</h5>`;
        html += '<div style="display: flex; flex-direction: column; gap: 10px;">';
        
        items.forEach(item => {
            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: white; border: 1px solid var(--medium-gray); border-radius: 6px;">
                    <span>${item.name}</span>
                    <button class="btn btn-danger" style="padding: 6px 12px; font-size: 0.85rem;" onclick="deleteItem(${item.id})">🗑️ מחק</button>
                </div>
            `;
        });
        
        html += '</div>';
        categoryDiv.innerHTML = html;
        container.appendChild(categoryDiv);
    });
}

function addNewItem() {
    const itemName = document.getElementById('newItemName').value.trim();
    const itemCategory = document.getElementById('newItemCategory').value;

    if (!itemName) {
        alert('הזן שם פריט');
        return;
    }

    // מצא ID חדש
    const maxId = Math.max(...APP_CONFIG.items.map(i => i.id));
    const newId = maxId + 1;

    // הוסף לרשימה
    APP_CONFIG.items.push({
        id: newId,
        name: itemName,
        category: itemCategory
    });

    // שמור ב-localStorage
    localStorage.setItem('APP_CONFIG_ITEMS', JSON.stringify(APP_CONFIG.items));

    // אפס את הטופס
    document.getElementById('newItemName').value = '';

    // רענן את הרשימה
    displayItemsList();

    alert('✓ הפריט הוסף בהצלחה!');
}

function deleteItem(itemId) {
    if (confirm('בטוח שברצונך למחוק פריט זה?')) {
        APP_CONFIG.items = APP_CONFIG.items.filter(item => item.id !== itemId);
        
        // שמור ב-localStorage
        localStorage.setItem('APP_CONFIG_ITEMS', JSON.stringify(APP_CONFIG.items));

        // רענן את הרשימה
        displayItemsList();

        alert('✓ הפריט נמחק בהצלחה!');
    }
}

function loadItemsFromStorage() {
    const stored = localStorage.getItem('APP_CONFIG_ITEMS');
    if (stored) {
        APP_CONFIG.items = JSON.parse(stored);
    }
}

function formatDate(timestamp) {
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('he-IL');
    } catch {
        return 'תאריך לא ידוע';
    }
}

function getStatusText(status) {
    const statusMap = {
        'pending': 'ממתין לאישור',
        'approved': 'אושר ✓',
        'ordered': 'הוזמן מהספק',
        'received': 'התקבל ✓',
        'distributed': 'חולק ✓',
        'rejected': 'נדחה ✕'
    };
    return statusMap[status] || status;
}

function clearForms() {
    document.getElementById('loginForm').reset();
}

// ===============================================
// HELPER FUNCTIONS
// ===============================================

function showMessage(message, type = 'info') {
    // חפש מסג בכל המסכנים
    let messageEl = document.querySelector('#authMessage, #newOrderMessage');
    
    if (!messageEl) {
        // אם לא קיים, צור אלמנט בדף הנוכחי
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab) {
            messageEl = document.createElement('div');
            messageEl.className = 'message';
            activeTab.insertBefore(messageEl, activeTab.firstChild);
        } else {
            messageEl = document.getElementById('authMessage');
        }
    }

    if (messageEl) {
        messageEl.className = 'message ' + type;
        messageEl.textContent = message;
        messageEl.style.display = 'block';
        
        // הסתר את ההודעה אחרי 4 שניות (או 3 בהצלחה)
        if (type === 'success') {
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 3000);
        }
    }
}

function updateConnectionStatus() {
    const statusEl = document.getElementById('firebaseStatus');
    if (statusEl) {
        if (firebaseConnected) {
            statusEl.textContent = '☁️ מחובר לענן';
            statusEl.style.color = 'white';
            statusEl.style.opacity = '1';
        } else {
            statusEl.textContent = '☁️ לא מחובר';
            statusEl.style.color = '#ffcccc';
            statusEl.style.opacity = '0.7';
        }
    }
}
