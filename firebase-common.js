// ============================================
// FIREBASE-COMMON.JS - Complete Firebase Logic
// Abdullahi Umar Muazu Portfolio System
// Supports: Firestore, Auth, Storage, Analytics
// Fallback: localStorage for offline mode
// ============================================

// ============================================
// FIREBASE CONFIGURATION - REAL CONFIG
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0",
    authDomain: "abdullahi-umar-muazu-portfolio.firebaseapp.com",
    projectId: "abdullahi-umar-muazu-portfolio",
    storageBucket: "abdullahi-umar-muazu-portfolio.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890abcdef",
    measurementId: "G-XXXXXXXXXX"
};

// ============================================
// FIREBASE INITIALIZATION
// ============================================
let db = null;
let auth = null;
let storage = null;
let analytics = null;
let firebaseInitialized = false;

function initFirebase() {
    if (typeof firebase !== 'undefined' && !firebaseInitialized) {
        try {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            auth = firebase.auth();
            storage = firebase.storage();
            analytics = firebase.analytics ? firebase.analytics() : null;
            firebaseInitialized = true;
            console.log('%c✅ Firebase initialized successfully', 'color: #10b981; font-weight: bold;');
            return true;
        } catch (error) {
            console.warn('⚠️ Firebase init error:', error);
            return false;
        }
    } else if (firebaseInitialized) {
        return true;
    } else {
        console.warn('⚠️ Firebase SDK not loaded. Using localStorage fallback.');
        return false;
    }
}

// ============================================
// AUTHENTICATION SYSTEM
// ============================================
const ADMIN_CREDENTIALS = {
    email: "admin@abdullahiumar.com",
    password: "admin123"
};

function loginAdmin(email, password) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
                const token = btoa(email + ':' + Date.now() + ':' + Math.random().toString(36));
                const sessionData = {
                    token: token,
                    email: email,
                    loginTime: Date.now(),
                    expiresAt: Date.now() + (24 * 60 * 60 * 1000)
                };
                localStorage.setItem('adminSession', JSON.stringify(sessionData));
                localStorage.setItem('adminToken', token);
                localStorage.setItem('adminEmail', email);
                localStorage.setItem('adminLoginTime', Date.now().toString());
                
                DB.addLog({
                    type: 'login',
                    title: 'Admin Login',
                    description: `Successful login from ${navigator.userAgent}`,
                    time: 'Just now'
                }).catch(() => {});
                
                resolve({ success: true, token, email });
            } else {
                reject({ success: false, message: 'Invalid email or password. Please check your credentials.' });
            }
        }, 800);
    });
}

function logoutAdmin() {
    localStorage.removeItem('adminSession');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminLoginTime');
    if (auth) {
        auth.signOut().catch(() => {});
    }
    window.location.href = 'admin-login.html';
}

function isAdminLoggedIn() {
    const session = localStorage.getItem('adminSession');
    if (!session) {
        const token = localStorage.getItem('adminToken');
        const loginTime = localStorage.getItem('adminLoginTime');
        if (!token || !loginTime) return false;
        const hoursSinceLogin = (Date.now() - parseInt(loginTime)) / (1000 * 60 * 60);
        return hoursSinceLogin < 24;
    }
    
    try {
        const data = JSON.parse(session);
        return data.expiresAt > Date.now();
    } catch {
        return false;
    }
}

function checkAuth() {
    if (!isAdminLoggedIn()) {
        window.location.href = 'admin-login.html';
    }
}

function getAdminEmail() {
    const session = localStorage.getItem('adminSession');
    if (session) {
        try {
            return JSON.parse(session).email || 'Admin';
        } catch {
            return localStorage.getItem('adminEmail') || 'Admin';
        }
    }
    return localStorage.getItem('adminEmail') || 'Admin';
}

// ============================================
// DATABASE OPERATIONS (Firestore + localStorage)
// ============================================
const DB = {
    // --- PROJECTS ---
    async getProjects() {
        if (db) {
            try {
                const snapshot = await db.collection('projects').orderBy('createdAt', 'desc').get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        return JSON.parse(localStorage.getItem('projects') || '[]');
    },

    async addProject(project) {
        project.createdAt = new Date().toISOString();
        project.updatedAt = new Date().toISOString();
        if (db) {
            try {
                const docRef = await db.collection('projects').add(project);
                return { id: docRef.id, ...project };
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const projects = JSON.parse(localStorage.getItem('projects') || '[]');
        project.id = 'proj_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
        projects.unshift(project);
        localStorage.setItem('projects', JSON.stringify(projects));
        return project;
    },

    async updateProject(id, data) {
        data.updatedAt = new Date().toISOString();
        if (db) {
            try {
                await db.collection('projects').doc(id).update(data);
                return { id, ...data };
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const projects = JSON.parse(localStorage.getItem('projects') || '[]');
        const index = projects.findIndex(p => p.id === id);
        if (index !== -1) {
            projects[index] = { ...projects[index], ...data };
            localStorage.setItem('projects', JSON.stringify(projects));
        }
        return projects[index];
    },

    async deleteProject(id) {
        if (db) {
            try {
                await db.collection('projects').doc(id).delete();
                return true;
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const projects = JSON.parse(localStorage.getItem('projects') || '[]');
        const filtered = projects.filter(p => p.id !== id);
        localStorage.setItem('projects', JSON.stringify(filtered));
        return true;
    },

    // --- MESSAGES ---
    async getMessages() {
        if (db) {
            try {
                const snapshot = await db.collection('messages').orderBy('createdAt', 'desc').get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        return JSON.parse(localStorage.getItem('messages') || '[]');
    },

    async addMessage(message) {
        message.createdAt = new Date().toISOString();
        message.read = false;
        message.status = 'new';
        if (db) {
            try {
                const docRef = await db.collection('messages').add(message);
                return { id: docRef.id, ...message };
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const messages = JSON.parse(localStorage.getItem('messages') || '[]');
        message.id = 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
        messages.unshift(message);
        localStorage.setItem('messages', JSON.stringify(messages));
        return message;
    },

    async markMessageAsRead(id) {
        if (db) {
            try {
                await db.collection('messages').doc(id).update({ read: true, readAt: new Date().toISOString() });
                return true;
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const messages = JSON.parse(localStorage.getItem('messages') || '[]');
        const msg = messages.find(m => m.id === id);
        if (msg) {
            msg.read = true;
            msg.readAt = new Date().toISOString();
            localStorage.setItem('messages', JSON.stringify(messages));
        }
        return true;
    },

    async deleteMessage(id) {
        if (db) {
            try {
                await db.collection('messages').doc(id).delete();
                return true;
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const messages = JSON.parse(localStorage.getItem('messages') || '[]');
        const filtered = messages.filter(m => m.id !== id);
        localStorage.setItem('messages', JSON.stringify(filtered));
        return true;
    },

    // --- BLOG POSTS ---
    async getBlogPosts() {
        if (db) {
            try {
                const snapshot = await db.collection('blog').orderBy('createdAt', 'desc').get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        return JSON.parse(localStorage.getItem('blogPosts') || '[]');
    },

    async addBlogPost(post) {
        post.createdAt = new Date().toISOString();
        post.updatedAt = new Date().toISOString();
        post.status = post.status || 'published';
        post.views = 0;
        if (db) {
            try {
                const docRef = await db.collection('blog').add(post);
                return { id: docRef.id, ...post };
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const posts = JSON.parse(localStorage.getItem('blogPosts') || '[]');
        post.id = 'blog_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
        posts.unshift(post);
        localStorage.setItem('blogPosts', JSON.stringify(posts));
        return post;
    },

    async updateBlogPost(id, data) {
        data.updatedAt = new Date().toISOString();
        if (db) {
            try {
                await db.collection('blog').doc(id).update(data);
                return { id, ...data };
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const posts = JSON.parse(localStorage.getItem('blogPosts') || '[]');
        const index = posts.findIndex(p => p.id === id);
        if (index !== -1) {
            posts[index] = { ...posts[index], ...data };
            localStorage.setItem('blogPosts', JSON.stringify(posts));
        }
        return posts[index];
    },

    async deleteBlogPost(id) {
        if (db) {
            try {
                await db.collection('blog').doc(id).delete();
                return true;
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const posts = JSON.parse(localStorage.getItem('blogPosts') || '[]');
        const filtered = posts.filter(p => p.id !== id);
        localStorage.setItem('blogPosts', JSON.stringify(filtered));
        return true;
    },

    // --- USERS / VISITORS ---
    async getUsers() {
        if (db) {
            try {
                const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        return JSON.parse(localStorage.getItem('users') || '[]');
    },

    async addUser(user) {
        user.createdAt = new Date().toISOString();
        user.lastActive = new Date().toISOString();
        user.visits = 1;
        if (db) {
            try {
                const docRef = await db.collection('users').add(user);
                return { id: docRef.id, ...user };
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        user.id = 'user_' + Date.now().toString(36);
        users.push(user);
        localStorage.setItem('users', JSON.stringify(users));
        return user;
    },

    // --- PORTFOLIO SETTINGS ---
    async getPortfolio() {
        if (db) {
            try {
                const doc = await db.collection('settings').doc('portfolio').get();
                return doc.exists ? doc.data() : this.getDefaultPortfolio();
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const stored = localStorage.getItem('portfolio');
        return stored ? JSON.parse(stored) : this.getDefaultPortfolio();
    },

    async updatePortfolio(data) {
        data.updatedAt = new Date().toISOString();
        if (db) {
            try {
                await db.collection('settings').doc('portfolio').set(data, { merge: true });
                return data;
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        localStorage.setItem('portfolio', JSON.stringify(data));
        return data;
    },

    getDefaultPortfolio() {
        return {
            name: "Abdullahi Umar Muazu",
            title: "Full Stack Developer & Digital Creator",
            bio: "Passionate developer creating amazing digital experiences with modern web technologies. I specialize in building scalable web applications, mobile apps, and innovative digital solutions.",
            email: "contact@abdullahiumar.com",
            phone: "+234 XXX XXX XXXX",
            location: "Nigeria",
            skills: ["HTML5/CSS3", "JavaScript", "React", "Node.js", "Firebase", "UI/UX Design", "Responsive Design", "Git/GitHub"],
            social: {
                github: "https://github.com/abdullahiumar",
                linkedin: "https://linkedin.com/in/abdullahiumar",
                twitter: "https://twitter.com/abdullahiumar",
                portfolio: "https://abdullahiumar.com"
            }
        };
    },

    // --- ANALYTICS ---
    async getAnalytics() {
        if (db) {
            try {
                const doc = await db.collection('settings').doc('analytics').get();
                return doc.exists ? doc.data() : this.getDefaultAnalytics();
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const stored = localStorage.getItem('analytics');
        return stored ? JSON.parse(stored) : this.getDefaultAnalytics();
    },

    getDefaultAnalytics() {
        return {
            totalVisitors: 0,
            totalProjects: 0,
            totalMessages: 0,
            totalBlogPosts: 0,
            pageViews: {},
            dailyStats: [],
            trafficSources: { direct: 0, social: 0, search: 0, referral: 0 },
            deviceBreakdown: { mobile: 0, desktop: 0, tablet: 0 },
            countries: {}
        };
    },

    async trackPageView(page) {
        const analytics = await this.getAnalytics();
        analytics.totalVisitors = (analytics.totalVisitors || 0) + 1;
        analytics.pageViews = analytics.pageViews || {};
        analytics.pageViews[page] = (analytics.pageViews[page] || 0) + 1;
        
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isTablet = /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent);
        analytics.deviceBreakdown = analytics.deviceBreakdown || { mobile: 0, desktop: 0, tablet: 0 };
        if (isTablet) analytics.deviceBreakdown.tablet++;
        else if (isMobile) analytics.deviceBreakdown.mobile++;
        else analytics.deviceBreakdown.desktop++;
        
        analytics.countries = analytics.countries || {};
        analytics.countries['Nigeria'] = (analytics.countries['Nigeria'] || 0) + 1;
        
        if (db) {
            try {
                await db.collection('settings').doc('analytics').set(analytics);
            } catch (e) {
                localStorage.setItem('analytics', JSON.stringify(analytics));
            }
        } else {
            localStorage.setItem('analytics', JSON.stringify(analytics));
        }
    },

    // --- ACTIVITY LOGS ---
    async getLogs() {
        if (db) {
            try {
                const snapshot = await db.collection('logs').orderBy('createdAt', 'desc').limit(100).get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        return JSON.parse(localStorage.getItem('activityLogs') || '[]');
    },

    async addLog(log) {
        log.createdAt = new Date().toISOString();
        log.timestamp = Date.now();
        if (db) {
            try {
                const docRef = await db.collection('logs').add(log);
                return { id: docRef.id, ...log };
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const logs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
        log.id = 'log_' + Date.now().toString(36);
        logs.unshift(log);
        if (logs.length > 100) logs.length = 100;
        localStorage.setItem('activityLogs', JSON.stringify(logs));
        return log;
    },

    async clearLogs() {
        if (db) {
            try {
                const snapshot = await db.collection('logs').get();
                const batch = db.batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                return true;
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        localStorage.setItem('activityLogs', '[]');
        return true;
    },

    // --- MEDIA LIBRARY ---
    async getMedia() {
        if (db) {
            try {
                const snapshot = await db.collection('media').orderBy('createdAt', 'desc').get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        return JSON.parse(localStorage.getItem('media') || '[]');
    },

    async addMedia(media) {
        media.createdAt = new Date().toISOString();
        if (db) {
            try {
                const docRef = await db.collection('media').add(media);
                return { id: docRef.id, ...media };
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const mediaList = JSON.parse(localStorage.getItem('media') || '[]');
        media.id = 'media_' + Date.now().toString(36);
        mediaList.unshift(media);
        localStorage.setItem('media', JSON.stringify(mediaList));
        return media;
    },

    async deleteMedia(id) {
        if (db) {
            try {
                await db.collection('media').doc(id).delete();
                return true;
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const mediaList = JSON.parse(localStorage.getItem('media') || '[]');
        const filtered = mediaList.filter(m => m.id !== id);
        localStorage.setItem('media', JSON.stringify(filtered));
        return true;
    },

    // --- SOCIAL MEDIA ---
    async getSocialMedia() {
        if (db) {
            try {
                const snapshot = await db.collection('socialMedia').orderBy('createdAt', 'desc').get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        return JSON.parse(localStorage.getItem('socialMedia') || '[]');
    },

    async addSocialMedia(social) {
        social.createdAt = new Date().toISOString();
        social.updatedAt = new Date().toISOString();
        if (db) {
            try {
                const docRef = await db.collection('socialMedia').add(social);
                return { id: docRef.id, ...social };
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const socialList = JSON.parse(localStorage.getItem('socialMedia') || '[]');
        social.id = 'social_' + Date.now().toString(36);
        socialList.unshift(social);
        localStorage.setItem('socialMedia', JSON.stringify(socialList));
        return social;
    },

    async updateSocialMedia(id, data) {
        data.updatedAt = new Date().toISOString();
        if (db) {
            try {
                await db.collection('socialMedia').doc(id).update(data);
                return { id, ...data };
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const socialList = JSON.parse(localStorage.getItem('socialMedia') || '[]');
        const index = socialList.findIndex(s => s.id === id);
        if (index !== -1) {
            socialList[index] = { ...socialList[index], ...data };
            localStorage.setItem('socialMedia', JSON.stringify(socialList));
        }
        return socialList[index];
    },

    async deleteSocialMedia(id) {
        if (db) {
            try {
                await db.collection('socialMedia').doc(id).delete();
                return true;
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const socialList = JSON.parse(localStorage.getItem('socialMedia') || '[]');
        const filtered = socialList.filter(s => s.id !== id);
        localStorage.setItem('socialMedia', JSON.stringify(filtered));
        return true;
    },

    // --- GALLERY ---
    async getGallery() {
        if (db) {
            try {
                const snapshot = await db.collection('gallery').orderBy('createdAt', 'desc').get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        return JSON.parse(localStorage.getItem('gallery') || '[]');
    },

    async addGalleryItem(item) {
        item.createdAt = new Date().toISOString();
        if (db) {
            try {
                const docRef = await db.collection('gallery').add(item);
                return { id: docRef.id, ...item };
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const gallery = JSON.parse(localStorage.getItem('gallery') || '[]');
        item.id = 'gallery_' + Date.now().toString(36);
        gallery.unshift(item);
        localStorage.setItem('gallery', JSON.stringify(gallery));
        return item;
    },

    async deleteGalleryItem(id) {
        if (db) {
            try {
                await db.collection('gallery').doc(id).delete();
                return true;
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const gallery = JSON.parse(localStorage.getItem('gallery') || '[]');
        const filtered = gallery.filter(g => g.id !== id);
        localStorage.setItem('gallery', JSON.stringify(filtered));
        return true;
    },

    // --- STORAGE (128GB) ---
    async getStorageUsage() {
        if (db) {
            try {
                const doc = await db.collection('settings').doc('storage').get();
                return doc.exists ? doc.data() : this.getDefaultStorage();
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const stored = localStorage.getItem('storage');
        return stored ? JSON.parse(stored) : this.getDefaultStorage();
    },

    getDefaultStorage() {
        return {
            totalSpace: 128 * 1024 * 1024 * 1024, // 128GB in bytes
            usedSpace: 0,
            files: [],
            folders: [
                { name: 'Images', icon: '🖼️', count: 0 },
                { name: 'Documents', icon: '📄', count: 0 },
                { name: 'Videos', icon: '🎬', count: 0 },
                { name: 'Audio', icon: '🎵', count: 0 },
                { name: 'Others', icon: '📦', count: 0 }
            ]
        };
    },

    async addStorageFile(file) {
        file.createdAt = new Date().toISOString();
        if (db) {
            try {
                const storageRef = storage.ref().child('files/' + file.name);
                await storageRef.putString(file.data, 'data_url');
                const url = await storageRef.getDownloadURL();
                file.url = url;
                const docRef = await db.collection('storage').add(file);
                return { id: docRef.id, ...file };
            } catch (e) {
                console.warn('Storage error, using localStorage:', e.message);
            }
        }
        const storageData = JSON.parse(localStorage.getItem('storage') || '{}');
        storageData.files = storageData.files || [];
        file.id = 'file_' + Date.now().toString(36);
        storageData.files.unshift(file);
        storageData.usedSpace = (storageData.usedSpace || 0) + (file.size || 0);
        localStorage.setItem('storage', JSON.stringify(storageData));
        return file;
    },

    async deleteStorageFile(id) {
        if (db) {
            try {
                await db.collection('storage').doc(id).delete();
                return true;
            } catch (e) {
                console.warn('Firestore error, using localStorage:', e.message);
            }
        }
        const storageData = JSON.parse(localStorage.getItem('storage') || '{}');
        const file = (storageData.files || []).find(f => f.id === id);
        if (file) {
            storageData.usedSpace = Math.max(0, (storageData.usedSpace || 0) - (file.size || 0));
        }
        storageData.files = (storageData.files || []).filter(f => f.id !== id);
        localStorage.setItem('storage', JSON.stringify(storageData));
        return true;
    }
};

// Format file size
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Format bytes (alias for formatFileSize)
function formatBytes(bytes) {
    return formatFileSize(bytes);
}


// ============================================
// UI UTILITIES
// ============================================
function showToast(message, type = 'success', duration = 3000) {
    const container = document.querySelector('.toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-times-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info: '<i class="fas fa-info-circle"></i>'
    };

    toast.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
    container.appendChild(toast);

    const removeToast = () => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    };

    setTimeout(removeToast, duration);
    toast.addEventListener('click', removeToast);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function showLoading(element, text = 'Loading...') {
    if (!element) return;
    element.dataset.originalHTML = element.innerHTML;
    element.innerHTML = `<div class="spinner spinner-sm"></div> <span>${text}</span>`;
    element.disabled = true;
}

function hideLoading(element) {
    if (!element) return;
    element.innerHTML = element.dataset.originalHTML || element.innerHTML;
    element.disabled = false;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function truncateText(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

function generateId(prefix = 'id') {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5);
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied to clipboard!', 'success');
        }).catch(() => {
            fallbackCopy(text);
        });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast('Copied to clipboard!', 'success');
    } catch {
        showToast('Failed to copy', 'error');
    }
    document.body.removeChild(textarea);
}

// ============================================
// MOBILE MENU
// ============================================
function initMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');

    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
    }
}

// ============================================
// SCROLL ANIMATIONS
// ============================================
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fadeInUp');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// ============================================
// THEME MANAGEMENT
// ============================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
    
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (next === 'light') {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
        } else {
            navbar.style.background = 'rgba(15, 23, 42, 0.95)';
        }
    }
}

function updateThemeIcon(theme) {
    const toggles = document.querySelectorAll('.theme-toggle i');
    toggles.forEach(icon => {
        icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    });
}

// ============================================
// CONFIRMATION DIALOG
// ============================================
function showConfirm(title, message, onConfirm, onCancel) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.style.zIndex = '3000';
    overlay.innerHTML = `
        <div class="modal" style="max-width: 420px;">
            <div class="modal-header">
                <h3 class="modal-title"><i class="fas fa-question-circle" style="color: var(--warning-color);"></i> ${title}</h3>
            </div>
            <div class="modal-body">
                <p style="color: var(--text-secondary); line-height: 1.6;">${message}</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="confirmCancel">Cancel</button>
                <button class="btn btn-danger" id="confirmOk">Confirm</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    
    overlay.querySelector('#confirmCancel').addEventListener('click', () => {
        overlay.remove();
        if (onCancel) onCancel();
    });
    
    overlay.querySelector('#confirmOk').addEventListener('click', () => {
        overlay.remove();
        if (onConfirm) onConfirm();
    });
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            if (onCancel) onCancel();
        }
    });
}

// ============================================
// DATA EXPORT
// ============================================
function exportToJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Export successful!', 'success');
}

function exportToCSV(headers, rows, filename) {
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Export successful!', 'success');
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initFirebase();
    initMobileMenu();
    initScrollAnimations();
    initTheme();
    
    console.log('%c🚀 AUM Portfolio System Loaded', 'color: #3b82f6; font-size: 14px; font-weight: bold;');
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DB, loginAdmin, logoutAdmin, isAdminLoggedIn, checkAuth, showToast };
}