/**
 * Security Module for Teacher App
 * Contains all security-related functions and utilities
 */

class SecurityManager {
    constructor() {
        this.config = {
            maxLoginAttempts: parseInt(import.meta.env.VITE_MAX_LOGIN_ATTEMPTS) || 3,
            lockoutDuration: parseInt(import.meta.env.VITE_LOCKOUT_DURATION) || 300000,
            commentRateLimit: parseInt(import.meta.env.VITE_COMMENT_RATE_LIMIT) || 5,
            sessionTimeout: parseInt(import.meta.env.VITE_SESSION_TIMEOUT) || 3600000,
            adminEmails: (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').filter(email => email.trim()),
            allowedDomains: (import.meta.env.VITE_ALLOWED_DOMAINS || 'drive.google.com,docs.google.com').split(',')
        };

        this.state = {
            loginAttempts: this.getStoredAttempts(),
            lastLoginAttempt: parseInt(localStorage.getItem('lastLoginAttempt')) || 0,
            commentCount: 0,
            lastCommentTime: 0,
            sessionStartTime: Date.now(),
            isLocked: this.checkInitialLockout()
        };

        this.setupCSP();
        this.setupEventListeners();
    }

    /**
     * Input sanitization to prevent XSS attacks
     */
    sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        
        return input
            .replace(/[<>\"'&]/g, (match) => {
                const entityMap = {
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#x27;',
                    '&': '&amp;'
                };
                return entityMap[match];
            })
            .trim()
            .substring(0, 2000); // Reasonable max length
    }

    /**
     * URL validation for Google Drive links
     */
    validateUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'https:' && 
                   this.config.allowedDomains.some(domain => 
                       urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
                   );
        } catch {
            return false;
        }
    }

    /**
     * Rate limiting for various actions
     */
    checkRateLimit(action, userId = null) {
        const now = Date.now();
        
        switch (action) {
            case 'comment':
                return this.checkCommentRateLimit(now, userId);
            case 'login':
                return this.checkLoginRateLimit(now);
            default:
                return true;
        }
    }

    checkCommentRateLimit(now, userId) {
        const key = `commentLimit_${userId || 'anonymous'}`;
        const stored = JSON.parse(localStorage.getItem(key) || '{"count": 0, "timestamp": 0}');
        
        // Reset counter if more than 1 minute passed
        if (now - stored.timestamp > 60000) {
            stored.count = 0;
            stored.timestamp = now;
        }
        
        stored.count++;
        localStorage.setItem(key, JSON.stringify(stored));
        
        return stored.count <= this.config.commentRateLimit;
    }

    checkLoginRateLimit(now) {
        if (this.state.isLocked && 
            now - this.state.lastLoginAttempt > this.config.lockoutDuration) {
            this.state.isLocked = false;
            this.state.loginAttempts = 0;
            this.clearStoredAttempts();
        }
        
        return !this.state.isLocked;
    }

    /**
     * Handle failed login attempts
     */
    handleFailedLogin() {
        this.state.loginAttempts++;
        this.state.lastLoginAttempt = Date.now();
        
        localStorage.setItem('loginAttempts', this.state.loginAttempts.toString());
        localStorage.setItem('lastLoginAttempt', this.state.lastLoginAttempt.toString());
        
        if (this.state.loginAttempts >= this.config.maxLoginAttempts) {
            this.state.isLocked = true;
            this.logSecurityEvent('account_locked', {
                attempts: this.state.loginAttempts,
                timestamp: this.state.lastLoginAttempt
            });
            
            return {
                locked: true,
                message: `החשבון נחסם זמנית לאחר ${this.config.maxLoginAttempts} ניסיונות כושלים. נסה שוב בעוד ${Math.ceil(this.config.lockoutDuration / 60000)} דקות.`
            };
        }
        
        return {
            locked: false,
            message: `נסיון כניסה כושל. נותרו ${this.config.maxLoginAttempts - this.state.loginAttempts} ניסיונות.`
        };
    }

    /**
     * Reset login attempts on successful login
     */
    resetLoginAttempts() {
        this.state.loginAttempts = 0;
        this.state.isLocked = false;
        this.clearStoredAttempts();
    }

    /**
     * Check if user is admin
     */
    isAdmin(user) {
        return user && user.email && this.config.adminEmails.includes(user.email);
    }

    /**
     * Session management
     */
    checkSessionTimeout(currentUser) {
        if (currentUser && Date.now() - this.state.sessionStartTime > this.config.sessionTimeout) {
            this.logSecurityEvent('session_timeout', { userId: currentUser.uid });
            return true;
        }
        return false;
    }

    refreshSession() {
        this.state.sessionStartTime = Date.now();
    }

    /**
     * Content Security Policy setup
     */
    setupCSP() {
        if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
            const cspMeta = document.createElement('meta');
            cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
            cspMeta.setAttribute('content', this.generateCSP());
            document.head.appendChild(cspMeta);
        }
    }

    generateCSP() {
        return [
            "default-src 'self'",
            "script-src 'self' https://cdnjs.cloudflare.com https://*.firebaseapp.com https://*.googleapis.com 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://*.firebaseapp.com https://api.ipify.org",
            "font-src 'self' data:",
            "img-src 'self' data: https:",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ].join('; ');
    }

    /**
     * Client-side encryption utilities
     */
    async generateEncryptionKey() {
        return await window.crypto.subtle.generateKey(
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    }

    async encryptData(data, key) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        
        const encrypted = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            dataBuffer
        );
        
        return {
            data: Array.from(new Uint8Array(encrypted)),
            iv: Array.from(iv)
        };
    }

    async decryptData(encryptedData, key) {
        const iv = new Uint8Array(encryptedData.iv);
        const data = new Uint8Array(encryptedData.data);
        
        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            data
        );
        
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decrypted));
    }

    /**
     * Security event logging
     */
    logSecurityEvent(eventType, details = {}) {
        const event = {
            type: eventType,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            details: details
        };
        
        // Store locally for audit
        const logs = JSON.parse(localStorage.getItem('securityLogs') || '[]');
        logs.push(event);
        
        // Keep only last 100 events
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('securityLogs', JSON.stringify(logs));
        
        // Send to server if available
        if (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) {
            this.sendSecurityLog(event);
        }
        
        console.warn('Security Event:', event);
    }

    async sendSecurityLog(event) {
        try {
            const user = window.firebase.auth().currentUser;
            if (user) {
                await window.firebase.database()
                    .ref(`auditLogs/${user.uid}`)
                    .push({
                        ...event,
                        userId: user.uid,
                        serverTimestamp: window.firebase.database.ServerValue.TIMESTAMP
                    });
            }
        } catch (error) {
            console.error('Failed to send security log:', error);
        }
    }

    /**
     * Input validation for forms
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email) && email.length <= 254;
    }

    validatePassword(password) {
        return {
            isValid: password.length >= 6 && password.length <= 128,
            requirements: {
                minLength: password.length >= 6,
                maxLength: password.length <= 128,
                hasUpperCase: /[A-Z]/.test(password),
                hasLowerCase: /[a-z]/.test(password),
                hasNumbers: /\d/.test(password),
                hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
            }
        };
    }

    /**
     * XSS Protection
     */
    setupXSSProtection() {
        // Prevent eval and similar dangerous functions
        if (window.eval) {
            window.eval = function() {
                throw new Error('eval() is disabled for security reasons');
            };
        }
        
        // Monitor for suspicious DOM modifications
        if (window.MutationObserver) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === 1) { // Element node
                                this.scanForMaliciousContent(node);
                            }
                        });
                    }
                });
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    scanForMaliciousContent(element) {
        // Check for suspicious attributes
        const suspiciousAttrs = ['onload', 'onerror', 'onclick', 'onmouseover'];
        suspiciousAttrs.forEach(attr => {
            if (element.hasAttribute(attr)) {
                this.logSecurityEvent('xss_attempt', {
                    element: element.tagName,
                    attribute: attr,
                    value: element.getAttribute(attr)
                });
                element.removeAttribute(attr);
            }
        });
        
        // Check for inline scripts
        if (element.tagName === 'SCRIPT' && element.innerHTML.trim()) {
            this.logSecurityEvent('inline_script_detected', {
                content: element.innerHTML.substring(0, 100)
            });
            element.remove();
        }
    }

    /**
     * Helper methods for localStorage management
     */
    getStoredAttempts() {
        return parseInt(localStorage.getItem('loginAttempts')) || 0;
    }

    clearStoredAttempts() {
        localStorage.removeItem('loginAttempts');
        localStorage.removeItem('lastLoginAttempt');
    }

    checkInitialLockout() {
        const attempts = this.getStoredAttempts();
        const lastAttempt = parseInt(localStorage.getItem('lastLoginAttempt')) || 0;
        const now = Date.now();
        
        return attempts >= this.config.maxLoginAttempts && 
               (now - lastAttempt) < this.config.lockoutDuration;
    }

    /**
     * Setup security event listeners
     */
    setupEventListeners() {
        // Detect tab visibility changes (potential session hijacking)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.logSecurityEvent('tab_hidden');
            } else {
                this.logSecurityEvent('tab_visible');
            }
        });
        
        // Detect copy/paste in sensitive fields
        document.addEventListener('paste', (e) => {
            if (e.target.type === 'password') {
                this.logSecurityEvent('password_paste_attempt');
            }
        });
        
        // Monitor for DevTools opening (basic detection)
        let devtools = {
            open: false,
            orientation: null
        };
        
        setInterval(() => {
            if (window.outerHeight - window.innerHeight > 200 || 
                window.outerWidth - window.innerWidth > 200) {
                if (!devtools.open) {
                    devtools.open = true;
                    this.logSecurityEvent('devtools_opened');
                }
            } else {
                devtools.open = false;
            }
        }, 500);
    }

    /**
     * Get client IP for audit logging
     */
    async getClientIP() {
        try {
            const response = await fetch(import.meta.env.VITE_IP_SERVICE_URL || 'https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch {
            return 'unknown';
        }
    }

    /**
     * Generate secure random tokens
     */
    generateSecureToken(length = 32) {
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Hash sensitive data (for local storage)
     */
    async hashData(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}

// Export singleton instance
export const securityManager = new SecurityManager();

// Utility functions for backward compatibility
export function sanitizeInput(input) {
    return securityManager.sanitizeInput(input);
}

export function validateUrl(url) {
    return securityManager.validateUrl(url);
}

export function checkRateLimit(action, userId) {
    return securityManager.checkRateLimit(action, userId);
}

export function isAdmin(user) {
    return securityManager.isAdmin(user);
}

export function logSecurityEvent(eventType, details) {
    return securityManager.logSecurityEvent(eventType, details);
}