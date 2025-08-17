// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC3IWkqDjwOLb4tTtgtfgkXdLSri8Voeag",
    authDomain: "data-storage-8c9ca.firebaseapp.com",
    databaseURL: "https://data-storage-8c9ca-default-rtdb.firebaseio.com",
    projectId: "data-storage-8c9ca",
    storageBucket: "data-storage-8c9ca.firebasestorage.app",
    messagingSenderId: "505046082965",
    appId: "1:505046082965:web:e722ae19e5b5cbbfb2029c",
    measurementId: "G-Q9HYH3ZWCJ"
};

// משתני גלובליים
let database;
let auth;
let firebaseInitialized = false;
let currentUser = null;
let isAdmin = false;

// נתונים ראשיים
let appData = {
    mainTopics: [
        {
            id: 1,
            name: "ימי חוץ",
            subTopics: [
                { id: 1, name: "תכנון שנתי", driveLink: "", fileOwner: "", subTopics: [] },
                { id: 2, name: "חוניכות", driveLink: "", fileOwner: "", subTopics: [] },
                { id: 3, name: "מדריכים", driveLink: "", fileOwner: "", subTopics: [] }
            ]
        },
        {
            id: 2,
            name: "משולשים",
            subTopics: [
                { id: 4, name: "מבחנים", driveLink: "", fileOwner: "", subTopics: [] },
                { id: 5, name: "משימות", driveLink: "", fileOwner: "", subTopics: [] },
                { id: 6, name: "פרויקטים", driveLink: "", fileOwner: "", subTopics: [] }
            ]
        }
    ]
};

let currentMainTopic = null;
let currentSubTopic = null;
let currentPath = [];
let editingMainTopic = null;
let editingSubTopic = null;
let isDragMode = false;
let draggedElement = null;
let draggedData = null;

// הפיכת הפונקציות לגלובליות מיד
window.showAuthTab = showAuthTab;
window.loginUser = loginUser;
window.registerUser = registerUser;
window.resetPassword = resetPassword;
window.showForgotPassword = showForgotPassword;
window.logoutUser = logoutUser;
window.navigateBack = navigateBack;
window.showAdminLogin = showAdminLogin;
window.addComment = addComment;
window.showMainScreen = showMainScreen;
window.toggleDragMode = toggleDragMode;
window.addMainTopic = addMainTopic;
window.editMainTopic = editMainTopic;
window.saveMainTopic = saveMainTopic;
window.cancelEditMainTopic = cancelEditMainTopic;
window.deleteMainTopic = deleteMainTopic;
window.addSubTopic = addSubTopic;
window.addNestedSubTopic = addNestedSubTopic;
window.editSubTopic = editSubTopic;
window.saveSubTopic = saveSubTopic;
window.cancelEditSubTopic = cancelEditSubTopic;
window.deleteSubTopic = deleteSubTopic;
window.changeAdminPassword = changeAdminPassword;

// אתחול Firebase
function initFirebase() {
    try {
        console.log('🔄 מאתחל Firebase...');
        
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase SDK לא נטען');
            updateConnectionStatus(false);
            return false;
        }

        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        auth = firebase.auth();
        firebaseInitialized = true;
        
        console.log('✅ Firebase אותחל בהצלחה');
        document.getElementById('firebase-setup').style.display = 'none';
        updateConnectionStatus(true);
        
        // האזנה לשינויי מצב אימות
        auth.onAuthStateChanged(onAuthStateChanged);
        
        return true;
    } catch (error) {
        console.error('💥 שגיאה באתחול Firebase:', error);
        updateConnectionStatus(false);
        return false;
    }
}

// טיפול בשינויי מצב אימות
function onAuthStateChanged(user) {
    currentUser = user;
    
    if (user) {
        console.log('✅ משתמש מחובר:', user.email);
        checkIfAdmin(user.uid);
        showMainScreen();
        updateUserDisplay();
        loadDataFromFirebase();
    } else {
        console.log('❌ משתמש לא מחובר');
        currentUser = null;
        isAdmin = false;
        showAuthScreen();
    }
}

// בדיקת הרשאות מנהל
async function checkIfAdmin(uid) {
    try {
        const snapshot = await database.ref(`admins/${uid}`).once('value');
        isAdmin = snapshot.exists();
        updateAdminDisplay();
        console.log('🔑 סטטוס מנהל:', isAdmin);
    } catch (error) {
        console.error('❌ שגיאה בבדיקת הרשאות מנהל:', error);
        isAdmin = false;
    }
}

// עדכון תצוגת משתמש
function updateUserDisplay() {
    const welcomeMessage = document.getElementById('welcome-message');
    const userInfo = document.getElementById('user-info');
    
    if (currentUser && welcomeMessage) {
        const displayName = currentUser.displayName || currentUser.email.split('@')[0];
        welcomeMessage.textContent = `שלום, ${displayName}`;
        if (userInfo) {
            userInfo.textContent = `מחובר: ${currentUser.email}`;
            userInfo.style.display = 'inline';
        }
    }
}

// עדכון תצוגת מנהל
function updateAdminDisplay() {
    const adminSection = document.getElementById('admin-section');
    if (adminSection) {
        adminSection.style.display = isAdmin ? 'block' : 'none';
    }
}

// טאבי אימות
function showAuthTab(tab) {
    console.log('🔄 מחליף לטאב:', tab);
    
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    if (tab === 'login') {
        document.querySelector('.auth-tab:first-child').classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else if (tab === 'register') {
        document.querySelector('.auth-tab:last-child').classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }
}

// הרשמה
async function registerUser() {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm').value;
    const registerBtn = document.getElementById('register-btn');
    
    if (!name || !email || !password || !confirmPassword) {
        showRegisterError('יש למלא את כל השדות');
        return;
    }
    
    if (password.length < 6) {
        showRegisterError('הסיסמה חייבת להכיל לפחות 6 תווים');
        return;
    }
    
    if (password !== confirmPassword) {
        showRegisterError('הסיסמאות לא תואמות');
        return;
    }
    
    registerBtn.disabled = true;
    registerBtn.textContent = 'נרשם...';
    
    try {
        if (!firebaseInitialized) throw new Error('Firebase לא מחובר');
        
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        await user.updateProfile({ displayName: name });
        
        await database.ref(`users/${user.uid}`).set({
            name: name,
            email: email,
            registeredAt: firebase.database.ServerValue.TIMESTAMP,
            role: 'user'
        });
        
        showRegisterSuccess('ההרשמה הושלמה בהצלחה!');
        
        document.getElementById('register-name').value = '';
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        document.getElementById('register-confirm').value = '';
        
    } catch (error) {
        console.error('❌ שגיאה בהרשמה:', error);
        let errorMessage = 'שגיאה בהרשמה';
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'כתובת האימייל כבר קיימת במערכת';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'הסיסמה חלשה מדי';
        }
        
        showRegisterError(errorMessage);
    } finally {
        registerBtn.disabled = false;
        registerBtn.textContent = 'הרשם';
    }
}

// התחברות
async function loginUser() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const loginBtn = document.getElementById('login-btn');
    
    if (!email || !password) {
        showLoginError('יש למלא את כל השדות');
        return;
    }
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'מתחבר...';
    
    try {
        if (!firebaseInitialized) throw new Error('Firebase לא מחובר');
        
        await auth.signInWithEmailAndPassword(email, password);
        
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        
    } catch (error) {
        console.error('❌ שגיאה בהתחברות:', error);
        let errorMessage = 'שגיאה בהתחברות';
        
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'המשתמש לא קיים במערכת';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'סיסמה שגויה';
        }
        
        showLoginError(errorMessage);
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'התחבר';
    }
}

// התנתקות
async function logoutUser() {
    if (confirm('האם אתה בטוח שברצונך להתנתק?')) {
        try {
            await auth.signOut();
        } catch (error) {
            console.error('❌ שגיאה בהתנתקות:', error);
            alert('שגיאה בהתנתקות');
        }
    }
}

// איפוס סיסמה
function showForgotPassword() {
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById('forgot-form').classList.add('active');
}

async function resetPassword() {
    const email = document.getElementById('forgot-email').value.trim();
    const forgotBtn = document.getElementById('forgot-btn');
    
    if (!email) {
        showForgotError('יש להזין כתובת אימייל');
        return;
    }
    
    forgotBtn.disabled = true;
    forgotBtn.textContent = 'שולח...';
    
    try {
        await auth.sendPasswordResetEmail(email);
        showForgotSuccess('קישור איפוס הסיסמה נשלח לאימייל שלך');
        document.getElementById('forgot-email').value = '';
    } catch (error) {
        console.error('❌ שגיאה באיפוס סיסמה:', error);
        showForgotError('שגיאה בשליחת האימייל');
    } finally {
        forgotBtn.disabled = false;
        forgotBtn.textContent = 'שלח קישור איפוס';
    }
}

// פונקציות הודעות
function showLoginError(message) {
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function showRegisterError(message) {
    const errorDiv = document.getElementById('register-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function showRegisterSuccess(message) {
    const successDiv = document.getElementById('register-success');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
}

function showForgotError(message) {
    const errorDiv = document.getElementById('forgot-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function showForgotSuccess(message) {
    const successDiv = document.getElementById('forgot-success');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
}

// בדיקת אימייל תקין
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// הצפנת סיסמה
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// עדכון סטטוס חיבור
function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
        if (connected) {
            statusEl.textContent = 'מחובר';
            statusEl.className = 'status-indicator status-connected';
        } else {
            statusEl.textContent = 'מנותק';
            statusEl.className = 'status-indicator status-disconnected';
        }
    }
}

// שמירת נתונים
async function saveDataToFirebase() {
    if (!firebaseInitialized) {
        saveDataLocally();
        return;
    }

    try {
        await database.ref('appData').set(appData);
        console.log('✅ נתונים נשמרו ב-Firebase');
        showSuccess('השינויים נשמרו בהצלחה!');
    } catch (error) {
        console.error('❌ שגיאה בשמירה:', error);
        saveDataLocally();
        showError('שגיאה בשמירה. הנתונים נשמרו מקומית.');
    }
}

function saveDataLocally() {
    localStorage.setItem('teacherAppData', JSON.stringify(appData));
}

// טעינת נתונים
function loadDataFromFirebase() {
    if (!firebaseInitialized) {
        loadDataLocally();
        return;
    }

    database.ref('appData').once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            if (data) {
                appData = data;
                updateExistingData();
            } else {
                saveDataToFirebase();
            }
            renderMainTopics();
        })
        .catch((error) => {
            console.error('❌ שגיאה בטעינה:', error);
            loadDataLocally();
        });
}

function loadDataLocally() {
    const saved = localStorage.getItem('teacherAppData');
    if (saved) {
        try {
            appData = JSON.parse(saved);
            updateExistingData();
        } catch (e) {
            console.error('❌ שגיאה בטעינה מקומית:', e);
        }
    }
    renderMainTopics();
}

function updateExistingData() {
    function addFileOwnerField(subTopics) {
        subTopics.forEach(subTopic => {
            if (!subTopic.hasOwnProperty('fileOwner')) {
                subTopic.fileOwner = '';
            }
            if (subTopic.subTopics && subTopic.subTopics.length > 0) {
                addFileOwnerField(subTopic.subTopics);
            }
        });
    }
    
    appData.mainTopics.forEach(mainTopic => {
        if (mainTopic.subTopics) {
            addFileOwnerField(mainTopic.subTopics);
        }
    });
}

// הצגת נושאים ראשיים
function renderMainTopics() {
    const container = document.getElementById('main-buttons');
    if (!container) return;
    
    container.innerHTML = '';
    
    appData.mainTopics.forEach(topic => {
        const button = document.createElement('button');
        button.className = 'btn';
        button.textContent = topic.name;
        button.onclick = () => showSubTopics(topic);
        container.appendChild(button);
    });
}

// הצגת תתי נושאים
function showSubTopics(topic, parentPath = []) {
    currentMainTopic = topic;
    currentPath = [...parentPath, topic];
    
    const subTitle = document.getElementById('sub-title');
    if (subTitle) subTitle.textContent = topic.name;
    
    updateBreadcrumb();
    
    const container = document.getElementById('sub-buttons');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (topic.subTopics && topic.subTopics.length > 0) {
        topic.subTopics.forEach(subTopic => {
            const button = document.createElement('button');
            
            if (subTopic.subTopics && subTopic.subTopics.length > 0) {
                button.className = 'sub-btn';
                button.textContent = subTopic.name + ' ▶';
                button.onclick = () => showSubTopics(subTopic, currentPath);
            } else if (subTopic.driveLink && subTopic.driveLink.trim()) {
                button.className = 'sub-btn';
                button.textContent = subTopic.name;
                button.onclick = () => showResource(subTopic);
            } else {
                button.className = 'sub-btn';
                button.textContent = subTopic.name + ' (ריק)';
                button.style.opacity = '0.6';
                button.onclick = () => showSubTopics(subTopic, currentPath);
            }
            
            container.appendChild(button);
        });
    } else {
        const emptyDiv = document.createElement('div');
        emptyDiv.style.textAlign = 'center';
        emptyDiv.style.color = '#6c757d';
        emptyDiv.style.padding = '20px';
        emptyDiv.textContent = 'אין תתי נושאים עדיין';
        container.appendChild(emptyDiv);
    }
    
    showScreen('sub-screen');
}

// עדכון breadcrumb
function updateBreadcrumb() {
    const breadcrumbEl = document.getElementById('breadcrumb');
    if (!breadcrumbEl) return;
    
    if (currentPath.length <= 1) {
        breadcrumbEl.style.display = 'none';
        return;
    }
    
    breadcrumbEl.style.display = 'block';
    const pathText = currentPath.map(item => item.name).join(' ← ');
    breadcrumbEl.innerHTML = 'מיקום: <span>' + pathText + '</span>';
}

// ניווט חזרה
function navigateBack() {
    if (currentPath.length > 1) {
        currentPath.pop();
        const parentTopic = currentPath[currentPath.length - 1];
        showSubTopics(parentTopic, currentPath.slice(0, -1));
    } else {
        showMainScreen();
    }
}

// הצגת משאב
function showResource(subTopic) {
    currentSubTopic = subTopic;
    
    const resourceTitle = document.getElementById('resource-title');
    const driveLink = document.getElementById('drive-link');
    const fileOwnerDisplay = document.getElementById('file-owner-display');
    
    if (resourceTitle) resourceTitle.textContent = subTopic.name;
    if (driveLink) driveLink.href = subTopic.driveLink;
    
    if (fileOwnerDisplay) {
        if (subTopic.fileOwner && subTopic.fileOwner.trim()) {
            fileOwnerDisplay.innerHTML = '👤 <strong>בעל הקובץ:</strong> ' + subTopic.fileOwner;
            fileOwnerDisplay.style.display = 'block';
        } else {
            fileOwnerDisplay.style.display = 'none';
        }
    }

    const resourceBreadcrumb = document.getElementById('resource-breadcrumb');
    if (resourceBreadcrumb) {
        const fullPath = [...currentPath, subTopic];
        const pathText = fullPath.map(item => item.name).join(' ← ');
        resourceBreadcrumb.innerHTML = 'מיקום: <span>' + pathText + '</span>';
    }
    
    loadResourceComments(subTopic.id);
    showScreen('resource-screen');
}

// הוספת הערה
async function addComment() {
    const commentInput = document.getElementById('comment-input');
    const sendBtn = document.getElementById('send-btn');
    
    if (!commentInput || !sendBtn) return;
    
    const commentText = commentInput.value.trim();
    
    if (!commentText) {
        showError('אנא הכנסי הערה');
        return;
    }
    
    if (!currentSubTopic) {
        showError('שגיאה: לא נבחר נושא');
        return;
    }
    
    if (!currentUser) {
        showError('עליך להתחבר כדי להוסיף הערות');
        return;
    }
    
    sendBtn.disabled = true;
    sendBtn.textContent = 'שולח...';
    
    try {
        if (firebaseInitialized && database) {
            const commentsRef = database.ref(`comments/${currentSubTopic.id}`);
            await commentsRef.push({
                text: commentText,
                author: currentUser.displayName || currentUser.email,
                authorEmail: currentUser.email,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            commentInput.value = '';
            showSuccess('ההערה נשלחה בהצלחה!');
        } else {
            showError('שגיאה: מערכת ההערות לא זמינה');
        }
    } catch (error) {
        console.error('❌ שגיאה בהוספת הערה:', error);
        showError('שגיאה בשליחת ההערה. אנא נסי שוב.');
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = 'שלח';
    }
}

// טעינת הערות
function loadResourceComments(resourceId) {
    const container = document.getElementById('comments-list');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">טוען הערות...</div>';
    
    if (firebaseInitialized && database) {
        const commentsRef = database.ref(`comments/${resourceId}`);
        commentsRef.on('value', (snapshot) => {
            const data = snapshot.val();
            const comments = [];
            
            if (data) {
                Object.keys(data).forEach(key => {
                    comments.push({
                        id: key,
                        ...data[key]
                    });
                });
            }
            
            comments.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            displayComments(comments);
        });
    } else {
        setTimeout(() => {
            container.innerHTML = '<p style="text-align: center; color: #6c757d;">מערכת ההערות לא מוגדרת</p>';
        }, 1000);
    }
}

// הצגת הערות
function displayComments(comments) {
    const container = document.getElementById('comments-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (comments.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d;">אין הערות עדיין</p>';
        return;
    }
    
    comments.forEach(comment => {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment';
        
        const timestamp = comment.timestamp ? 
            new Date(comment.timestamp).toLocaleString('he-IL') : 
            'זמן לא ידוע';
        
        commentDiv.innerHTML = `
            <div class="comment-header">
                <span class="comment-author">${comment.author || 'אנונימי'}</span>
                <span class="comment-time">${timestamp}</span>
            </div>
            <div class="comment-text">${comment.text}</div>
        `;
        container.appendChild(commentDiv);
    });
}

// הודעות
function showError(message) {
    const errorDiv = document.getElementById('comment-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => errorDiv.style.display = 'none', 5000);
    } else {
        alert(message);
    }
}

function showSuccess(message) {
    const successDiv = document.getElementById('comment-success');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => successDiv.style.display = 'none', 3000);
    }
}

// מעבר בין מסכים
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

function showAuthScreen() {
    showScreen('auth-screen');
}

function showMainScreen() {
    currentPath = [];
    showScreen('main-screen');
}

function showAdminLogin() {
    if (!isAdmin) {
        alert('אין לך הרשאות מנהל');
        return;
    }
    // מנהל מאומת - מעבר ישיר לפאנל מנהל
    showAdminPanel();
}

// מנהל
async function adminLogin() {
    const password = document.getElementById('admin-password').value;
    const loginBtn = document.querySelector('#login-screen .btn');
    
    if (!password.trim()) {
        alert('אנא הכנס סיסמה');
        return;
    }
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'בודק...';
    
    try {
        if (!firebaseInitialized) {
            alert('שגיאה: מערכת לא מחוברת לבסיס הנתונים');
            return;
        }
        
        const snapshot = await database.ref('adminPassword').once('value');
        if (!snapshot.exists()) {
            alert('שגיאה: לא נמצאה סיסמת מנהל');
            return;
        }
        
        const storedHash = snapshot.val();
        const enteredHash = await hashPassword(password);
        
        if (storedHash === enteredHash) {
            document.getElementById('admin-password').value = '';
            showAdminPanel();
        } else {
            alert('סיסמה שגויה');
        }
        
    } catch (error) {
        console.error('❌ שגיאה בבדיקת סיסמה:', error);
        alert('שגיאה בבדיקת סיסמה');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'כניסה';
    }
}

function showAdminPanel() {
    renderAdminPanel();
    showScreen('admin-screen');
}

function renderAdminPanel() {
    renderMainTopicsAdmin();
    renderTopicSelect();
}

function renderMainTopicsAdmin() {
    const mainTopicsList = document.getElementById('main-topics-list');
    if (!mainTopicsList) return;
    
    mainTopicsList.innerHTML = '';
    
    appData.mainTopics.forEach(topic => {
        const topicDiv = document.createElement('div');
        topicDiv.className = 'topic-item';
        topicDiv.innerHTML = `
            <span>${topic.name}</span>
            <div class="topic-actions">
                <button class="edit-btn" onclick="editMainTopic(${topic.id})">ערוך</button>
                <button class="delete-btn" onclick="deleteMainTopic(${topic.id})">מחק</button>
            </div>
        `;
        mainTopicsList.appendChild(topicDiv);
    });
}

function renderTopicSelect() {
    const topicSelect = document.getElementById('topic-select');
    if (!topicSelect) return;
    
    topicSelect.innerHTML = '<option value="">בחר נושא ראשי</option>';
    
    appData.mainTopics.forEach(topic => {
        const option = document.createElement('option');
        option.value = topic.id;
        topicSelect.appendChild(option);
    });
}

// פונקציות מנהל נוספות
function addMainTopic() {
    const input = document.getElementById('new-main-topic');
    if (!input) return;
    
    const name = input.value.trim();
    
    if (name) {
        const newId = Math.max(...appData.mainTopics.map(t => t.id), 0) + 1;
        appData.mainTopics.push({
            id: newId,
            name: name,
            subTopics: []
        });
        
        input.value = '';
        saveDataToFirebase();
        renderMainTopics();
        renderAdminPanel();
        alert('נושא ראשי נוסף בהצלחה!');
    } else {
        alert('אנא הכנס שם לנושא');
    }
}

function editMainTopic(topicId) {
    const topic = appData.mainTopics.find(t => t.id === topicId);
    if (topic) {
        const newName = prompt('הכנס שם חדש:', topic.name);
        if (newName && newName.trim()) {
            topic.name = newName.trim();
            saveDataToFirebase();
            renderMainTopics();
            renderAdminPanel();
        }
    }
}

function saveMainTopic(topicId) {
    // פונקציה זו נקראת מה-HTML אבל לא מומשת במלואה
    console.log('שמירת נושא ראשי:', topicId);
}

function cancelEditMainTopic() {
    // פונקציה זו נקראת מה-HTML אבל לא מומשת במלואה
    console.log('ביטול עריכת נושא ראשי');
}

function deleteMainTopic(topicId) {
    if (confirm('האם אתה בטוח שברצונך למחוק את הנושא? כל תתי הנושאים יימחקו גם כן.')) {
        appData.mainTopics = appData.mainTopics.filter(t => t.id !== topicId);
        saveDataToFirebase();
        renderMainTopics();
        renderAdminPanel();
    }
}

function addSubTopic() {
    const topicSelect = document.getElementById('topic-select');
    const nameInput = document.getElementById('new-sub-topic');
    const linkInput = document.getElementById('new-drive-link');
    const ownerInput = document.getElementById('new-file-owner');
    
    if (!topicSelect || !nameInput) return;
    
    const topicId = parseInt(topicSelect.value);
    const name = nameInput.value.trim();
    const driveLink = linkInput ? linkInput.value.trim() : '';
    const fileOwner = ownerInput ? ownerInput.value.trim() : '';
    
    if (!topicId || isNaN(topicId)) {
        alert('אנא בחר נושא ראשי');
        return;
    }
    
    if (!name) {
        alert('אנא הכנס שם לתת נושא');
        nameInput.focus();
        return;
    }
    
    const topic = appData.mainTopics.find(t => t.id === topicId);
    if (!topic) {
        alert('שגיאה: נושא לא נמצא');
        return;
    }
    
    if (!topic.subTopics) {
        topic.subTopics = [];
    }
    
    const newId = getMaxSubTopicId() + 1;
    
    const newSubTopic = {
        id: newId,
        name: name,
        driveLink: driveLink,
        fileOwner: fileOwner,
        subTopics: []
    };
    
    topic.subTopics.push(newSubTopic);
    
    nameInput.value = '';
    if (linkInput) linkInput.value = '';
    if (ownerInput) ownerInput.value = '';
    
    saveDataToFirebase();
    renderAdminPanel();
    
    alert('תת נושא נוסף בהצלחה!');
}

function getMaxSubTopicId() {
    let maxId = 0;
    
    function searchInSubTopics(subTopics) {
        subTopics.forEach(subTopic => {
            if (subTopic.id > maxId) {
                maxId = subTopic.id;
            }
            if (subTopic.subTopics) {
                searchInSubTopics(subTopic.subTopics);
            }
        });
    }
    
    appData.mainTopics.forEach(topic => {
        if (topic.subTopics) {
            searchInSubTopics(topic.subTopics);
        }
    });
    
    return maxId;
}

function addNestedSubTopic(parentId) {
    console.log('הוספת תת נושא מקונן:', parentId);
}

function editSubTopic(subTopicId) {
    console.log('עריכת תת נושא:', subTopicId);
}

function saveSubTopic(topicId, subTopicId) {
    console.log('שמירת תת נושא:', topicId, subTopicId);
}

function cancelEditSubTopic() {
    console.log('ביטול עריכת תת נושא');
}

function deleteSubTopic(topicId, subTopicId) {
    console.log('מחיקת תת נושא:', topicId, subTopicId);
}

function toggleDragMode() {
    console.log('החלפת מצב גרירה');
}

function changeAdminPassword() {
    // פונקציה זו הוסרה - שינוי סיסמה מתבצע דרך Firebase Authentication
    console.log('ℹ️ שינוי סיסמה מתבצע דרך Firebase Authentication');
}

// הגדרת סיסמת מנהל ראשונית
async function setInitialAdminPassword() {
    if (!firebaseInitialized) return;
    
    try {
        const snapshot = await database.ref('adminPassword').once('value');
        if (!snapshot.exists()) {
            const hashedPassword = await hashPassword('n0987');
            await database.ref('adminPassword').set(hashedPassword);
            console.log('✅ סיסמת מנהל ראשונית נוצרה');
        }
    } catch (error) {
        console.error('❌ שגיאה ביצירת סיסמת מנהל:', error);
    }
}

// אירועי מקלדת
function setupKeyboardEvents() {
    // Enter בשדות התחברות
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    
    if (loginEmail) {
        loginEmail.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                if (loginPassword) loginPassword.focus();
            }
        });
    }
    
    if (loginPassword) {
        loginPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                loginUser();
            }
        });
    }
    
    // Enter בשדות הרשמה
    const registerConfirm = document.getElementById('register-confirm');
    if (registerConfirm) {
        registerConfirm.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                registerUser();
            }
        });
    }
    
    // Enter בשדה הערה
    const commentInput = document.getElementById('comment-input');
    if (commentInput) {
        commentInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addComment();
            }
        });
    }
    
    // Enter בהוספת נושא ראשי
    const newMainTopic = document.getElementById('new-main-topic');
    if (newMainTopic) {
        newMainTopic.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addMainTopic();
            }
        });
    }
    
    // Enter בהוספת תת נושא
    const newSubTopic = document.getElementById('new-sub-topic');
    if (newSubTopic) {
        newSubTopic.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const newDriveLink = document.getElementById('new-drive-link');
                if (newDriveLink) newDriveLink.focus();
            }
        });
    }
    
    const newDriveLink = document.getElementById('new-drive-link');
    if (newDriveLink) {
        newDriveLink.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const newFileOwner = document.getElementById('new-file-owner');
                if (newFileOwner) newFileOwner.focus();
            }
        });
    }
    
    const newFileOwner = document.getElementById('new-file-owner');
    if (newFileOwner) {
        newFileOwner.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addSubTopic();
            }
        });
    }
}

// אתחול האפליקציה
function initApp() {
    console.log('🚀 מאתחל אפליקציה...');
    updateExistingData();
    renderMainTopics();
    setupKeyboardEvents();
}

// אתחול כשהעמוד נטען
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 הדף נטען...');
    
    // אתחול מיידי של הפונקציות הגלובליות
    window.showAuthTab = showAuthTab;
    window.loginUser = loginUser;
    window.registerUser = registerUser;
    window.resetPassword = resetPassword;
    window.showForgotPassword = showForgotPassword;
    window.logoutUser = logoutUser;
    window.navigateBack = navigateBack;
    window.showAdminLogin = showAdminLogin;
    window.addComment = addComment;
    window.showMainScreen = showMainScreen;
    window.toggleDragMode = toggleDragMode;
    window.addMainTopic = addMainTopic;
    window.editMainTopic = editMainTopic;
    window.saveMainTopic = saveMainTopic;
    window.cancelEditMainTopic = cancelEditMainTopic;
    window.deleteMainTopic = deleteMainTopic;
    window.addSubTopic = addSubTopic;
    window.addNestedSubTopic = addNestedSubTopic;
    window.editSubTopic = editSubTopic;
    window.saveSubTopic = saveSubTopic;
    window.cancelEditSubTopic = cancelEditSubTopic;
    window.deleteSubTopic = deleteSubTopic;
    window.changeAdminPassword = changeAdminPassword;
    
    console.log('✅ פונקציות גלובליות הוגדרו');
    
    // אתחול Firebase וההתחלה
    setTimeout(() => {
        if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
            console.log('🔥 מאתחל Firebase...');
            const success = initFirebase();
            if (success) {
                setInitialAdminPassword();
            }
        } else {
            console.log('⚠️ Firebase לא מוגדר, עובד במצב מקומי');
            loadDataLocally();
            showAuthScreen();
        }
        
        // אתחול האפליקציה
        initApp();
    }, 500);
});

console.log('📝 script.js נטען בהצלחה');