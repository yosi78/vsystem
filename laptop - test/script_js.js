// Submit Single Cart Loan
function submitSingleCartLoan() {
    const selectedCart = document.getElementById('cartSelect').value;
    
    if (!selectedCart || selectedComputers.length !== currentLoan.computerCount) {
        showError('אנא בחר עגלה ומספר המחשבים הנדרש');
        return;
    }
    
    // בדיקה שהמחשבים הנבחרים עדיין זמינים
    const occupiedNow = getOccupiedComputersMultiCart(selectedCart, currentLoan.loanDate, currentLoan.loanTime);
    const conflictingComputers = selectedComputers.filter(comp => occupiedNow.includes(comp));
    if (conflictingComputers.length > 0) {
        showError(`המחשבים הבאים כבר תפוסים: ${conflictingComputers.join(', ')}`);
        updateAvailableComputers(); // רענן את התצוגה
        return;
    }
    
    const baseLoan = {
        id: Date.now(),
        ...currentLoan,
        cart: selectedCart,
        computers: [...selectedComputers],
        returned: false,
        createdAt: new Date().toISOString()
    };

    if (currentLoan.isRecurring) {
        const recurringLoan = {
            ...baseLoan,
            type: 'recurring',
            dayOfWeek: new Date(currentLoan.loanDate).getDay()
        };
        
        systemData.recurringLoans.push(recurringLoan);
        systemData.loans.push(baseLoan);
        
        document.getElementById('successTitle').textContent = 'השאלה קבועה נוצרה!';
        document.getElementById('successMessage').textContent = `המחשבים הוקצו בהצלחה למורה.\n🔄 השאלה תחזור כל שבוע באותו יום ושעה.`;
    } else {
        systemData.loans.push(baseLoan);
        
        const returnTimeMsg = currentLoan.expectedReturnTime ? 
            `\nהחזרה מתוכננת: היום בשעה ${currentLoan.expectedReturnTime}` : '';
        
        document.getElementById('successTitle').textContent = 'השאלה אושרה!';
        document.getElementById('successMessage').textContent = `המחשבים הוקצו בהצלחה למורה.${returnTimeMsg}`;
    }
    
    saveToFirebase();
    showScreen('successScreen');
    
    // רענון נתונים מהענן אחרי השאלה
    setTimeout(() => {
        console.log('🔄 מרענן נתונים מהענן אחרי השאלה...');
        if (database && isConnected) {
            loadDataFromFirebase();
        }
    }, 1000);
}

// Submit Multi-Cart Loan
function submitMultiCartLoan() {
    if (selectedComputers.length !== currentLoan.computerCount) {
        showError('אנא בחר את מספר המחשבים הנדרש מהעגלות השונות');
        return;
    }
    
    // בדיקה שכל המחשבים הנבחרים עדיין זמינים
    let hasConflicts = false;
    const conflictingComputers = [];

    Object.keys(selectedCarts).forEach(cartId => {
        const occupiedNow = getOccupiedComputersMultiCart(cartId, currentLoan.loanDate, currentLoan.loanTime);
        const cartConflicts = selectedCarts[cartId].filter(comp => occupiedNow.includes(comp));
        
        if (cartConflicts.length > 0) {
            hasConflicts = true;
            conflictingComputers.push(...cartConflicts);
        }
    });

    if (hasConflicts) {
        showError(`המחשבים הבאים כבר תפוסים: ${conflictingComputers.join(', ')}`);
        setupMultiCartContainer(); // רענן את התצוגה
        return;
    }
    
    const cleanCartSelections = {};
    Object.keys(selectedCarts).forEach(cartId => {
        if (selectedCarts[cartId].length > 0) {
            cleanCartSelections[cartId] = [...selectedCarts[cartId]];
        }
    });
    
    const baseLoan = {
        id: Date.now(),
        ...currentLoan,
        cartSelections: cleanCartSelections,
        computers: [...selectedComputers],
        returned: false,
        createdAt: new Date().toISOString(),
        isMultiCart: true
    };

    if (currentLoan.isRecurring) {
        const recurringLoan = {
            ...baseLoan,
            type: 'recurring',
            dayOfWeek: new Date(currentLoan.loanDate).getDay()
        };
        
        systemData.recurringLoans.push(recurringLoan);
        systemData.loans.push(baseLoan);
        
        document.getElementById('successTitle').textContent = 'השאלה קבועה נוצרה!';
        document.getElementById('successMessage').textContent = `המחשבים הוקצו בהצלחה למורה מכמה עגלות.\n🔄 השאלה תחזור כל שבוע באותו יום ושעה.`;
    } else {
        systemData.loans.push(baseLoan);
        
        const returnTimeMsg = currentLoan.expectedReturnTime ? 
            `\nהחזרה מתוכננת: היום בשעה ${currentLoan.expectedReturnTime}` : '';
        
        document.getElementById('successTitle').textContent = 'השאלה אושרה!';
        document.getElementById('successMessage').textContent = `המחשבים הוקצו בהצלחה למורה מכמה עגלות.${returnTimeMsg}`;
    }
    
    saveToFirebase();
    showScreen('successScreen');
    
    // רענון נתונים מהענן אחרי השאלה רב-עגלות
    setTimeout(() => {
        console.log('🔄 מרענן נתונים מהענן אחרי השאלה רב-עגלות...');
        if (database && isConnected) {
            loadDataFromFirebase();
        }
    }, 1000);
}

// Submit Return
function submitReturn() {
    const returnDate = document.getElementById('returnDate').value;
    const returnTime = document.getElementById('returnTime').value;
    const returnNotes = document.getElementById('returnNotes').value;
    
    if (!selectedLoanForReturn || !returnDate || !returnTime) {
        showError('אנא בחר השאלה ומלא את כל השדות הנדרשים');
        return;
    }
    
    const loanIndex = systemData.loans.findIndex(l => l.id === selectedLoanForReturn.id);
    if (loanIndex !== -1) {
        systemData.loans[loanIndex].returned = true;
        systemData.loans[loanIndex].returnDate = returnDate;
        systemData.loans[loanIndex].returnTime = returnTime;
        systemData.loans[loanIndex].returnNotes = returnNotes;
        systemData.loans[loanIndex].returnedAt = new Date().toISOString();
    }
    
    saveToFirebase();
    
    document.getElementById('successTitle').textContent = 'החזרה אושרה!';
    document.getElementById('successMessage').textContent = `המחשבים של ${selectedLoanForReturn.teacherName} הוחזרו בהצלחה למערכת.`;
    showScreen('successScreen');
    
    // רענון נתונים מהענן אחרי החזרה
    setTimeout(() => {
        console.log('🔄 מרענן נתונים מהענן אחרי החזרה...');
        if (database && isConnected) {
            loadDataFromFirebase();
        }
    }, 1000);
    
    selectedLoanForReturn = null;
}

// Global functions for management buttons
window.returnSpecificLoan = returnSpecificLoan;
window.cancelFutureLoan = cancelFutureLoan;
window.cancelRecurringLoan = cancelRecurringLoan;
window.switchManagementTab = switchManagementTab;

// Global functions for configuration management
window.showAddTeacherForm = showAddTeacherForm;
window.editTeacher = editTeacher;
window.saveTeacher = saveTeacher;
window.deleteTeacher = deleteTeacher;
window.cancelTeacherForm = cancelTeacherForm;

window.showAddTimeForm = showAddTimeForm;
window.editTime = editTime;
window.saveTime = saveTime;
window.deleteTime = deleteTime;
window.cancelTimeForm = cancelTimeForm;

window.showAddCartForm = showAddCartForm;
window.editCart = editCart;
window.saveCart = saveCart;
window.deleteCart = deleteCart;
window.cancelCartForm = cancelCartForm;

window.loadComputersForCart = loadComputersForCart;
window.showAddComputerForm = showAddComputerForm;
window.editComputer = editComputer;
window.saveComputer = saveComputer;
window.deleteComputer = deleteComputer;
window.regenerateComputers = regenerateComputers;
window.cancelComputerForm = cancelComputerForm;

// Global functions for reports
window.exportReturnNotesToExcel = exportReturnNotesToExcel;
window.exportAllLoansToExcel = exportAllLoansToExcel;

// Event Listeners
function setupEventListeners() {
    // Main menu buttons
    document.getElementById('loanBtn').addEventListener('click', () => {
        showScreen('teacherScreen');
        currentLoan = {};
        selectedComputers = [];
        selectedCarts = {};
        isMultiCartMode = false;
        document.getElementById('isRecurringLoan').checked = false;
        updateRecurringLoanStatus();
    });
    
    document.getElementById('returnBtn').addEventListener('click', () => {
        showScreen('returnTeacherScreen');
        selectedLoanForReturn = null;
    });
    
    document.getElementById('managementBtn').addEventListener('click', showPasswordScreen);
    
    // Loan navigation buttons
    document.getElementById('backToMain1').addEventListener('click', () => showScreen('mainScreen'));
    document.getElementById('nextToDate').addEventListener('click', goToDateScreen);
    document.getElementById('backToTeacher').addEventListener('click', () => showScreen('teacherScreen'));
    document.getElementById('nextToComputer').addEventListener('click', goToComputerScreen);
    document.getElementById('backToDate').addEventListener('click', () => showScreen('dateScreen'));
    document.getElementById('submitLoan').addEventListener('click', submitLoan);
    
    // Return navigation buttons
    document.getElementById('backToMainFromReturn1').addEventListener('click', () => showScreen('mainScreen'));
    document.getElementById('nextToReturnLoanSelect').addEventListener('click', goToReturnLoanSelect);
    document.getElementById('backToReturnTeacher').addEventListener('click', () => showScreen('returnTeacherScreen'));
    document.getElementById('submitReturn').addEventListener('click', submitReturn);
    
    document.getElementById('backToMainSuccess').addEventListener('click', () => showScreen('mainScreen'));
    
    // Cart selection (single cart mode)
    document.getElementById('cartSelect').addEventListener('change', updateAvailableComputers);
    
    // Return form change events
    document.getElementById('returnDate').addEventListener('change', updateReturnSubmitButton);
    document.getElementById('returnTime').addEventListener('change', updateReturnSubmitButton);
    
    // Management screen events
    document.getElementById('backToMainFromPassword').addEventListener('click', () => showScreen('mainScreen'));
    document.getElementById('submitPassword').addEventListener('click', checkPassword);
    document.getElementById('backToMainFromManagement').addEventListener('click', () => showScreen('mainScreen'));
    document.getElementById('refreshManagement').addEventListener('click', () => {
        loadDataFromFirebase();
        updateManagementData();
    });
    
    // Password screen - Enter key support
    document.getElementById('adminPassword').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkPassword();
        }
    });

    // Recurring loan checkbox
    document.getElementById('isRecurringLoan').addEventListener('change', updateRecurringLoanStatus);
}

// Initialize System
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 מאתחל מערכת משופרת...');
    
    // Initialize default configuration
    systemData.config = { ...defaultConfig };
    systemData.carts = initializeCartData();
    
    // Set default dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const today = new Date().toISOString().split('T')[0];
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekStr = lastWeek.toISOString().split('T')[0];
    
    document.getElementById('loanDate').value = tomorrowStr;
    document.getElementById('returnDate').value = today;
    
    // הגדרת תאריכי ברירת מחדל לדוחות
    document.getElementById('reportDateFrom').value = lastWeekStr;
    document.getElementById('reportDateTo').value = today;
    
    // Populate initial selectors
    populateAllSelectors();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize Firebase
    initFirebase();
    
    console.log('✅ המערכת המשופרת מוכנה לשימוש - כולל ניהול תצורה מלא ודוחות');
});}

// Cancel Future Loan
function cancelFutureLoan(loanId) {
    const loan = systemData.loans.find(loan => loan.id == loanId);
    
    if (!loan) {
        alert('❌ השאלה לא נמצאה!');
        return;
    }
    
    const currentDate = new Date().toISOString().split('T')[0];
    if (loan.loanDate <= currentDate) {
        alert('❌ ניתן לבטל רק השאלות עתידיות!');
        return;
    }
    
    const computerCount = loan.computers ? loan.computers.length : 
                       (loan.cartSelections ? Object.values(loan.cartSelections).reduce((sum, arr) => sum + arr.length, 0) : 0);
    
    const confirm = window.confirm(`⚠️ האם לבטל את ההשאלה של ${loan.teacherName}?\n\nפרטי ההשאלה:\n📅 תאריך: ${loan.loanDate}\n⏰ שעה: ${loan.loanTime}\n🖥️ מחשבים: ${computerCount}\n\nההשאלה תימחק לחלוטין מהמערכת.`);
    
    if (!confirm) return;
    
    try {
        deleteLoanFromFirebase(loanId)
            .then(() => {
                updateManagementData();
                alert(`✅ בוטלה בהצלחה!\n\nההשאלה של ${loan.teacherName} בוטלה.\n${computerCount} מחשבים שוחררו.`);
                console.log(`✅ בוטלה השאלה: ${loan.teacherName} - ${computerCount} מחשבים`);
            })
            .catch((error) => {
                console.error('❌ שגיאה בביטול ההשאלה:', error);
                alert('❌ שגיאה בביטול ההשאלה. נסה שוב.');
            });
    } catch (error) {
        console.error('❌ שגיאה בביטול השאלה:', error);
        alert('❌ שגיאה בביטול ההשאלה. נסה שוב.');
    }
}

// Cancel Recurring Loan
function cancelRecurringLoan(recurringLoanId) {
    const recurringLoan = systemData.recurringLoans.find(loan => loan.id == recurringLoanId);
    
    if (!recurringLoan) {
        alert('❌ השאלה קבועה לא נמצאה!');
        return;
    }
    
    const computerCount = recurringLoan.computers ? recurringLoan.computers.length : 
                       (recurringLoan.cartSelections ? Object.values(recurringLoan.cartSelections).reduce((sum, arr) => sum + arr.length, 0) : 0);
    
    const dayName = getHebrewDayName(recurringLoan.loanDate);
    
    const confirm = window.confirm(`⚠️ האם לבטל את ההשאלה הקבועה של ${recurringLoan.teacherName}?\n\n📋 פרטי ההשאלה:\n📅 כל יום ${dayName}\n⏰ שעה: ${recurringLoan.loanTime}\n🖥️ מחשבים: ${computerCount}\n\n⚠️ זה יבטל את ההשאלה הקבועה לכל השבועות הבאים!`);
    
    if (!confirm) return;
    
    try {
        deleteRecurringLoanFromFirebase(recurringLoanId)
            .then(() => {
                updateManagementData();
                alert(`✅ השאלה קבועה בוטלה!\n\nההשאלה הקבועה של ${recurringLoan.teacherName} בוטלה.\n${computerCount} מחשבים שוחררו בכל יום ${dayName}.`);
                console.log(`✅ בוטלה השאלה קבועה: ${recurringLoan.teacherName} - ${dayName}`);
            })
            .catch((error) => {
                console.error('❌ שגיאה בביטול ההשאלה הקבועה:', error);
                alert('❌ שגיאה בביטול ההשאלה הקבועה. נסה שוב.');
            });
    } catch (error) {
        console.error('❌ שגיאה בביטול השאלה קבועה:', error);
        alert('❌ שגיאה בביטול ההשאלה הקבועה. נסה שוב.');
    }
}

// Management Functions
function showPasswordScreen() {
    document.getElementById('adminPassword').value = '';
    showScreen('passwordScreen');
}

function checkPassword() {
    const password = document.getElementById('adminPassword').value;
    if (password === 'n0987') {
        showManagementScreen();
    } else {
        showError('סיסמה שגויה! נסי שוב.');
        document.getElementById('adminPassword').value = '';
    }
}

function showManagementScreen() {
    switchManagementTab('overview');
    showScreen('managementScreen');
}

function updateManagementData() {
    updateGeneralStats();
    updateCurrentLoans();
    updateRecurringLoans();
    updateFutureLoans();
    updateCartStatus();
}

function updateGeneralStats() {
    const totalComputers = Object.values(systemData.carts).reduce((sum, cart) => sum + cart.computers.length, 0);
    const currentDate = new Date().toISOString().split('T')[0];
    
    const loanedToday = systemData.loans.filter(loan => 
        loan.loanDate <= currentDate && !loan.returned
    );
    
    let loanedComputersCount = 0;
    loanedToday.forEach(loan => {
        if (loan.computers) {
            loanedComputersCount += loan.computers.length;
        } else if (loan.cartSelections) {
            loanedComputersCount += Object.values(loan.cartSelections).reduce((sum, arr) => sum + arr.length, 0);
        }
    });
    
    const availableComputers = totalComputers - loanedComputersCount;
    
    document.getElementById('totalComputers').textContent = totalComputers;
    document.getElementById('loanedComputers').textContent = loanedComputersCount;
    document.getElementById('availableComputers').textContent = availableComputers;
}

function updateCurrentLoans() {
    const currentDate = new Date().toISOString().split('T')[0];
    const currentLoans = systemData.loans.filter(loan => 
        loan.loanDate <= currentDate && !loan.returned && loan.type !== 'return'
    );
    
    const container = document.getElementById('currentLoans');
    
    if (currentLoans.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #999; font-style: italic;">אין השאלות פעילות כרגע</div>';
        return;
    }
    
    let html = '';
    currentLoans.forEach(loan => {
        const computerCount = loan.computers ? loan.computers.length : 
                           (loan.cartSelections ? Object.values(loan.cartSelections).reduce((sum, arr) => sum + arr.length, 0) : 0);
        
        const cartInfo = loan.cart ? systemData.carts[loan.cart]?.name || loan.cart :
                       loan.cartSelections ? Object.keys(loan.cartSelections).map(cartId => systemData.carts[cartId]?.name || cartId).join(', ') : 'לא ידוע';
        
        const computerDetails = loan.computers ? 
            `מחשבים: ${loan.computers.slice(0, 5).join(', ')}${loan.computers.length > 5 ? ` ו-${loan.computers.length - 5} נוספים...` : ''}` :
            loan.cartSelections ? 
            `מחשבים מכמה עגלות: ${Object.entries(loan.cartSelections).map(([cartId, computers]) => 
                `${systemData.carts[cartId]?.name || cartId} (${computers.length})`).join(', ')}` : '';
        
        html += `
            <div class="loan-management-item current">
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: #333;">👩‍🏫 ${loan.teacherName} - כיתה ${loan.teacherClass}</div>
                    <div style="font-size: 0.9em; color: #666;">
                        📅 ${loan.loanDate} • ⏰ ${loan.loanTime} • 🖥️ ${computerCount} מחשבים • 🛒 ${cartInfo}
                    </div>
                    ${computerDetails ? `
                        <div style="font-size: 0.8em; color: #999; margin-top: 5px;">
                            ${computerDetails}
                        </div>
                    ` : ''}
                </div>
                <button onclick="returnSpecificLoan('${loan.id}')" class="btn-danger">
                    ✅ החזר
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updateRecurringLoans() {
    const container = document.getElementById('recurringLoans');
    
    if (systemData.recurringLoans.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #999; font-style: italic;">אין השאלות קבועות</div>';
        return;
    }
    
    let html = '';
    systemData.recurringLoans.filter(loan => !loan.cancelled).forEach(recurringLoan => {
        const computerCount = recurringLoan.computers ? recurringLoan.computers.length : 
                           (recurringLoan.cartSelections ? Object.values(recurringLoan.cartSelections).reduce((sum, arr) => sum + arr.length, 0) : 0);
        
        const cartInfo = recurringLoan.cart ? systemData.carts[recurringLoan.cart]?.name || recurringLoan.cart :
                       recurringLoan.cartSelections ? Object.keys(recurringLoan.cartSelections).map(cartId => systemData.carts[cartId]?.name || cartId).join(', ') : 'לא ידוע';
        
        const dayName = getHebrewDayName(recurringLoan.loanDate);
        
        const computerDetails = recurringLoan.computers ? 
            `מחשבים: ${recurringLoan.computers.slice(0, 5).join(', ')}${recurringLoan.computers.length > 5 ? ` ו-${recurringLoan.computers.length - 5} נוספים...` : ''}` :
            recurringLoan.cartSelections ? 
            `מחשבים מכמה עגלות: ${Object.entries(recurringLoan.cartSelections).map(([cartId, computers]) => 
                `${systemData.carts[cartId]?.name || cartId} (${computers.length})`).join(', ')}` : '';
        
        html += `
            <div class="loan-management-item recurring">
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: #333;">👩‍🏫 ${recurringLoan.teacherName} - כיתה ${recurringLoan.teacherClass}</div>
                    <div style="font-size: 0.9em; color: #666;">
                        🔄 כל יום ${dayName} • ⏰ ${recurringLoan.loanTime} • 🖥️ ${computerCount} מחשבים • 🛒 ${cartInfo}
                    </div>
                    ${computerDetails ? `
                        <div style="font-size: 0.8em; color: #999; margin-top: 5px;">
                            ${computerDetails}
                        </div>
                    ` : ''}
                    <div style="font-size: 0.8em; color: #7b1fa2; margin-top: 5px; font-weight: bold;">
                        🔄 השאלה קבועה - חוזרת כל שבוע
                    </div>
                </div>
                <button onclick="cancelRecurringLoan('${recurringLoan.id}')" class="btn-danger">
                    ❌ בטל קבועה
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updateFutureLoans() {
    const currentDate = new Date().toISOString().split('T')[0];
    const futureLoans = systemData.loans.filter(loan => 
        loan.loanDate > currentDate && loan.type !== 'return'
    ).sort((a, b) => new Date(a.loanDate) - new Date(b.loanDate));
    
    const container = document.getElementById('futureLoans');
    
    if (futureLoans.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #999; font-style: italic;">אין השאלות מתוכננות</div>';
        return;
    }
    
    let html = '';
    futureLoans.forEach(loan => {
        const computerCount = loan.computers ? loan.computers.length : 
                           (loan.cartSelections ? Object.values(loan.cartSelections).reduce((sum, arr) => sum + arr.length, 0) : loan.computerCount || 0);
        
        const cartInfo = loan.cart ? systemData.carts[loan.cart]?.name || loan.cart :
                       loan.cartSelections ? Object.keys(loan.cartSelections).map(cartId => systemData.carts[cartId]?.name || cartId).join(', ') : 'לא ידוע';
        
        const loanDate = new Date(loan.loanDate);
        const today = new Date();
        const daysUntil = Math.ceil((loanDate - today) / (1000 * 60 * 60 * 24));
        
        html += `
            <div class="loan-management-item future">
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: #333;">👩‍🏫 ${loan.teacherName} - כיתה ${loan.teacherClass}</div>
                    <div style="font-size: 0.9em; color: #666;">
                        📅 ${loan.loanDate} (בעוד ${daysUntil} ימים) • ⏰ ${loan.loanTime} • 🖥️ ${computerCount} מחשבים • 🛒 ${cartInfo}
                    </div>
                </div>
                <button onclick="cancelFutureLoan('${loan.id}')" class="btn-danger">
                    ❌ בטל
                </button>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function updateCartStatus() {
    const container = document.getElementById('cartStatus');
    const currentDate = new Date().toISOString().split('T')[0];
    
    let html = '';
    Object.keys(systemData.carts).forEach(cartId => {
        const cart = systemData.carts[cartId];
        
        let loanedComputers = 0;
        systemData.loans.filter(loan => loan.loanDate <= currentDate && !loan.returned).forEach(loan => {
            if (loan.cart === cartId) {
                loanedComputers += loan.computers ? loan.computers.length : 0;
            } else if (loan.cartSelections && loan.cartSelections[cartId]) {
                loanedComputers += loan.cartSelections[cartId].length;
            }
        });
        
        const availableComputers = cart.computers.length - loanedComputers;
        const usagePercentage = Math.round((loanedComputers / cart.computers.length) * 100);
        
        const cartLoans = systemData.loans.filter(loan => 
            loan.loanDate <= currentDate && !loan.returned && 
            (loan.cart === cartId || (loan.cartSelections && loan.cartSelections[cartId]))
        );
        
        html += `
            <div style="background: white; padding: 12px; margin: 8px 0; border-radius: 5px; border-right: 4px solid #9c27b0;">
                <div style="font-weight: bold; color: #333; margin-bottom: 8px;">🛒 ${cart.name}</div>
                <div style="display: flex; justify-content: space-between; font-size: 0.9em;">
                    <div>📦 סה"כ: ${cart.computers.length}</div>
                    <div style="color: #f44336;">🔄 מושאלים: ${loanedComputers}</div>
                    <div style="color: #4caf50;">✅ זמינים: ${availableComputers}</div>
                </div>
                <div style="background: #f5f5f5; height: 8px; border-radius: 4px; margin-top: 8px; overflow: hidden;">
                    <div style="background: ${usagePercentage > 80 ? '#f44336' : usagePercentage > 50 ? '#ff9800' : '#4caf50'}; height: 100%; width: ${usagePercentage}%; transition: width 0.3s;"></div>
                </div>
                <div style="font-size: 0.8em; color: #666; margin-top: 4px;">${usagePercentage}% בשימוש</div>
                
                ${cartLoans.length > 0 ? `
                    <div style="margin-top: 10px; font-size: 0.8em;">
                        <strong>מושאל כרגע ל:</strong>
                        ${cartLoans.map(loan => {
                            const computerCount = loan.cart === cartId ? 
                                (loan.computers ? loan.computers.length : 0) :
                                (loan.cartSelections && loan.cartSelections[cartId] ? loan.cartSelections[cartId].length : 0);
                            return `<div style="color: #666;">• ${loan.teacherName} (${computerCount} מחשבים)</div>`;
                        }).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function returnSpecificLoan(loanId) {
    const loanIndex = systemData.loans.findIndex(loan => loan.id == loanId);
    
    if (loanIndex === -1) {
        alert('❌ השאלה לא נמצאה!');
        return;
    }
    
    const loan = systemData.loans[loanIndex];
    
    const computerCount = loan.computers ? loan.computers.length : 
                       (loan.cartSelections ? Object.values(loan.cartSelections).reduce((sum, arr) => sum + arr.length, 0) : 0);
    
    const confirm = window.confirm(`⚠️ האם לסמן את ההשאלה של ${loan.teacherName} כהוחזרה?\n\n${computerCount} מחשבים ישוחררו.`);
    
    if (!confirm) return;
    
    try {
        const currentDate = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5);
        
        systemData.loans[loanIndex].returned = true;
        systemData.loans[loanIndex].returnDate = currentDate;
        systemData.loans[loanIndex].returnTime = currentTime;
        systemData.loans[loanIndex].returnNotes = 'החזרה ממסך ניהול';
        systemData.loans[loanIndex].returnedAt = new Date().toISOString();
        
        saveToFirebase();
        updateManagementData();
        
        alert(`✅ הושלם!\n\nההשאלה של ${loan.teacherName} סומנה כהוחזרה.\n${computerCount} מחשבים שוחררו.`);
        console.log(`✅ הוחזרה השאלה: ${loan.teacherName} - ${computerCount} מחשבים`);
        
    } catch (error) {
        console.error('❌ שגיאה בהחזרת השאלה:', error);
        alert('❌ שגיאה בהחזרת ההשאלה. נסה שוב.');
    }
}

// Navigation Functions
function goToDateScreen() {
    const teacherName = document.getElementById('teacherName').value;
    const teacherClass = document.getElementById('teacherClass').value;
    
    if (!teacherName || !teacherClass) {
        showError('אנא בחר מורה וכיתה');
        return;
    }
    
    currentLoan.teacherName = teacherName;
    currentLoan.teacherClass = teacherClass;
    
    showScreen('dateScreen');
}

function goToComputerScreen() {
    const loanDate = document.getElementById('loanDate').value;
    const loanTime = document.getElementById('loanTime').value;
    const computerCount = document.getElementById('computerCount').value;
    const expectedReturnTime = document.getElementById('expectedReturnTime').value;
    const isRecurring = document.getElementById('isRecurringLoan').checked;
    
    if (!loanDate || !loanTime || !computerCount || !expectedReturnTime) {
        showError('אנא מלא את כל השדות');
        return;
    }

    if (isRecurring) {
        const dayName = getHebrewDayName(loanDate);
        const conflictingRecurring = getConflictingRecurringLoans(loanDate, loanTime);
        
        if (conflictingRecurring.length > 0) {
            const conflictNames = conflictingRecurring.map(r => r.teacherName).join(', ');
            showError(`⚠️ כבר קיימת השאלה קבועה ביום ${dayName} בשעה ${loanTime} עבור: ${conflictNames}`);
            return;
        }
        
        const confirm = window.confirm(`🔄 השאלה קבועה - אישור\n\nאת עומדת ליצור השאלה קבועה עבור ${currentLoan.teacherName}:\n📅 כל יום ${dayName}\n⏰ שעה ${loanTime}\n🖥️ ${computerCount} מחשבים\n\nהמחשבים יהיו תפוסים בכל שבוע!\n\nהאם להמשיך?`);
        
        if (!confirm) {
            return;
        }
    }
    
    currentLoan.loanDate = loanDate;
    currentLoan.loanTime = loanTime;
    currentLoan.computerCount = parseInt(computerCount);
    currentLoan.expectedReturnTime = expectedReturnTime;
    currentLoan.isRecurring = isRecurring;
    
    selectedComputers = [];
    selectedCarts = {};
    
    if (checkMultiCartMode()) {
        showScreen('computerScreen');
    }
}

function goToReturnLoanSelect() {
    const teacherName = document.getElementById('returnTeacher').value;
    
    if (!teacherName) {
        showError('אנא בחר מורה');
        return;
    }
    
    document.getElementById('selectedTeacherName').textContent = teacherName;
    loadActiveLoansForReturn(teacherName);
    showScreen('returnLoanSelectScreen');
}

// Submit Loan
function submitLoan() {
    if (isMultiCartMode) {
        submitMultiCartLoan();
    } else {
        submitSingleCartLoan();
    }
}// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDf8rGwU7ESEyHLE1L_Th-sAFKAeLmBCuQ",
    authDomain: "laptop-loan.firebaseapp.com",
    databaseURL: "https://laptop-loan-default-rtdb.firebaseio.com",
    projectId: "laptop-loan",
    storageBucket: "laptop-loan.firebasestorage.app",
    messagingSenderId: "332408448005",
    appId: "1:332408448005:web:fb8d89d59ffd0f240b286c"
}

// Setup Single Cart Mode
function setupSingleCartMode() {
    isMultiCartMode = false;
    document.getElementById('singleCartSelection').style.display = 'block';
    document.getElementById('multiCartSelection').style.display = 'none';
    
    const cartSelect = document.getElementById('cartSelect');
    cartSelect.innerHTML = '<option value="">בחרי עגלה...</option>';
    
    const requiredCount = currentLoan.computerCount || 0;
    const date = currentLoan.loanDate;
    const requestedTime = currentLoan.loanTime;
    
    Object.keys(systemData.carts).forEach(cartId => {
        const available = getCartAvailabilityForDate(cartId, date, requestedTime);
        if (available >= requiredCount) {
            const option = document.createElement('option');
            option.value = cartId;
            option.textContent = `${systemData.carts[cartId].name} (${available} זמינים)`;
            cartSelect.appendChild(option);
        }
    });
}

// Setup Multi-Cart Mode
function setupMultiCartMode() {
    isMultiCartMode = true;
    selectedCarts = {};
    selectedComputers = [];
    
    document.getElementById('singleCartSelection').style.display = 'none';
    document.getElementById('multiCartSelection').style.display = 'block';
    
    const requiredCount = currentLoan.computerCount || 0;
    document.getElementById('multiRequiredCount').textContent = requiredCount;
    
    setupMultiCartContainer();
}

// Setup Multi-Cart Container
function setupMultiCartContainer() {
    const container = document.getElementById('multiCartContainer');
    container.innerHTML = '';
    
    const date = currentLoan.loanDate;
    const requestedTime = currentLoan.loanTime;
    
    Object.keys(systemData.carts).forEach(cartId => {
        const cart = systemData.carts[cartId];
        const available = getCartAvailabilityForDate(cartId, date, requestedTime);
        
        if (available === 0) return;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-selection-item';
        cartItem.setAttribute('data-cart-id', cartId);
        
        cartItem.innerHTML = `
            <div class="cart-header">
                <div class="cart-name">${cart.name}</div>
                <div class="cart-availability">${available} זמינים</div>
            </div>
            <div class="cart-computers-input" id="computers-${cartId}">
                <label>בחר מחשבים מעגלה זו:</label>
                <div class="computer-grid" id="grid-${cartId}"></div>
            </div>
        `;
        
        cartItem.addEventListener('click', (e) => {
            if (e.target.closest('.computer-grid') || e.target.closest('.computer-label')) {
                return;
            }
            toggleCartSelection(cartId, cartItem);
        });
        
        container.appendChild(cartItem);
    });
}

// Toggle Cart Selection
function toggleCartSelection(cartId, element) {
    const computersInput = element.querySelector('.cart-computers-input');
    const isCurrentlySelected = element.classList.contains('selected');
    
    if (isCurrentlySelected) {
        element.classList.remove('selected');
        computersInput.classList.remove('show');
        delete selectedCarts[cartId];
        
        selectedComputers = selectedComputers.filter(comp => !comp.startsWith(systemData.carts[cartId].computers[0].split('-')[0]));
    } else {
        element.classList.add('selected');
        computersInput.classList.add('show');
        selectedCarts[cartId] = [];
        setupCartComputerGrid(cartId);
    }
    
    updateMultiComputerCount();
    updateSubmitButton();
}

// Setup Cart Computer Grid
function setupCartComputerGrid(cartId) {
    const grid = document.getElementById(`grid-${cartId}`);
    grid.innerHTML = '';
    
    const cart = systemData.carts[cartId];
    const occupiedComputers = getOccupiedComputersMultiCart(cartId, currentLoan.loanDate, currentLoan.loanTime);
    
    cart.computers.forEach(computer => {
        const isOccupied = occupiedComputers.includes(computer);
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `multi-${computer}`;
        checkbox.className = 'computer-checkbox';
        checkbox.value = computer;
        checkbox.disabled = isOccupied;
        checkbox.setAttribute('data-cart', cartId);
        
        const label = document.createElement('label');
        label.htmlFor = `multi-${computer}`;
        label.className = 'computer-label';
        label.textContent = computer;
        
        grid.appendChild(checkbox);
        grid.appendChild(label);
        
        checkbox.addEventListener('change', () => updateMultiCartComputerSelection(cartId, computer, checkbox.checked));
    });
}

// Update Multi-Cart Computer Selection
function updateMultiCartComputerSelection(cartId, computer, isSelected) {
    if (isSelected) {
        if (!selectedCarts[cartId].includes(computer)) {
            selectedCarts[cartId].push(computer);
            selectedComputers.push(computer);
        }
    } else {
        selectedCarts[cartId] = selectedCarts[cartId].filter(c => c !== computer);
        selectedComputers = selectedComputers.filter(c => c !== computer);
    }
    
    updateMultiComputerCount();
    updateSubmitButton();
}

// Update Multi Computer Count
function updateMultiComputerCount() {
    const selectedCount = selectedComputers.length;
    const requiredCount = currentLoan.computerCount || 0;
    
    const countInfo = document.getElementById('multiComputerCountInfo');
    if (countInfo) {
        countInfo.innerHTML = `נבחרו: ${selectedCount} מתוך <span id="multiRequiredCount">${requiredCount}</span>`;
    }
}

// Update Available Computers (Single Cart Mode)
function updateAvailableComputers() {
    const selectedCart = document.getElementById('cartSelect').value;
    const computerSection = document.getElementById('computerSection');
    const computerGrid = document.getElementById('computerGrid');
    
    if (!selectedCart) {
        computerSection.style.display = 'none';
        return;
    }
    
    computerSection.style.display = 'block';
    computerGrid.innerHTML = '';
    selectedComputers = [];
    
    const cartData = systemData.carts[selectedCart];
    const occupiedComputers = getOccupiedComputersMultiCart(selectedCart, currentLoan.loanDate, currentLoan.loanTime);
    
    if (cartData && cartData.computers) {
        cartData.computers.forEach(computer => {
            const isOccupied = occupiedComputers.includes(computer);
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = computer;
            checkbox.className = 'computer-checkbox';
            checkbox.value = computer;
            checkbox.disabled = isOccupied;
            
            const label = document.createElement('label');
            label.htmlFor = computer;
            label.className = 'computer-label';
            label.textContent = computer;
            
            computerGrid.appendChild(checkbox);
            computerGrid.appendChild(label);
            
            checkbox.addEventListener('change', updateSelectedComputers);
        });
    }
    
    updateSelectedCount();
}

// Update Selected Computers (Single Cart Mode)
function updateSelectedComputers() {
    const checkboxes = document.querySelectorAll('#computerGrid .computer-checkbox:checked');
    selectedComputers = Array.from(checkboxes).map(cb => cb.value);
    updateSelectedCount();
    updateSubmitButton();
}

// Update Selected Count (Single Cart Mode)
function updateSelectedCount() {
    const selectedCount = selectedComputers.length;
    const requiredCount = currentLoan.computerCount || 0;
    
    const countInfo = document.getElementById('computerCountInfo');
    if (countInfo) {
        countInfo.innerHTML = `נבחרו: ${selectedCount} מתוך <span id="requiredCount">${requiredCount}</span>`;
    }
}

// Update Submit Button
function updateSubmitButton() {
    const submitBtn = document.getElementById('submitLoan');
    if (!submitBtn) return;
    
    const selectedCount = selectedComputers.length;
    const requiredCount = currentLoan.computerCount || 0;
    
    submitBtn.disabled = selectedCount !== requiredCount;
    
    if (selectedCount === requiredCount && selectedCount > 0) {
        submitBtn.style.background = 'linear-gradient(45deg, #4CAF50, #45a049)';
        submitBtn.textContent = 'שלח השאלה';
    } else {
        submitBtn.style.background = '#ccc';
        submitBtn.textContent = `בחר ${requiredCount - selectedCount} מחשבים נוספים`;
    }
}

// Load Active Loans for Return
function loadActiveLoansForReturn(teacherName) {
    const activeLoans = getActiveLoansForTeacher(teacherName);
    const loansList = document.getElementById('activeLoansList');
    
    if (activeLoans.length === 0) {
        loansList.innerHTML = '<div class="no-loans">אין השאלות פעילות למורה זו</div>';
        return;
    }
    
    loansList.innerHTML = '';
    
    activeLoans.forEach(loan => {
        const loanItem = document.createElement('div');
        loanItem.className = 'loan-item';
        loanItem.setAttribute('data-loan-id', loan.id);
        
        const loanHeader = document.createElement('div');
        loanHeader.className = 'loan-header';
        loanHeader.textContent = `השאלה מתאריך ${loan.loanDate} - ${loan.loanTime}`;
        
        const computerCount = loan.computers ? loan.computers.length : 
                           (loan.cartSelections ? Object.values(loan.cartSelections).reduce((sum, arr) => sum + arr.length, 0) : 0);
        
        const cartInfo = loan.cart ? systemData.carts[loan.cart]?.name || loan.cart :
                       loan.cartSelections ? Object.keys(loan.cartSelections).map(cartId => systemData.carts[cartId]?.name || cartId).join(', ') : 'לא ידוע';
        
        const loanDetails = document.createElement('div');
        loanDetails.className = 'loan-details';
        loanDetails.textContent = `כיתה ${loan.teacherClass} • ${computerCount} מחשבים • ${cartInfo}`;
        
        loanItem.appendChild(loanHeader);
        loanItem.appendChild(loanDetails);
        
        loanItem.addEventListener('click', () => selectLoanForReturn(loan, loanItem));
        
        loansList.appendChild(loanItem);
    });
}

// Select Loan for Return
function selectLoanForReturn(loan, element) {
    document.querySelectorAll('.loan-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    element.classList.add('selected');
    selectedLoanForReturn = loan;
    
    document.getElementById('returnDetailsSection').style.display = 'block';
    document.getElementById('returnTimeSection').style.display = 'block';
    document.getElementById('returnNotesSection').style.display = 'block';
    
    updateReturnSubmitButton();
}

// Update Return Submit Button
function updateReturnSubmitButton() {
    const submitBtn = document.getElementById('submitReturn');
    const returnDate = document.getElementById('returnDate').value;
    const returnTime = document.getElementById('returnTime').value;
    
    submitBtn.disabled = !selectedLoanForReturn || !returnDate || !returnTime;
};

// Global Variables
let app, database;
let isConnected = false;
let systemData = {
    carts: {},
    loans: [],
    recurringLoans: [],
    config: {
        teachers: [],
        classes: [],
        timeSlots: [],
        computerCountOptions: []
    }
};

let currentLoan = {};
let selectedComputers = [];
let selectedLoanForReturn = null;
let isMultiCartMode = false;
let selectedCarts = {};
let editingItem = null;
let activeManagementTab = 'overview';

// Default configuration (fallback)
const defaultConfig = {
    teachers: [
        "אודליה אביבי", "אסמן אבו ואסל", "בלה אורון", "איילת רוזנשטיין",
        "הדי הראל", "איריס זוהר", "יוסי אלעזר", "שי כרמלי",
        "נעמה לביב", "לבנת שקד", "לימור לוי", "ליאור שלמה",
        "נעמה לסרי", "הילה מבד", "מור אלקבץ", "מורן עזוראי",
        "מיסה אגבאריה", "הוד נוף", "נור בלבוע", "מיה סדר",
        "סיון כיאט", "ורה עטר", "יעל עינת", "ענת אנדרסון",
        "קרין פפר", "רותי היבשי", "שני שבתאי", "טל שחר",
        "הנה שטרנאו", "הנה שייקוביץ", "שמרית אהרוני"
    ],
    classes: ["ב", "ג'", "ג'", "ד'", "ה'", "ו'"],
    timeSlots: [
        "08:00", "09:00", "09:50", "11:00", "12:00",
        "12:50", "13:30", "14:15", "15:00"
    ],
    computerCountOptions: [
        { value: 1, label: "1 מחשב" },
        { value: 2, label: "2 מחשבים" },
        { value: 3, label: "3 מחשבים" },
        { value: 4, label: "4 מחשבים" },
        { value: 5, label: "5 מחשבים" },
        { value: 6, label: "6 מחשבים" },
        { value: 7, label: "7 מחשבים" },
        { value: 8, label: "8 מחשבים" },
        { value: 9, label: "9 מחשבים" },
        { value: 10, label: "10 מחשבים" },
        { value: 11, label: "11 מחשבים" },
        { value: 12, label: "12 מחשבים" },
        { value: 13, label: "13 מחשבים" },
        { value: 14, label: "14 מחשבים" },
        { value: 15, label: "15 מחשבים" },
        { value: 16, label: "16 מחשבים" },
        { value: 17, label: "17 מחשבים" },
        { value: 18, label: "18 מחשבים" },
        { value: 19, label: "19 מחשבים" },
        { value: 20, label: "20 מחשבים" },
        { value: 21, label: "21 מחשבים" },
        { value: 22, label: "22 מחשבים" },
        { value: 23, label: "23 מחשבים" },
        { value: 24, label: "24 מחשבים" },
        { value: 25, label: "25 מחשבים" },
        { value: 36, label: "כל המחשבים" }
    ]
};

// Default carts configuration
const defaultCarts = {
    cart1: {
        name: "עגלה #1",
        computerPrefix: "#1",
        computerCount: 24,
        description: "CHROME BOOKS",
        computers: []
    },
    cart2: {
        name: "עגלה #2",
        computerPrefix: "#2",
        computerCount: 12,
        description: "LENOVO",
        computers: []
    }
};

// ==================== פונקציות עזר ====================

// קבלת יום השבוע בעברית
function getHebrewDayName(date) {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    return days[new Date(date).getDay()];
}

// בדיקה האם תאריך מתאים לתבנית השאלה קבועה
function isDateMatchingRecurringPattern(checkDate, recurringLoan) {
    const checkDay = new Date(checkDate).getDay();
    const recurringDay = new Date(recurringLoan.loanDate).getDay();
    return checkDay === recurringDay;
}

// קבלת השאלות קבועות שמתנגשות עם תאריך נתון
function getConflictingRecurringLoans(date, time) {
    return systemData.recurringLoans.filter(recurring => {
        const isSameDay = isDateMatchingRecurringPattern(date, recurring);
        const isSameTime = recurring.loanTime === time;
        return isSameDay && isSameTime && !recurring.cancelled;
    });
}

// עדכון סטטוס ההשאלה הקבועה
function updateRecurringLoanStatus() {
    const checkbox = document.getElementById('isRecurringLoan');
    const section = document.getElementById('recurringSection');
    const info = document.getElementById('recurringInfo');
    const warning = document.getElementById('recurringWarning');
    
    if (checkbox.checked) {
        section.classList.add('active');
        info.classList.add('show');
        warning.classList.add('show');
    } else {
        section.classList.remove('active');
        info.classList.remove('show');
        warning.classList.remove('show');
    }
}

// Generate Computer List
function generateComputerList(prefix, count) {
    const computers = [];
    for (let i = 1; i <= count; i++) {
        computers.push(`${prefix}-${i.toString().padStart(3, '0')}`);
    }
    return computers;
}

// Initialize Cart Data
function initializeCartData() {
    const cartData = {};
    
    Object.keys(defaultCarts).forEach(cartId => {
        const cart = defaultCarts[cartId];
        cartData[cartId] = {
            name: cart.name,
            description: cart.description || '',
            computerPrefix: cart.computerPrefix,
            computerCount: cart.computerCount,
            computers: generateComputerList(cart.computerPrefix, cart.computerCount)
        };
    });
    
    return cartData;
}

// ==================== פונקציות Firebase ====================

// Initialize Firebase
function initFirebase() {
    try {
        if (typeof firebase !== 'undefined') {
            firebase.initializeApp(firebaseConfig);
            database = firebase.database();
            
            // Listen for connection status
            const connectedRef = database.ref('.info/connected');
            connectedRef.on('value', (snapshot) => {
                isConnected = snapshot.val();
                updateConnectionStatus(isConnected);
                
                if (isConnected) {
                    loadDataFromFirebase();
                    setupFirebaseListeners();
                }
            });
            
            console.log('✅ Firebase initialized successfully');
            return true;
        } else {
            throw new Error('Firebase SDK not loaded');
        }
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        updateConnectionStatus(false);
        return false;
    }
}

// Update Connection Status
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    if (connected) {
        statusElement.textContent = '🟢 מחוברת לענן';
        statusElement.className = 'connection-status connected';
    } else {
        statusElement.textContent = '🔴 מנותקת';
        statusElement.className = 'connection-status disconnected';
    }
}

// Load Data from Firebase
function loadDataFromFirebase() {
    if (!database) return;
    
    database.ref().once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                
                // Load configuration
                if (data.config) {
                    systemData.config = { ...defaultConfig, ...data.config };
                } else {
                    systemData.config = { ...defaultConfig };
                }
                
                // Load carts
                if (data.carts) {
                    systemData.carts = data.carts;
                } else {
                    systemData.carts = initializeCartData();
                }
                
                // Load loans
                if (data.loans) {
                    systemData.loans = Object.values(data.loans);
                }
                
                // Load recurring loans
                if (data.recurringLoans) {
                    systemData.recurringLoans = Object.values(data.recurringLoans);
                }
                
                console.log('✅ Data loaded from Firebase');
                populateAllSelectors();
            } else {
                systemData.config = { ...defaultConfig };
                systemData.carts = initializeCartData();
                saveToFirebase();
            }
        })
        .catch((error) => {
            console.error('❌ Error loading data:', error);
            systemData.config = { ...defaultConfig };
            systemData.carts = initializeCartData();
            populateAllSelectors();
        });
}

// Setup Firebase Listeners
function setupFirebaseListeners() {
    if (!database) return;
    
    // Listen for config changes
    database.ref('config').on('value', (snapshot) => {
        if (snapshot.exists()) {
            systemData.config = { ...defaultConfig, ...snapshot.val() };
            populateAllSelectors();
        }
    });
    
    // Listen for cart changes
    database.ref('carts').on('value', (snapshot) => {
        if (snapshot.exists()) {
            systemData.carts = snapshot.val();
            populateAllSelectors();
        }
    });
    
    // Listen for new loans
    database.ref('loans').on('child_added', (snapshot) => {
        const loan = snapshot.val();
        const existingIndex = systemData.loans.findIndex(l => l.id === loan.id);
        if (existingIndex === -1) {
            systemData.loans.push(loan);
            console.log('🔥 New loan received from Firebase');
        }
    });

    // Listen for loan updates
    database.ref('loans').on('child_changed', (snapshot) => {
        const updatedLoan = snapshot.val();
        const existingIndex = systemData.loans.findIndex(l => l.id === updatedLoan.id);
        if (existingIndex !== -1) {
            systemData.loans[existingIndex] = updatedLoan;
            console.log('🔥 Loan updated from Firebase');
        }
    });

    // Listen for loan deletions
    database.ref('loans').on('child_removed', (snapshot) => {
        const deletedLoan = snapshot.val();
        systemData.loans = systemData.loans.filter(l => l.id !== deletedLoan.id);
        console.log('🔥 Loan deleted from Firebase');
    });

    // Listen for recurring loan changes
    database.ref('recurringLoans').on('child_added', (snapshot) => {
        const recurringLoan = snapshot.val();
        const existingIndex = systemData.recurringLoans.findIndex(l => l.id === recurringLoan.id);
        if (existingIndex === -1) {
            systemData.recurringLoans.push(recurringLoan);
            console.log('🔥 New recurring loan received from Firebase');
        }
    });

    database.ref('recurringLoans').on('child_changed', (snapshot) => {
        const updatedRecurringLoan = snapshot.val();
        const existingIndex = systemData.recurringLoans.findIndex(l => l.id === updatedRecurringLoan.id);
        if (existingIndex !== -1) {
            systemData.recurringLoans[existingIndex] = updatedRecurringLoan;
            console.log('🔥 Recurring loan updated from Firebase');
        }
    });

    database.ref('recurringLoans').on('child_removed', (snapshot) => {
        const deletedRecurringLoan = snapshot.val();
        systemData.recurringLoans = systemData.recurringLoans.filter(l => l.id !== deletedRecurringLoan.id);
        console.log('🔥 Recurring loan deleted from Firebase');
    });
}

// Save to Firebase
function saveToFirebase() {
    if (!database || !isConnected) {
        console.log('⚠️ Firebase not available');
        return;
    }
    
    // Convert arrays to objects for Firebase
    const loansObject = {};
    systemData.loans.forEach(loan => {
        loansObject[loan.id] = loan;
    });

    const recurringLoansObject = {};
    systemData.recurringLoans.forEach(recurringLoan => {
        recurringLoansObject[recurringLoan.id] = recurringLoan;
    });
    
    database.ref().set({
        config: systemData.config,
        carts: systemData.carts,
        loans: loansObject,
        recurringLoans: recurringLoansObject
    }).then(() => {
        console.log('✅ Data saved to Firebase');
    }).catch((error) => {
        console.error('❌ Error saving data:', error);
    });
}

// Delete loan from Firebase
function deleteLoanFromFirebase(loanId) {
    if (!database || !isConnected) {
        console.log('⚠️ Firebase not available');
        return Promise.reject('Firebase not available');
    }
    
    return database.ref(`loans/${loanId}`).remove()
        .then(() => {
            console.log('✅ Loan deleted from Firebase');
            systemData.loans = systemData.loans.filter(l => l.id != loanId);
        })
        .catch((error) => {
            console.error('❌ Error deleting loan:', error);
            throw error;
        });
}

// Delete recurring loan from Firebase
function deleteRecurringLoanFromFirebase(recurringLoanId) {
    if (!database || !isConnected) {
        console.log('⚠️ Firebase not available');
        return Promise.reject('Firebase not available');
    }
    
    return database.ref(`recurringLoans/${recurringLoanId}`).remove()
        .then(() => {
            console.log('✅ Recurring loan deleted from Firebase');
            systemData.recurringLoans = systemData.recurringLoans.filter(l => l.id != recurringLoanId);
        })
        .catch((error) => {
            console.error('❌ Error deleting recurring loan:', error);
            throw error;
        });
}

// ==================== פונקציות ממשק ====================

// Populate All Selectors
function populateAllSelectors() {
    populateTeacherSelectors();
    populateClassSelectors();
    populateTimeSelectors();
    populateComputerCountSelector();
    populateCartSelectors();
    updateManagementLists();
}

// Populate Teacher Selectors
function populateTeacherSelectors() {
    const teacherSelects = ['teacherName', 'returnTeacher'];
    teacherSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">בחרי מורה...</option>';
            systemData.config.teachers.forEach(teacher => {
                const option = document.createElement('option');
                option.value = teacher;
                option.textContent = teacher;
                select.appendChild(option);
            });
        }
    });
}

// Populate Class Selectors
function populateClassSelectors() {
    const classSelects = ['teacherClass', 'teacherClassInput'];
    classSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">בחרי כיתה...</option>';
            systemData.config.classes.forEach(className => {
                const option = document.createElement('option');
                option.value = className;
                option.textContent = className;
                select.appendChild(option);
            });
            if (currentValue) select.value = currentValue;
        }
    });
}

// Populate Time Selectors
function populateTimeSelectors() {
    const timeSelects = ['loanTime', 'returnTime', 'expectedReturnTime'];
    timeSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">בחרי שעה...</option>';
            systemData.config.timeSlots.forEach(time => {
                const option = document.createElement('option');
                option.value = time;
                option.textContent = time;
                select.appendChild(option);
            });
        }
    });
}

// Populate Computer Count Selector
function populateComputerCountSelector() {
    const computerCountSelect = document.getElementById('computerCount');
    if (computerCountSelect) {
        computerCountSelect.innerHTML = '<option value="">בחרי כמות...</option>';
        systemData.config.computerCountOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.label;
            computerCountSelect.appendChild(optionElement);
        });
    }
}

// Populate Cart Selectors
function populateCartSelectors() {
    const cartSelects = ['cartSelect', 'cartSelectForComputers'];
    cartSelects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">בחרי עגלה...</option>';
            Object.keys(systemData.carts).forEach(cartId => {
                const option = document.createElement('option');
                option.value = cartId;
                option.textContent = systemData.carts[cartId].name;
                select.appendChild(option);
            });
            if (currentValue) select.value = currentValue;
        }
    });
}

// ==================== פונקציות ניהול תצורה ====================

// Switch Management Tab
function switchManagementTab(tabName) {
    // Update active tab
    document.querySelectorAll('.management-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[onclick="switchManagementTab('${tabName}')"]`).classList.add('active');
    
    // Update active content
    document.querySelectorAll('.management-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Content`).classList.add('active');
    
    activeManagementTab = tabName;
    
    // Load specific content
    switch(tabName) {
        case 'overview':
            updateManagementData();
            break;
        case 'teachers':
            updateTeachersList();
            break;
        case 'times':
            updateTimesList();
            break;
        case 'carts':
            updateCartsList();
            break;
        case 'computers':
            updateComputersList();
            break;
        case 'reports':
            updateReportsData();
            break;
    }
}

// Update Management Lists
function updateManagementLists() {
    if (activeManagementTab === 'teachers') updateTeachersList();
    if (activeManagementTab === 'times') updateTimesList();
    if (activeManagementTab === 'carts') updateCartsList();
    if (activeManagementTab === 'computers') updateComputersList();
    if (activeManagementTab === 'reports') updateReportsData();
}

// ==================== דוחות =============================

function updateReportsData() {
    updateReportsStats();
    updateRecentReturnNotes();
}

function updateReportsStats() {
    const totalReturns = systemData.loans.filter(loan => loan.returned).length;
    const returnsWithNotes = systemData.loans.filter(loan => loan.returned && loan.returnNotes && loan.returnNotes.trim() !== '').length;
    const activeLoansCount = systemData.loans.filter(loan => !loan.returned).length;
    
    document.getElementById('totalReturns').textContent = totalReturns;
    document.getElementById('returnsWithNotes').textContent = returnsWithNotes;
    document.getElementById('activeLoansCount').textContent = activeLoansCount;
}

function updateRecentReturnNotes() {
    const container = document.getElementById('recentReturnNotes');
    
    // קבל החזרות עם הערות, ממוינות לפי תאריך
    const returnsWithNotes = systemData.loans
        .filter(loan => loan.returned && loan.returnNotes && loan.returnNotes.trim() !== '')
        .sort((a, b) => new Date(b.returnedAt || b.returnDate) - new Date(a.returnedAt || a.returnDate))
        .slice(0, 10); // 10 האחרונות
    
    if (returnsWithNotes.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #999; font-style: italic;">אין הערות החזרה</div>';
        return;
    }
    
    let html = '';
    returnsWithNotes.forEach(loan => {
        const returnDate = loan.returnDate || 'לא ידוע';
        const returnTime = loan.returnTime || 'לא ידוע';
        
        html += `
            <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-right: 4px solid #f57c00;">
                <div style="font-weight: bold; color: #333; margin-bottom: 5px;">
                    👩‍🏫 ${loan.teacherName} - כיתה ${loan.teacherClass}
                </div>
                <div style="font-size: 0.9em; color: #666; margin-bottom: 8px;">
                    📅 הוחזר: ${returnDate} בשעה ${returnTime}
                </div>
                <div style="background: #fff8e1; padding: 10px; border-radius: 6px; border-right: 3px solid #ffc107;">
                    <strong>💬 הערה:</strong> ${loan.returnNotes}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function exportReturnNotesToExcel() {
    const fromDate = document.getElementById('reportDateFrom').value;
    const toDate = document.getElementById('reportDateTo').value;
    
    let filteredLoans = systemData.loans.filter(loan => 
        loan.returned && loan.returnNotes && loan.returnNotes.trim() !== ''
    );
    
    // סנן לפי תאריך אם צוין
    if (fromDate) {
        filteredLoans = filteredLoans.filter(loan => loan.returnDate >= fromDate);
    }
    if (toDate) {
        filteredLoans = filteredLoans.filter(loan => loan.returnDate <= toDate);
    }
    
    if (filteredLoans.length === 0) {
        alert('אין הערות להצגה בתקופה שנבחרה');
        return;
    }
    
    // מיין לפי תאריך החזרה
    filteredLoans.sort((a, b) => new Date(b.returnDate) - new Date(a.returnDate));
    
    // בנה CSV
    let csvContent = '\uFEFF'; // BOM for Hebrew support
    csvContent += 'שם המורה,כיתה,תאריך השאלה,שעת השאלה,תאריך החזרה,שעת החזרה,מספר מחשבים,עגלה,מספרי מחשבים,הערות\n';
    
    filteredLoans.forEach(loan => {
        const computerCount = loan.computers ? loan.computers.length : 
                           (loan.cartSelections ? Object.values(loan.cartSelections).reduce((sum, arr) => sum + arr.length, 0) : 0);
        
        const cartInfo = loan.cart ? systemData.carts[loan.cart]?.name || loan.cart :
                       loan.cartSelections ? Object.keys(loan.cartSelections).map(cartId => systemData.carts[cartId]?.name || cartId).join(' + ') : 'לא ידוע';
        
        // בנה רשימת מחשבים
        let computersList = '';
        if (loan.computers) {
            computersList = loan.computers.join(', ');
        } else if (loan.cartSelections) {
            const computersByCart = Object.entries(loan.cartSelections).map(([cartId, computers]) => {
                const cartName = systemData.carts[cartId]?.name || cartId;
                return `${cartName}: ${computers.join(', ')}`;
            });
            computersList = computersByCart.join(' | ');
        }
        
        const cleanNotes = loan.returnNotes.replace(/"/g, '""').replace(/\n/g, ' ');
        
        csvContent += `"${loan.teacherName}","${loan.teacherClass}","${loan.loanDate}","${loan.loanTime}","${loan.returnDate}","${loan.returnTime}","${computerCount}","${cartInfo}","${computersList}","${cleanNotes}"\n`;
    });
    
    // יצור קובץ להורדה
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const dateRange = fromDate && toDate ? `_${fromDate}_${toDate}` : '';
    link.setAttribute('download', `הערות_החזרה${dateRange}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`✅ יוצא דוח הערות החזרה: ${filteredLoans.length} רשומות`);
}

function exportAllLoansToExcel() {
    const fromDate = document.getElementById('reportDateFrom').value;
    const toDate = document.getElementById('reportDateTo').value;
    
    let filteredLoans = [...systemData.loans];
    
    // סנן לפי תאריך אם צוין
    if (fromDate) {
        filteredLoans = filteredLoans.filter(loan => loan.loanDate >= fromDate);
    }
    if (toDate) {
        filteredLoans = filteredLoans.filter(loan => loan.loanDate <= toDate);
    }
    
    if (filteredLoans.length === 0) {
        alert('אין השאלות להצגה בתקופה שנבחרה');
        return;
    }
    
    // מיין לפי תאריך השאלה
    filteredLoans.sort((a, b) => new Date(b.loanDate) - new Date(a.loanDate));
    
    // בנה CSV
    let csvContent = '\uFEFF'; // BOM for Hebrew support
    csvContent += 'שם המורה,כיתה,תאריך השאלה,שעת השאלה,החזרה מתוכננת,תאריך החזרה,שעת החזרה,מספר מחשבים,עגלה,מספרי מחשבים,סטטוס,הערות החזרה,השאלה קבועה\n';
    
    filteredLoans.forEach(loan => {
        const computerCount = loan.computers ? loan.computers.length : 
                           (loan.cartSelections ? Object.values(loan.cartSelections).reduce((sum, arr) => sum + arr.length, 0) : 0);
        
        const cartInfo = loan.cart ? systemData.carts[loan.cart]?.name || loan.cart :
                       loan.cartSelections ? Object.keys(loan.cartSelections).map(cartId => systemData.carts[cartId]?.name || cartId).join(' + ') : 'לא ידוע';
        
        // בנה רשימת מחשבים
        let computersList = '';
        if (loan.computers) {
            computersList = loan.computers.join(', ');
        } else if (loan.cartSelections) {
            const computersByCart = Object.entries(loan.cartSelections).map(([cartId, computers]) => {
                const cartName = systemData.carts[cartId]?.name || cartId;
                return `${cartName}: ${computers.join(', ')}`;
            });
            computersList = computersByCart.join(' | ');
        }
        
        const status = loan.returned ? 'הוחזר' : 'פעיל';
        const returnDate = loan.returnDate || '';
        const returnTime = loan.returnTime || '';
        const expectedReturn = loan.expectedReturnTime || '';
        const notes = loan.returnNotes ? loan.returnNotes.replace(/"/g, '""').replace(/\n/g, ' ') : '';
        const isRecurring = loan.isRecurring ? 'כן' : 'לא';
        
        csvContent += `"${loan.teacherName}","${loan.teacherClass}","${loan.loanDate}","${loan.loanTime}","${expectedReturn}","${returnDate}","${returnTime}","${computerCount}","${cartInfo}","${computersList}","${status}","${notes}","${isRecurring}"\n`;
    });
    
    // יצור קובץ להורדה
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const dateRange = fromDate && toDate ? `_${fromDate}_${toDate}` : '';
    link.setAttribute('download', `כל_ההשאלות${dateRange}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`✅ יוצא דוח כל ההשאלות: ${filteredLoans.length} רשומות`);
}

// ==================== ניהול מורות ====================

function updateTeachersList() {
    const container = document.getElementById('teachersList');
    if (!container) return;
    
    container.innerHTML = '';
    
    systemData.config.teachers.forEach((teacher, index) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-content">
                <strong>${teacher}</strong>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-info btn-small" onclick="editTeacher(${index})">✏️ ערוך</button>
                <button class="btn btn-danger btn-small" onclick="deleteTeacher(${index})">🗑️ מחק</button>
            </div>
        `;
        container.appendChild(item);
    });
}

function showAddTeacherForm() {
    document.getElementById('teacherForm').style.display = 'block';
    document.getElementById('teacherFormTitle').textContent = 'הוספת מורה חדשה';
    document.getElementById('teacherNameInput').value = '';
    document.getElementById('teacherClassInput').value = '';
    editingItem = null;
}

function editTeacher(index) {
    const teacher = systemData.config.teachers[index];
    document.getElementById('teacherForm').style.display = 'block';
    document.getElementById('teacherFormTitle').textContent = 'עריכת מורה';
    document.getElementById('teacherNameInput').value = teacher;
    document.getElementById('teacherClassInput').value = ''; // We don't store class per teacher
    editingItem = { type: 'teacher', index: index };
}

function saveTeacher() {
    const name = document.getElementById('teacherNameInput').value.trim();
    
    if (!name) {
        alert('אנא הכנס שם מורה');
        return;
    }
    
    if (editingItem && editingItem.type === 'teacher') {
        // Edit existing teacher
        systemData.config.teachers[editingItem.index] = name;
    } else {
        // Add new teacher
        if (systemData.config.teachers.includes(name)) {
            alert('מורה זו כבר קיימת במערכת');
            return;
        }
        systemData.config.teachers.push(name);
    }
    
    systemData.config.teachers.sort();
    saveToFirebase();
    cancelTeacherForm();
    updateTeachersList();
    populateTeacherSelectors();
}

function deleteTeacher(index) {
    const teacher = systemData.config.teachers[index];
    if (confirm(`האם למחוק את ${teacher}?`)) {
        systemData.config.teachers.splice(index, 1);
        saveToFirebase();
        updateTeachersList();
        populateTeacherSelectors();
    }
}

function cancelTeacherForm() {
    document.getElementById('teacherForm').style.display = 'none';
    editingItem = null;
}

// ==================== ניהול שעות ====================

function updateTimesList() {
    const container = document.getElementById('timesList');
    if (!container) return;
    
    container.innerHTML = '';
    
    systemData.config.timeSlots.forEach((time, index) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-content">
                <strong>${time}</strong>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-info btn-small" onclick="editTime(${index})">✏️ ערוך</button>
                <button class="btn btn-danger btn-small" onclick="deleteTime(${index})">🗑️ מחק</button>
            </div>
        `;
        container.appendChild(item);
    });
}

function showAddTimeForm() {
    document.getElementById('timeForm').style.display = 'block';
    document.getElementById('timeFormTitle').textContent = 'הוספת שעה חדשה';
    document.getElementById('timeInput').value = '';
    editingItem = null;
}

function editTime(index) {
    const time = systemData.config.timeSlots[index];
    document.getElementById('timeForm').style.display = 'block';
    document.getElementById('timeFormTitle').textContent = 'עריכת שעה';
    document.getElementById('timeInput').value = time;
    editingItem = { type: 'time', index: index };
}

function saveTime() {
    const time = document.getElementById('timeInput').value;
    
    if (!time) {
        alert('אנא בחר שעה');
        return;
    }
    
    if (editingItem && editingItem.type === 'time') {
        // Edit existing time
        systemData.config.timeSlots[editingItem.index] = time;
    } else {
        // Add new time
        if (systemData.config.timeSlots.includes(time)) {
            alert('שעה זו כבר קיימת במערכת');
            return;
        }
        systemData.config.timeSlots.push(time);
    }
    
    systemData.config.timeSlots.sort();
    saveToFirebase();
    cancelTimeForm();
    updateTimesList();
    populateTimeSelectors();
}

function deleteTime(index) {
    const time = systemData.config.timeSlots[index];
    if (confirm(`האם למחוק את השעה ${time}?`)) {
        systemData.config.timeSlots.splice(index, 1);
        saveToFirebase();
        updateTimesList();
        populateTimeSelectors();
    }
}

function cancelTimeForm() {
    document.getElementById('timeForm').style.display = 'none';
    editingItem = null;
}

// ==================== ניהול עגלות ====================

function updateCartsList() {
    const container = document.getElementById('cartsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.keys(systemData.carts).forEach(cartId => {
        const cart = systemData.carts[cartId];
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-content">
                <strong>${cart.name}</strong><br>
                <small>${cart.description} • ${cart.computers.length} מחשבים • קידומת: ${cart.computerPrefix}</small>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-info btn-small" onclick="editCart('${cartId}')">✏️ ערוך</button>
                <button class="btn btn-danger btn-small" onclick="deleteCart('${cartId}')">🗑️ מחק</button>
            </div>
        `;
        container.appendChild(item);
    });
}

function showAddCartForm() {
    document.getElementById('cartForm').style.display = 'block';
    document.getElementById('cartFormTitle').textContent = 'הוספת עגלה חדשה';
    document.getElementById('cartNameInput').value = '';
    document.getElementById('cartDescriptionInput').value = '';
    document.getElementById('cartPrefixInput').value = '';
    document.getElementById('cartCountInput').value = '';
    editingItem = null;
}

function editCart(cartId) {
    const cart = systemData.carts[cartId];
    document.getElementById('cartForm').style.display = 'block';
    document.getElementById('cartFormTitle').textContent = 'עריכת עגלה';
    document.getElementById('cartNameInput').value = cart.name;
    document.getElementById('cartDescriptionInput').value = cart.description || '';
    document.getElementById('cartPrefixInput').value = cart.computerPrefix || '';
    document.getElementById('cartCountInput').value = cart.computerCount || cart.computers.length;
    editingItem = { type: 'cart', id: cartId };
}

function saveCart() {
    const name = document.getElementById('cartNameInput').value.trim();
    const description = document.getElementById('cartDescriptionInput').value.trim();
    const prefix = document.getElementById('cartPrefixInput').value.trim();
    const count = parseInt(document.getElementById('cartCountInput').value);
    
    if (!name || !prefix || !count) {
        alert('אנא מלא את כל השדות הנדרשים');
        return;
    }
    
    if (count < 1 || count > 50) {
        alert('מספר המחשבים חייב להיות בין 1 ל-50');
        return;
    }
    
    if (editingItem && editingItem.type === 'cart') {
        // Edit existing cart
        const cartId = editingItem.id;
        systemData.carts[cartId].name = name;
        systemData.carts[cartId].description = description;
        systemData.carts[cartId].computerPrefix = prefix;
        systemData.carts[cartId].computerCount = count;
        
        // Regenerate computers if count changed
        if (systemData.carts[cartId].computers.length !== count) {
            systemData.carts[cartId].computers = generateComputerList(prefix, count);
        }
    } else {
        // Add new cart
        const cartId = 'cart' + Date.now();
        systemData.carts[cartId] = {
            name: name,
            description: description,
            computerPrefix: prefix,
            computerCount: count,
            computers: generateComputerList(prefix, count)
        };
    }
    
    saveToFirebase();
    cancelCartForm();
    updateCartsList();
    populateCartSelectors();
}

function deleteCart(cartId) {
    const cart = systemData.carts[cartId];
    if (confirm(`האם למחוק את ${cart.name}?\n\nזה ימחק גם את כל המחשבים שלה.`)) {
        delete systemData.carts[cartId];
        saveToFirebase();
        updateCartsList();
        populateCartSelectors();
    }
}

function cancelCartForm() {
    document.getElementById('cartForm').style.display = 'none';
    editingItem = null;
}

// ==================== ניהול מחשבים ====================

function loadComputersForCart() {
    const cartId = document.getElementById('cartSelectForComputers').value;
    const section = document.getElementById('computerManagementSection');
    
    if (!cartId) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    updateComputersList();
}

function updateComputersList() {
    const cartId = document.getElementById('cartSelectForComputers').value;
    const container = document.getElementById('computersList');
    
    if (!cartId || !container) return;
    
    container.innerHTML = '';
    
    const cart = systemData.carts[cartId];
    if (!cart || !cart.computers) return;
    
    cart.computers.forEach((computer, index) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="list-item-content">
                <strong>${computer}</strong>
            </div>
            <div class="list-item-actions">
                <button class="btn btn-info btn-small" onclick="editComputer('${cartId}', ${index})">✏️ ערוך</button>
                <button class="btn btn-danger btn-small" onclick="deleteComputer('${cartId}', ${index})">🗑️ מחק</button>
            </div>
        `;
        container.appendChild(item);
    });
}

function showAddComputerForm() {
    const cartId = document.getElementById('cartSelectForComputers').value;
    if (!cartId) {
        alert('אנא בחר עגלה קודם');
        return;
    }
    
    document.getElementById('computerForm').style.display = 'block';
    document.getElementById('computerFormTitle').textContent = 'הוספת מחשב חדש';
    document.getElementById('computerNameInput').value = '';
    editingItem = null;
}

function editComputer(cartId, index) {
    const computer = systemData.carts[cartId].computers[index];
    document.getElementById('computerForm').style.display = 'block';
    document.getElementById('computerFormTitle').textContent = 'עריכת מחשב';
    document.getElementById('computerNameInput').value = computer;
    editingItem = { type: 'computer', cartId: cartId, index: index };
}

function saveComputer() {
    const name = document.getElementById('computerNameInput').value.trim();
    const cartId = document.getElementById('cartSelectForComputers').value;
    
    if (!name) {
        alert('אנא הכנס שם מחשב');
        return;
    }
    
    if (!cartId) {
        alert('אנא בחר עגלה');
        return;
    }
    
    if (editingItem && editingItem.type === 'computer') {
        // Edit existing computer
        systemData.carts[cartId].computers[editingItem.index] = name;
    } else {
        // Add new computer
        if (systemData.carts[cartId].computers.includes(name)) {
            alert('מחשב זה כבר קיים בעגלה');
            return;
        }
        systemData.carts[cartId].computers.push(name);
    }
    
    systemData.carts[cartId].computers.sort();
    saveToFirebase();
    cancelComputerForm();
    updateComputersList();
}

function deleteComputer(cartId, index) {
    const computer = systemData.carts[cartId].computers[index];
    if (confirm(`האם למחוק את ${computer}?`)) {
        systemData.carts[cartId].computers.splice(index, 1);
        saveToFirebase();
        updateComputersList();
    }
}

function regenerateComputers() {
    const cartId = document.getElementById('cartSelectForComputers').value;
    if (!cartId) {
        alert('אנא בחר עגלה קודם');
        return;
    }
    
    const cart = systemData.carts[cartId];
    if (confirm(`האם ליצור מחדש את רשימת המחשבים עבור ${cart.name}?\n\nזה ימחק את כל המחשבים הנוכחיים ויצור ${cart.computerCount} מחשבים חדשים.`)) {
        cart.computers = generateComputerList(cart.computerPrefix, cart.computerCount);
        saveToFirebase();
        updateComputersList();
    }
}

function cancelComputerForm() {
    document.getElementById('computerForm').style.display = 'none';
    editingItem = null;
}

// ==================== פונקציות השאלה ====================

// Show Error Message
function showError(message) {
    const existingErrors = document.querySelectorAll('.error-message');
    existingErrors.forEach(error => error.remove());
    
    if (!message || message.trim() === '') return;
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    const activeScreen = document.querySelector('.screen.active');
    if (activeScreen) {
        activeScreen.insertBefore(errorDiv, activeScreen.firstChild);
    }
    
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 4000);
}

// Show Screen
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// Get Occupied Computers
function getOccupiedComputers(cartId, date) {
    const occupied = [];

    systemData.loans
        .filter(loan => loan.cart === cartId && loan.loanDate === date && !loan.returned)
        .forEach(loan => {
            occupied.push(...(loan.computers || []));
        });

    const conflictingRecurring = getConflictingRecurringLoans(date);
    conflictingRecurring.forEach(recurring => {
        if (recurring.cart === cartId) {
            occupied.push(...(recurring.computers || []));
        } else if (recurring.cartSelections && recurring.cartSelections[cartId]) {
            occupied.push(...(recurring.cartSelections[cartId] || []));
        }
    });

    return occupied;
}

// Get Occupied Computers for Multi-Cart
function getOccupiedComputersMultiCart(cartId, date, requestedTime = null) {
    const allOccupied = [];
    
    systemData.loans
        .filter(loan => loan.loanDate === date && !loan.returned)
        .forEach(loan => {
            if (requestedTime && loan.expectedReturnTime) {
                const timeToMinutes = (timeStr) => {
                    const [hours, minutes] = timeStr.split(':').map(Number);
                    return hours * 60 + minutes;
                };
                
                const requestedMinutes = timeToMinutes(requestedTime);
                const loanEndMinutes = timeToMinutes(loan.expectedReturnTime);
                
                if (requestedMinutes >= loanEndMinutes) {
                    return;
                }
            }
            
            if (loan.cart === cartId) {
                allOccupied.push(...(loan.computers || []));
            } else if (loan.cartSelections && loan.cartSelections[cartId]) {
                allOccupied.push(...(loan.cartSelections[cartId] || []));
            }
        });

    if (requestedTime) {
        const conflictingRecurring = getConflictingRecurringLoans(date, requestedTime);
        conflictingRecurring.forEach(recurring => {
            if (recurring.cart === cartId) {
                allOccupied.push(...(recurring.computers || []));
            } else if (recurring.cartSelections && recurring.cartSelections[cartId]) {
                allOccupied.push(...(recurring.cartSelections[cartId] || []));
            }
        });
    }
    
    return [...new Set(allOccupied)]; // הסרת כפילויות
}

// Get Available Computers Count for Date
function getAvailableComputersCountForDate(date, requestedTime = null) {
    let totalAvailable = 0;
    Object.keys(systemData.carts).forEach(cartId => {
        const cart = systemData.carts[cartId];
        const occupied = getOccupiedComputersMultiCart(cartId, date, requestedTime);
        totalAvailable += cart.computers.length - occupied.length;
    });
    return totalAvailable;
}

// Get Cart Availability for Date
function getCartAvailabilityForDate(cartId, date, requestedTime = null) {
    const cart = systemData.carts[cartId];
    if (!cart) return 0;
    
    const occupied = getOccupiedComputersMultiCart(cartId, date, requestedTime);
    return cart.computers.length - occupied.length;
}

// Get Active Loans for Teacher
function getActiveLoansForTeacher(teacherName) {
    return systemData.loans.filter(loan => 
        loan.teacherName === teacherName && 
        !loan.returned && 
        loan.type !== 'return'
    );
}

// Check if Multi-Cart Mode is Needed
function checkMultiCartMode() {
    const requiredCount = currentLoan.computerCount || 0;
    const date = currentLoan.loanDate;
    const requestedTime = currentLoan.loanTime;
    
    let hasEnoughInSingleCart = false;
    Object.keys(systemData.carts).forEach(cartId => {
        const available = getCartAvailabilityForDate(cartId, date, requestedTime);
        if (available >= requiredCount) {
            hasEnoughInSingleCart = true;
        }
    });
    
    const totalAvailable = getAvailableComputersCountForDate(date, requestedTime);
    
    if (!hasEnoughInSingleCart && totalAvailable >= requiredCount) {
        setupMultiCartMode();
        return true;
    } else if (totalAvailable < requiredCount) {
        showError(`לא מספיק מחשבים זמינים בתאריך ושעה זו. זמינים: ${totalAvailable}, נדרשים: ${requiredCount}`);
        return false;
    } else {
        setupSingleCartMode();
        return true;
    }
}
        