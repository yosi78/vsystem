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
                { id: 2, name: "חונכות", driveLink: "", fileOwner: "", subTopics: [] },
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
    renderSubTopics();
}

// גרירה
function toggleDragMode() {
    isDragMode = !isDragMode;
    const toggleBtn = document.getElementById('drag-mode-toggle');
    const instructions = document.getElementById('drag-instructions');
    
    if (toggleBtn && instructions) {
        if (isDragMode) {
            toggleBtn.classList.add('active');
            toggleBtn.innerHTML = '🔒 צא ממצב גרירה';
            instructions.style.display = 'block';
        } else {
            toggleBtn.classList.remove('active');
            toggleBtn.innerHTML = '🔄 הפעל מצב גרירה';
            instructions.style.display = 'none';
        }
    }
    
    renderSubTopics();
    renderMainTopicsAdmin();
}

function setupDropZone(element, targetData) {
    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (draggedElement && draggedElement !== element) {
            element.classList.add('drag-over');
        }
    });
    
    element.addEventListener('dragleave', (e) => {
        element.classList.remove('drag-over');
    });
    
    element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.classList.remove('drag-over');
        
        if (!draggedData) return;
        
        const { subTopicId: draggedId, mainTopicId: draggedMainId, isMainTopic } = draggedData;
        const { subTopicId: targetId, mainTopicId: targetMainId, isNested, isMainTopic: targetIsMainTopic } = targetData;
        
        if (draggedId === targetId) return;
        
        if (isMainTopic && targetIsMainTopic) {
            moveMainTopic(draggedId, targetId);
        } else if (!isMainTopic && !targetIsMainTopic) {
            moveSubTopic(draggedId, draggedMainId, targetId, targetMainId, isNested);
        }
    });
}

function moveMainTopic(draggedId, targetId) {
    const draggedIndex = appData.mainTopics.findIndex(t => t.id === draggedId);
    const targetIndex = appData.mainTopics.findIndex(t => t.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // הסר את הנושא הנגרר
    const [draggedTopic] = appData.mainTopics.splice(draggedIndex, 1);
    
    // הוסף במקום החדש
    const newTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    appData.mainTopics.splice(newTargetIndex + 1, 0, draggedTopic);
    
    saveDataToFirebase();
    renderMainTopicsAdmin();
    renderTopicSelect();
    showSuccess('הנושא הועבר בהצלחה!');
}

function moveSubTopic(draggedId, draggedMainId, targetId, targetMainId, isNested) {
    const draggedTopic = removeSubTopicById(draggedMainId, draggedId);
    if (!draggedTopic) {
        showError('שגיאה: לא ניתן למצוא את הנושא הנגרר');
        return;
    }
    
    if (targetId && targetMainId) {
        if (isNested) {
            addSubTopicUnder(targetMainId, targetId, draggedTopic);
        } else {
            addSubTopicAfter(targetMainId, targetId, draggedTopic);
        }
    } else {
        const mainTopic = appData.mainTopics.find(t => t.id === targetMainId);
        if (mainTopic) {
            if (!mainTopic.subTopics) mainTopic.subTopics = [];
            mainTopic.subTopics.push(draggedTopic);
        }
    }
    
    saveDataToFirebase();
    renderParentSelect();
    renderSubTopics();
    showSuccess('הנושא הועבר בהצלחה!');
}

function removeSubTopicById(mainTopicId, subTopicId) {
    const mainTopic = appData.mainTopics.find(t => t.id === mainTopicId);
    if (!mainTopic) return null;
    
    function removeRecursively(subTopics) {
        for (let i = 0; i < subTopics.length; i++) {
            if (subTopics[i].id === subTopicId) {
                return subTopics.splice(i, 1)[0];
            }
            if (subTopics[i].subTopics) {
                const found = removeRecursively(subTopics[i].subTopics);
                if (found) return found;
            }
        }
        return null;
    }
    
    return removeRecursively(mainTopic.subTopics || []);
}

function addSubTopicUnder(mainTopicId, parentId, newSubTopic) {
    const mainTopic = appData.mainTopics.find(t => t.id === mainTopicId);
    if (!mainTopic) return;
    
    const parentSubTopic = findSubTopicById(mainTopic.subTopics || [], parentId);
    if (parentSubTopic) {
        if (!parentSubTopic.subTopics) {
            parentSubTopic.subTopics = [];
        }
        parentSubTopic.subTopics.push(newSubTopic);
    }
}

// פונקציות חסרות מהקובץ המקורי
function addSubTopicAfter(mainTopicId, targetId, newSubTopic) {
    const mainTopic = appData.mainTopics.find(t => t.id === mainTopicId);
    if (!mainTopic) return;
    
    if (!mainTopic.subTopics) mainTopic.subTopics = [];
    mainTopic.subTopics.push(newSubTopic);
}

// גרירת תתי נושאים מתוקנת
function setupDropZone(element, targetData) {
    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (draggedElement && draggedElement !== element) {
            element.classList.add('drag-over');
        }
    });
    
    element.addEventListener('dragleave', (e) => {
        element.classList.remove('drag-over');
    });
    
    element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.classList.remove('drag-over');
        
        if (!draggedData) return;
        
        if (draggedData.isMainTopic) return; // רק תתי נושאים
        
        const { subTopicId: draggedId, mainTopicId: draggedMainId } = draggedData;
        const { subTopicId: targetId, mainTopicId: targetMainId, isNested } = targetData;
        
        if (draggedId === targetId) return;
        
        moveSubTopic(draggedId, draggedMainId, targetId, targetMainId, isNested);
    });
}

// רינדור תתי נושאים מתוקן
function renderSubTopicsList(subTopics, container, mainTopicId, level = 0) {
    if (!subTopics) return;
    
    subTopics.forEach(subTopic => {
        if (editingSubTopic && editingSubTopic.id === subTopic.id) {
            const editDiv = document.createElement('div');
            editDiv.className = 'edit-form';
            if (level > 0) editDiv.className += ' nested';
            editDiv.innerHTML = `
                <h4>עריכת תת נושא</h4>
                <input type="text" class="add-input" id="edit-sub-topic-name-${subTopic.id}" value="${subTopic.name}" placeholder="שם תת נושא">
                <input type="text" class="add-input" id="edit-sub-topic-link-${subTopic.id}" value="${subTopic.driveLink || ''}" placeholder="קישור גוגל דרייב (אופציונלי)">
                <input type="text" class="add-input" id="edit-sub-topic-owner-${subTopic.id}" value="${subTopic.fileOwner || ''}" placeholder="שם בעל הקובץ (אופציונלי)">
                <div class="edit-actions">
                    <button class="save-btn" onclick="saveSubTopic(${mainTopicId}, ${subTopic.id})">שמור</button>
                    <button class="cancel-btn" onclick="cancelEditSubTopic()">ביטול</button>
                </div>
            `;
            container.appendChild(editDiv);
        } else {
            const subTopicDiv = document.createElement('div');
            subTopicDiv.className = 'topic-item';
            if (level > 0) subTopicDiv.className += ' nested';
            
            const hasSubTopics = subTopic.subTopics && subTopic.subTopics.length > 0;
            const hasLink = subTopic.driveLink && subTopic.driveLink.trim();
            
            let statusText = '';
            if (hasSubTopics && hasLink) {
                statusText = ' <span style="color: #28a745;">(קטגוריה + מסמך)</span>';
            } else if (hasSubTopics) {
                statusText = ' <span style="color: #007bff;">(קטגוריה)</span>';
            } else if (hasLink) {
                statusText = ' <span style="color: #17a2b8;">(מסמך)</span>';
            } else {
                statusText = ' <span style="color: #6c757d;">(ריק)</span>';
            }
            
            subTopicDiv.innerHTML = `
                <div>
                    <strong>${subTopic.name}</strong>${statusText}
                    ${hasLink ? '<br><small style="color: #007bff;">🔗 ' + subTopic.driveLink + '</small>' + (subTopic.fileOwner ? '<br><small style="color: #28a745;">👤 ' + subTopic.fileOwner + '</small>' : '') : ''}
                    ${hasSubTopics ? '<br><small style="color: #28a745;">📁 ' + subTopic.subTopics.length + ' תתי נושאים</small>' : ''}
                </div>
                <div class="topic-actions">
                    <button class="add-nested-btn" onclick="addNestedSubTopic(${subTopic.id})" title="הוסף תת נושא תחת ${subTopic.name}">הוסף תחת</button>
                    <button class="edit-btn" onclick="editSubTopic(${subTopic.id})" title="ערוך ${subTopic.name}">ערוך</button>
                    <button class="delete-btn" onclick="deleteSubTopic(${mainTopicId}, ${subTopic.id})" title="מחק ${subTopic.name}">מחק</button>
                </div>
            `;
            container.appendChild(subTopicDiv);
            
            // הוסף כפתור גרירה במצב גרירה
            if (isDragMode) {
                const dragHandle = document.createElement('button');
                dragHandle.className = 'drag-handle';
                dragHandle.innerHTML = '⋮⋮';
                dragHandle.title = 'גרור לשינוי מיקום';
                dragHandle.draggable = true;
                
                const actionsDiv = subTopicDiv.querySelector('.topic-actions');
                actionsDiv.insertBefore(dragHandle, actionsDiv.firstChild);
                
                // הגדר אירועי גרירה
                dragHandle.addEventListener('dragstart', (e) => {
                    draggedData = { subTopicId: subTopic.id, mainTopicId: mainTopicId, isMainTopic: false };
                    draggedElement = subTopicDiv;
                    draggedElement.classList.add('dragging');
                    e.dataTransfer.setData('text/plain', '');
                });
                
                dragHandle.addEventListener('dragend', (e) => {
                    if (draggedElement) {
                        draggedElement.classList.remove('dragging');
                    }
                    document.querySelectorAll('.topic-item, .drop-zone').forEach(item => {
                        item.classList.remove('drag-over');
                    });
                    draggedElement = null;
                    draggedData = null;
                });
                
                // הגדר אזור הטלה
                setupDropZone(subTopicDiv, { 
                    subTopicId: subTopic.id, 
                    mainTopicId: mainTopicId, 
                    isNested: true,
                    isMainTopic: false
                });
            }
            
            // רנדור תתי נושאים מקוננים
            if (hasSubTopics) {
                renderSubTopicsList(subTopic.subTopics, container, mainTopicId, level + 1);
            }
        }
    });
}

function renderMainTopicsAdmin() {
    const mainTopicsList = document.getElementById('main-topics-list');
    if (!mainTopicsList) return;
    
    mainTopicsList.innerHTML = '';
    
    appData.mainTopics.forEach(topic => {
        if (editingMainTopic && editingMainTopic.id === topic.id) {
            const editDiv = document.createElement('div');
            editDiv.className = 'edit-form';
            editDiv.innerHTML = `
                <h4>עריכת נושא ראשי</h4>
                <input type="text" class="add-input" id="edit-main-topic-${topic.id}" value="${topic.name}">
                <div class="edit-actions">
                    <button class="save-btn" onclick="saveMainTopic(${topic.id})">שמור</button>
                    <button class="cancel-btn" onclick="cancelEditMainTopic()">ביטול</button>
                </div>
            `;
            mainTopicsList.appendChild(editDiv);
        } else {
            const topicDiv = document.createElement('div');
            topicDiv.className = 'topic-item';
            
            const subTopicsCount = topic.subTopics ? topic.subTopics.length : 0;
            const statusText = subTopicsCount > 0 ? ` (${subTopicsCount} תתי נושאים)` : '';
            
            topicDiv.innerHTML = `
                <div>
                    <strong>${topic.name}</strong>${statusText}
                </div>
                <div class="topic-actions">
                    <button class="edit-btn" onclick="editMainTopic(${topic.id})">ערוך</button>
                    <button class="delete-btn" onclick="deleteMainTopic(${topic.id})">מחק</button>
                </div>
            `;
            
            // הוסף כפתור גרירה במצב גרירה
            if (isDragMode) {
                const dragHandle = document.createElement('button');
                dragHandle.className = 'drag-handle';
                dragHandle.innerHTML = '⋮⋮';
                dragHandle.title = 'גרור לשינוי סדר';
                dragHandle.draggable = true;
                
                const actionsDiv = topicDiv.querySelector('.topic-actions');
                actionsDiv.insertBefore(dragHandle, actionsDiv.firstChild);
                
                // הגדר אירועי גרירה
                dragHandle.addEventListener('dragstart', (e) => {
                    draggedData = { subTopicId: topic.id, isMainTopic: true };
                    draggedElement = topicDiv;
                    draggedElement.classList.add('dragging');
                    e.dataTransfer.setData('text/plain', '');
                });
                
                dragHandle.addEventListener('dragend', (e) => {
                    if (draggedElement) {
                        draggedElement.classList.remove('dragging');
                    }
                    document.querySelectorAll('.topic-item, .drop-zone').forEach(item => {
                        item.classList.remove('drag-over');
                    });
                    draggedElement = null;
                    draggedData = null;
                });
                
                // הגדר אזור הטלה
                setupDropZone(topicDiv, { 
                    subTopicId: topic.id, 
                    isMainTopic: true 
                });
            }
            
            mainTopicsList.appendChild(topicDiv);
        }
    });
}

function renderTopicSelect() {
    const topicSelect = document.getElementById('topic-select');
    if (!topicSelect) return;
    
    topicSelect.innerHTML = '<option value="">בחר נושא ראשי</option>';
    
    appData.mainTopics.forEach(topic => {
        const option = document.createElement('option');
        option.value = topic.id;
// רנדור בחירת נושא עליון
function renderParentSelect() {
    const topicSelect = document.getElementById('topic-select');
    const parentSelect = document.getElementById('parent-select');
    const parentSelector = document.getElementById('parent-selector');
    
    if (!topicSelect || !parentSelect || !parentSelector) return;
    
    const selectedTopicId = topicSelect.value;
    
    if (!selectedTopicId) {
        parentSelector.style.display = 'none';
        return;
    }
    
    parentSelector.style.display = 'block';
    parentSelect.innerHTML = '<option value="">ללא נושא עליון (רמה ראשונה)</option>';
    
    const topic = appData.mainTopics.find(t => t.id == selectedTopicId);
    if (topic && topic.subTopics) {
        populateParentOptions(topic.subTopics, parentSelect, '');
    }
    
    parentSelect.onchange = renderSubTopics;
}

// פונקציה רקורסיבית למילוי אופציות נושא עליון
function populateParentOptions(subTopics, selectElement, prefix) {
    subTopics.forEach(subTopic => {
        const option = document.createElement('option');
        option.value = subTopic.id;
        option.textContent = prefix + subTopic.name;
        selectElement.appendChild(option);
        
        if (subTopic.subTopics && subTopic.subTopics.length > 0) {
            populateParentOptions(subTopic.subTopics, selectElement, prefix + '  └─ ');
        }
    });
}

// פונקציה למציאת תת נושא לפי ID
function findSubTopicById(subTopics, id) {
    if (!subTopics) return null;
    
    for (let subTopic of subTopics) {
        if (subTopic.id == id) {
            return subTopic;
        }
        if (subTopic.subTopics) {
            const found = findSubTopicById(subTopic.subTopics, id);
            if (found) return found;
        }
    }
    return null;
}

// פונקציה למציאת תת נושא והורה שלו
function findSubTopicWithParent(subTopics, id, parent = null) {
    if (!subTopics) return null;
    
    for (let subTopic of subTopics) {
        if (subTopic.id == id) {
            return { subTopic, parent };
        }
        if (subTopic.subTopics) {
            const found = findSubTopicWithParent(subTopic.subTopics, id, subTopic);
            if (found) return found;
        }
    }
    return null;
}

function renderSubTopics() {
    const topicSelect = document.getElementById('topic-select');
    const parentSelect = document.getElementById('parent-select');
    const subTopicsList = document.getElementById('sub-topics-list');
    
    if (!topicSelect || !subTopicsList) return;
    
    subTopicsList.innerHTML = '';
    
    const selectedTopicId = topicSelect.value;
    if (!selectedTopicId) return;
    
    const topic = appData.mainTopics.find(t => t.id == selectedTopicId);
    if (!topic) return;
    
    const parentId = parentSelect ? parentSelect.value : '';
    let targetSubTopics;
    
    if (parentId) {
        const parentSubTopic = findSubTopicById(topic.subTopics || [], parentId);
        targetSubTopics = parentSubTopic ? (parentSubTopic.subTopics || []) : [];
    } else {
        targetSubTopics = topic.subTopics || [];
    }
    
    if (targetSubTopics.length > 0) {
        renderSubTopicsList(targetSubTopics, subTopicsList, topic.id, 0);
    } else {
        subTopicsList.innerHTML = '<div style="text-align: center; color: #6c757d; padding: 20px;">אין תתי נושאים להצגה</div>';
    }
    
    // הוסף אזור הטלה כללי במצב גרירה
    if (isDragMode && targetSubTopics.length > 0) {
        const dropZone = document.createElement('div');
        dropZone.className = 'drop-zone';
        dropZone.textContent = 'שחרר כאן כדי להוסיף לרמה הראשונה';
        
        setupDropZone(dropZone, { 
            subTopicId: null, 
            mainTopicId: parseInt(selectedTopicId), 
            isNested: false 
        });
        
        subTopicsList.appendChild(dropZone);
    }
}

function renderSubTopicsList(subTopics, container, mainTopicId, level = 0) {
    subTopics.forEach(subTopic => {
        if (editingSubTopic && editingSubTopic.id === subTopic.id) {
            const editDiv = document.createElement('div');
            editDiv.className = 'edit-form';
            if (level > 0) editDiv.className += ' nested';
            editDiv.innerHTML = `
                <h4>עריכת תת נושא</h4>
                <input type="text" class="add-input" id="edit-sub-topic-name-${subTopic.id}" value="${subTopic.name}" placeholder="שם תת נושא">
                <input type="text" class="add-input" id="edit-sub-topic-link-${subTopic.id}" value="${subTopic.driveLink || ''}" placeholder="קישור גוגל דרייב (אופציונלי)">
                <input type="text" class="add-input" id="edit-sub-topic-owner-${subTopic.id}" value="${subTopic.fileOwner || ''}" placeholder="שם בעל הקובץ (אופציונלי)">
                <div class="edit-actions">
                    <button class="save-btn" onclick="saveSubTopic(${mainTopicId}, ${subTopic.id})">שמור</button>
                    <button class="cancel-btn" onclick="cancelEditSubTopic()">ביטול</button>
                </div>
            `;
            container.appendChild(editDiv);
        } else {
            const subTopicDiv = document.createElement('div');
            subTopicDiv.className = 'topic-item';
            if (level > 0) subTopicDiv.className += ' nested';
            
            const hasSubTopics = subTopic.subTopics && subTopic.subTopics.length > 0;
            const hasLink = subTopic.driveLink && subTopic.driveLink.trim();
            
            let statusText = '';
            if (hasSubTopics && hasLink) {
                statusText = ' <span style="color: #28a745;">(קטגוריה + מסמך)</span>';
            } else if (hasSubTopics) {
                statusText = ' <span style="color: #007bff;">(קטגוריה)</span>';
            } else if (hasLink) {
                statusText = ' <span style="color: #17a2b8;">(מסמך)</span>';
            } else {
                statusText = ' <span style="color: #6c757d;">(ריק)</span>';
            }
            
            subTopicDiv.innerHTML = `
                <div>
                    <strong>${subTopic.name}</strong>${statusText}
                    ${hasLink ? '<br><small style="color: #007bff;">🔗 ' + subTopic.driveLink + '</small>' + (subTopic.fileOwner ? '<br><small style="color: #28a745;">👤 ' + subTopic.fileOwner + '</small>' : '') : ''}
                    ${hasSubTopics ? '<br><small style="color: #28a745;">📁 ' + subTopic.subTopics.length + ' תתי נושאים</small>' : ''}
                </div>
                <div class="topic-actions">
                    <button class="add-nested-btn" onclick="addNestedSubTopic(${subTopic.id})" title="הוסף תת נושא תחת ${subTopic.name}">הוסף תחת</button>
                    <button class="edit-btn" onclick="editSubTopic(${subTopic.id})" title="ערוך ${subTopic.name}">ערוך</button>
                    <button class="delete-btn" onclick="deleteSubTopic(${mainTopicId}, ${subTopic.id})" title="מחק ${subTopic.name}">מחק</button>
                </div>
            `;
            container.appendChild(subTopicDiv);
            
            // הוסף כפתור גרירה במצב גרירה
            if (isDragMode) {
                const dragHandle = document.createElement('button');
                dragHandle.className = 'drag-handle';
                dragHandle.innerHTML = '⋮⋮';
                dragHandle.title = 'גרור לשינוי מיקום';
                dragHandle.draggable = true;
                
                const actionsDiv = subTopicDiv.querySelector('.topic-actions');
                actionsDiv.insertBefore(dragHandle, actionsDiv.firstChild);
                
                // הגדר אירועי גרירה
                dragHandle.addEventListener('dragstart', (e) => {
                    draggedData = { subTopicId: subTopic.id, mainTopicId: mainTopicId, isMainTopic: false };
                    draggedElement = subTopicDiv;
                    draggedElement.classList.add('dragging');
                    e.dataTransfer.setData('text/plain', '');
                });
                
                dragHandle.addEventListener('dragend', (e) => {
                    if (draggedElement) {
                        draggedElement.classList.remove('dragging');
                    }
                    document.querySelectorAll('.topic-item, .drop-zone').forEach(item => {
                        item.classList.remove('drag-over');
                    });
                    draggedElement = null;
                    draggedData = null;
                });
                
                // הגדר אזור הטלה
                setupDropZone(subTopicDiv, { 
                    subTopicId: subTopic.id, 
                    mainTopicId: mainTopicId, 
                    isNested: true,
                    isMainTopic: false
                });
            }
            
            // רנדור תתי נושאים מקוננים
            if (hasSubTopics) {
                renderSubTopicsList(subTopic.subTopics, container, mainTopicId, level + 1);
            }
        }
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
        renderMainTopicsAdmin();
        renderTopicSelect();
        alert('נושא ראשי נוסף בהצלחה!');
    } else {
        alert('אנא הכנס שם לנושא');
    }
}

function deleteMainTopic(topicId) {
    const topic = appData.mainTopics.find(t => t.id === topicId);
    if (!topic) return;
    
    const hasSubTopics = topic.subTopics && topic.subTopics.length > 0;
    let confirmMessage = `האם אתה בטוח שברצונך למחוק את "${topic.name}"?`;
    
    if (hasSubTopics) {
        confirmMessage += `\n\nשים לב: הנושא מכיל ${topic.subTopics.length} תתי נושאים שגם יימחקו!`;
    }
    
    if (confirm(confirmMessage)) {
        appData.mainTopics = appData.mainTopics.filter(t => t.id !== topicId);
        saveDataToFirebase();
        renderMainTopics();
        renderMainTopicsAdmin();
        renderTopicSelect();
        showSuccess(`"${topic.name}" נמחק בהצלחה!`);
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

// פונקציות עריכה לנושאים ראשיים
function editMainTopic(topicId) {
    const topic = appData.mainTopics.find(t => t.id === topicId);
    if (topic) {
        editingMainTopic = topic;
        renderMainTopicsAdmin();
    }
}

function saveMainTopic(topicId) {
    const input = document.getElementById(`edit-main-topic-${topicId}`);
    if (!input) return;
    
    const newName = input.value.trim();
    if (newName) {
        const topic = appData.mainTopics.find(t => t.id === topicId);
        if (topic) {
            topic.name = newName;
            editingMainTopic = null;
            saveDataToFirebase();
            renderMainTopics();
            renderMainTopicsAdmin();
            renderTopicSelect();
            showSuccess('נושא ראשי עודכן בהצלחה!');
        }
    } else {
        showError('שם הנושא לא יכול להיות ריק');
    }
}

function cancelEditMainTopic() {
    editingMainTopic = null;
    renderMainTopicsAdmin();
}

// פונקציות עריכה לתתי נושאים
function editSubTopic(subTopicId) {
    const topicSelect = document.getElementById('topic-select');
    if (!topicSelect) return;
    
    const selectedTopicId = topicSelect.value;
    const topic = appData.mainTopics.find(t => t.id == selectedTopicId);
    
    if (topic) {
        const subTopic = findSubTopicById(topic.subTopics || [], subTopicId);
        if (subTopic) {
            editingSubTopic = subTopic;
            renderSubTopics();
        }
    }
}

function saveSubTopic(topicId, subTopicId) {
    const nameInput = document.getElementById(`edit-sub-topic-name-${subTopicId}`);
    const linkInput = document.getElementById(`edit-sub-topic-link-${subTopicId}`);
    const ownerInput = document.getElementById(`edit-sub-topic-owner-${subTopicId}`);
    
    if (!nameInput) return;
    
    const newName = nameInput.value.trim();
    const newLink = linkInput ? linkInput.value.trim() : '';
    const newOwner = ownerInput ? ownerInput.value.trim() : '';
    
    if (newName) {
        const topic = appData.mainTopics.find(t => t.id === topicId);
        if (topic) {
            const subTopic = findSubTopicById(topic.subTopics || [], subTopicId);
            
            if (subTopic) {
                subTopic.name = newName;
                subTopic.driveLink = newLink;
                subTopic.fileOwner = newOwner;
                editingSubTopic = null;
                
                saveDataToFirebase();
                renderParentSelect();
                renderSubTopics();
                showSuccess('תת הנושא עודכן בהצלחה!');
            }
        }
    } else {
        showError('שם תת הנושא לא יכול להיות ריק');
    }
}

function cancelEditSubTopic() {
    editingSubTopic = null;
    renderSubTopics();
}

function addNestedSubTopic(parentId) {
    const topicSelect = document.getElementById('topic-select');
    if (!topicSelect) return;
    
    const selectedTopicId = topicSelect.value;
    
    if (!selectedTopicId) {
        alert('אנא בחר נושא ראשי');
        return;
    }
    
    // מילוי אוטומטי של הנושא העליון
    const parentSelect = document.getElementById('parent-select');
    if (parentSelect) {
        parentSelect.value = parentId;
        renderSubTopics();
    }
    
    // מיקוד בשדה השם
    const newSubTopicInput = document.getElementById('new-sub-topic');
    if (newSubTopicInput) newSubTopicInput.focus();
    
    const parentSubTopic = findSubTopicById(appData.mainTopics.find(t => t.id == selectedTopicId).subTopics || [], parentId);
    if (parentSubTopic) {
        showSuccess('כעת תוכל להוסיף תת נושא תחת "' + parentSubTopic.name + '"');
    }
}

function deleteSubTopic(topicId, subTopicId) {
    const topic = appData.mainTopics.find(t => t.id === topicId);
    if (!topic) return;
    
    const result = findSubTopicWithParent(topic.subTopics || [], subTopicId);
    if (!result) return;
    
    const { subTopic, parent } = result;
    const hasSubTopics = subTopic.subTopics && subTopic.subTopics.length > 0;
    
    let confirmMessage = `האם אתה בטוח שברצונך למחוק את "${subTopic.name}"?`;
    if (hasSubTopics) {
        confirmMessage += `\n\nשים לב: הנושא הזה מכיל ${subTopic.subTopics.length} תתי נושאים שגם יימחקו!`;
    }
    
    if (confirm(confirmMessage)) {
        if (parent) {
            // מחיקה מתוך הורה
            parent.subTopics = parent.subTopics.filter(st => st.id !== subTopicId);
        } else {
            // מחיקה מהרמה הראשונה
            topic.subTopics = (topic.subTopics || []).filter(st => st.id !== subTopicId);
        }
        
        saveDataToFirebase();
        renderParentSelect();
        renderSubTopics();
        showSuccess(`"${subTopic.name}" נמחק בהצלחה!`);
    }
}

function toggleDragMode() {
    console.log('החלפת מצב גרירה');
}

// פונקציות עריכה לנושאים ראשיים - מתוקן מהקובץ המקורי
function editMainTopic(topicId) {
    const topic = appData.mainTopics.find(t => t.id === topicId);
    if (topic) {
        editingMainTopic = topic;
        renderMainTopicsAdmin();
    }
}

function saveMainTopic(topicId) {
    const input = document.getElementById(`edit-main-topic-${topicId}`);
    if (!input) return;
    
    const newName = input.value.trim();
    if (newName) {
        const topic = appData.mainTopics.find(t => t.id === topicId);
        if (topic) {
            topic.name = newName;
            editingMainTopic = null;
            saveDataToFirebase();
            renderMainTopics();
            renderMainTopicsAdmin();
            renderTopicSelect();
            showSuccess('נושא ראשי עודכן בהצלחה!');
        }
    } else {
        showError('שם הנושא לא יכול להיות ריק');
    }
}

function cancelEditMainTopic() {
    editingMainTopic = null;
    renderMainTopicsAdmin();
}

function deleteMainTopic(topicId) {
    const topic = appData.mainTopics.find(t => t.id === topicId);
    if (!topic) return;
    
    const hasSubTopics = topic.subTopics && topic.subTopics.length > 0;
    let confirmMessage = `האם אתה בטוח שברצונך למחוק את "${topic.name}"?`;
    
    if (hasSubTopics) {
        confirmMessage += `\n\nשים לב: הנושא מכיל ${topic.subTopics.length} תתי נושאים שגם יימחקו!`;
    }
    
    if (confirm(confirmMessage)) {
        appData.mainTopics = appData.mainTopics.filter(t => t.id !== topicId);
        saveDataToFirebase();
        renderMainTopics();
        renderMainTopicsAdmin();
        renderTopicSelect();
        showSuccess(`"${topic.name}" נמחק בהצלחה!`);
    }
}

// תיקון hashing ו-admin - הסרה מהקובץ החדש
function changeAdminPassword() {
    // פונקציה זו הוסרה - שינוי סיסמה מתבצע דרך Firebase Authentication
    console.log('ℹ️ שינוי סיסמה מתבצע דרך Firebase Authentication');
}

// הוספת setInitialAdminPassword מהקובץ המקורי
async function setInitialAdminPassword() {
    if (!firebaseInitialized) {
        console.error('Firebase לא מחובר - לא ניתן לשמור סיסמה');
        return;
    }
    
    try {
        // בדוק אם כבר יש סיסמה
        const snapshot = await database.ref('adminPassword').once('value');
        if (snapshot.exists()) {
            console.log('סיסמת מנהל כבר קיימת בבסיס הנתונים');
            return;
        }
        
        // הצפן ושמור את הסיסמה הקיימת
        const hashedPassword = await hashPassword('n0987');
        await database.ref('adminPassword').set(hashedPassword);
        console.log('סיסמת מנהל נשמרה בבסיס הנתונים בהצפנה');
        
    } catch (error) {
        console.error('שגיאה בשמירת סיסמת מנהל:', error);
    }
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