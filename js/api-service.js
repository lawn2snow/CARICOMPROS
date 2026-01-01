/**
 * Hidden Kingz Platform - Production API Service
 * Version: 1.0.0
 *
 * Unified API service for Google Apps Script backend
 * with n8n webhook fallback support
 */

const CariComProsAPI = {
    // ===========================================
    // CONFIGURATION - PRODUCTION
    // ===========================================
    config: {
        // Google Apps Script Web App URL (Primary)
        appsScriptUrl: 'https://script.google.com/macros/s/AKfycbysC3WJJHPGBUkNTFaubsshTB7TjhEip5HcbnwAsPIXPe6eOEZtmkMVo5ovbW62oQLZ/exec',

        // n8n Webhook Base URL (Secondary/Fallback) - Update with your n8n instance
        n8nBaseUrl: '',

        // Primary backend: 'appsScript' or 'n8n'
        primaryBackend: 'appsScript',

        // Enable fallback to secondary backend on failure
        enableFallback: false,

        // Request timeout in milliseconds
        timeout: 30000,

        // Debug mode (set to false in production)
        debug: false,

        // Version
        version: '1.0.0'
    },

    // ===========================================
    // INTERNAL UTILITIES
    // ===========================================

    log(message, data = null) {
        if (this.config.debug) {
            console.log(`[CariComProsAPI] ${message}`, data || '');
        }
    },

    // Generic request handler - uses GET with URL params to avoid CORS preflight
    async request(action, method = 'GET', data = null) {
        const url = this.config.appsScriptUrl;

        // For Google Apps Script, always use GET with URL parameters to avoid CORS preflight
        // POST data is sent as a 'payload' parameter
        const params = new URLSearchParams();
        params.append('action', action);

        if (method === 'POST' && data) {
            // Send POST data as JSON string in 'payload' parameter
            params.append('payload', JSON.stringify(data));
        } else if (data) {
            // For GET, add each parameter
            Object.keys(data).forEach(key => {
                if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
                    params.append(key, data[key]);
                }
            });
        }

        const requestUrl = `${url}?${params.toString()}`;

        this.log(`${method} ${action}`, data);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

            const response = await fetch(requestUrl, {
                method: 'GET',  // Always GET to avoid CORS preflight
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            this.log('Response:', result);
            return result;

        } catch (error) {
            this.log('Request failed:', error.message);

            // Return error object instead of throwing
            return {
                success: false,
                error: error.message || 'Request failed'
            };
        }
    },

    // ===========================================
    // AUTHENTICATION
    // ===========================================

    /**
     * Login user by email
     */
    async login(email, password) {
        if (!email) {
            return { success: false, error: 'Email is required' };
        }

        const result = await this.request('loginUser', 'POST', {
            email: email.trim().toLowerCase(),
            password: password || ''
        });

        if (result.success && result.user) {
            this.setUserData({
                id: result.user.id,
                name: result.user.name,
                email: result.user.email,
                phone: result.user.phone,
                location: result.user.location,
                category: result.user.category,
                businessName: result.user.businessName,
                type: result.user.type,
                rating: result.user.rating,
                verified: result.user.verified
            });
        }

        return result;
    },

    /**
     * Register a new customer
     */
    async registerCustomer(data) {
        if (!data.name || !data.email) {
            return { success: false, error: 'Name and email are required' };
        }

        // Validate email format
        if (!this.isValidEmail(data.email)) {
            return { success: false, error: 'Please enter a valid email address' };
        }

        // Validate phone if provided
        if (data.phone && !this.isValidPhone(data.phone)) {
            return { success: false, error: 'Please enter a valid phone number' };
        }

        const result = await this.request('registerCustomer', 'POST', {
            name: this.sanitizeString(data.name.trim(), 100),
            email: data.email.trim().toLowerCase(),
            phone: data.phone ? data.phone.trim() : '',
            location: data.location || ''
        });

        if (result.success && result.customerId) {
            this.setUserData({
                id: result.customerId,
                name: data.name,
                email: data.email,
                phone: data.phone,
                location: data.location,
                type: 'customer'
            });
        }

        return result;
    },

    /**
     * Register a new contractor
     */
    async registerContractor(data) {
        if (!data.name || !data.email || !data.category) {
            return { success: false, error: 'Name, email, and category are required' };
        }

        // Validate email format
        if (!this.isValidEmail(data.email)) {
            return { success: false, error: 'Please enter a valid email address' };
        }

        // Validate phone if provided
        if (data.phone && !this.isValidPhone(data.phone)) {
            return { success: false, error: 'Please enter a valid phone number' };
        }

        const result = await this.request('registerContractor', 'POST', {
            name: this.sanitizeString(data.name.trim(), 100),
            email: data.email.trim().toLowerCase(),
            phone: data.phone ? data.phone.trim() : '',
            category: data.category,
            location: data.location || '',
            businessName: this.sanitizeString(data.businessName || '', 150),
            experience: data.experience || '',
            bio: this.sanitizeString(data.bio || '', 2000)
        });

        if (result.success && result.contractorId) {
            this.setUserData({
                id: result.contractorId,
                name: data.name,
                email: data.email,
                phone: data.phone,
                category: data.category,
                location: data.location,
                businessName: data.businessName,
                type: 'contractor'
            });
        }

        return result;
    },

    // ===========================================
    // JOB MANAGEMENT
    // ===========================================

    /**
     * Create a new job posting
     */
    async createJob(data) {
        if (!data.title || !data.category || !data.description) {
            return { success: false, error: 'Title, category, and description are required' };
        }

        const user = this.getUserData();

        return this.request('createJob', 'POST', {
            customerId: data.customerId || user?.id || '',
            customerName: data.customerName || user?.name || '',
            customerEmail: data.customerEmail || user?.email || '',
            customerPhone: data.customerPhone || user?.phone || '',
            title: data.title.trim(),
            description: data.description.trim(),
            category: data.category,
            location: data.location || user?.location || '',
            budget: data.budget || '',
            urgency: data.urgency || 'Medium'
        });
    },

    /**
     * Get jobs with optional filters
     */
    async getJobs(filters = {}) {
        return this.request('getJobs', 'GET', {
            status: filters.status || '',
            category: filters.category || '',
            location: filters.location || '',
            customerId: filters.customerId || ''
        });
    },

    /**
     * Get a single job by ID
     */
    async getJob(jobId) {
        return this.request('getJob', 'GET', { jobId: jobId });
    },

    /**
     * Complete a job
     */
    async completeJob(jobId, contractorId, amount) {
        return this.request('completeJob', 'POST', {
            jobId: jobId,
            contractorId: contractorId,
            amount: amount
        });
    },

    // ===========================================
    // QUOTE MANAGEMENT
    // ===========================================

    /**
     * Submit a quote for a job
     */
    async submitQuote(data) {
        if (!data.jobId || !data.amount) {
            return { success: false, error: 'Job ID and amount are required' };
        }

        const user = this.getUserData();

        return this.request('submitQuote', 'POST', {
            jobId: data.jobId,
            contractorId: data.contractorId || user?.id || '',
            contractorName: data.contractorName || user?.name || '',
            amount: data.amount,
            message: data.message || '',
            timeline: data.timeline || ''
        });
    },

    /**
     * Accept a quote
     */
    async acceptQuote(quoteId, jobId, contractorId) {
        return this.request('acceptQuote', 'POST', {
            quoteId: quoteId,
            jobId: jobId,
            contractorId: contractorId
        });
    },

    /**
     * Get quotes for a job
     */
    async getQuotes(jobId) {
        return this.request('getQuotes', 'GET', { jobId: jobId });
    },

    // ===========================================
    // CONTRACTOR MANAGEMENT
    // ===========================================

    /**
     * Get contractors with optional filters
     */
    async getContractors(filters = {}) {
        return this.request('getContractors', 'GET', {
            category: filters.category || '',
            location: filters.location || '',
            verified: filters.verified || ''
        });
    },

    /**
     * Get a single contractor by ID
     */
    async getContractor(contractorId) {
        return this.request('getContractor', 'GET', { contractorId: contractorId });
    },

    // ===========================================
    // MESSAGING
    // ===========================================

    /**
     * Send a message
     */
    async sendMessage(data) {
        if (!data.toId || !data.message) {
            return { success: false, error: 'Recipient and message are required' };
        }

        const user = this.getUserData();

        return this.request('sendMessage', 'POST', {
            fromId: data.fromId || user?.id || '',
            toId: data.toId,
            jobId: data.jobId || '',
            message: data.message.trim()
        });
    },

    /**
     * Get messages for current user
     */
    async getMessages(userId) {
        const user = this.getUserData();
        return this.request('getMessages', 'GET', {
            userId: userId || user?.id || ''
        });
    },

    // ===========================================
    // REVIEWS
    // ===========================================

    /**
     * Submit a review
     */
    async submitReview(data) {
        if (!data.contractorId || !data.rating) {
            return { success: false, error: 'Contractor ID and rating are required' };
        }

        const user = this.getUserData();

        return this.request('submitReview', 'POST', {
            jobId: data.jobId || '',
            contractorId: data.contractorId,
            customerId: data.customerId || user?.id || '',
            rating: data.rating,
            comment: data.comment || ''
        });
    },

    /**
     * Get reviews for a contractor
     */
    async getReviews(contractorId) {
        return this.request('getReviews', 'GET', { contractorId: contractorId });
    },

    // ===========================================
    // PLATFORM STATS
    // ===========================================

    /**
     * Get platform statistics
     */
    async getStats() {
        return this.request('getStats', 'GET');
    },

    // ===========================================
    // USER SESSION MANAGEMENT
    // ===========================================

    /**
     * Store user data in localStorage
     */
    setUserData(userData) {
        if (!userData) return;
        localStorage.setItem('hk_user', JSON.stringify(userData));
        localStorage.setItem('hk_user_type', userData.type || 'customer');
        localStorage.setItem('hk_user_id', userData.id || '');
        localStorage.setItem('hk_logged_in', 'true');
    },

    /**
     * Get user data from localStorage
     */
    getUserData() {
        try {
            const data = localStorage.getItem('hk_user');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Get user type
     */
    getUserType() {
        return localStorage.getItem('hk_user_type') || 'customer';
    },

    /**
     * Get user ID
     */
    getUserId() {
        return localStorage.getItem('hk_user_id') || '';
    },

    /**
     * Clear user data (logout)
     */
    logout() {
        localStorage.removeItem('hk_user');
        localStorage.removeItem('hk_user_type');
        localStorage.removeItem('hk_user_id');
        localStorage.removeItem('hk_logged_in');
        window.location.href = 'index.html';
    },

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return localStorage.getItem('hk_logged_in') === 'true' && !!this.getUserId();
    },

    /**
     * Require authentication - redirect if not logged in
     */
    requireAuth(redirectUrl = 'index.html') {
        if (!this.isLoggedIn()) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    },

    // ===========================================
    // UI HELPERS
    // ===========================================

    /**
     * Currency mapping by Caribbean location
     */
    currencyByLocation: {
        'Antigua & Barbuda': { code: 'XCD', symbol: 'EC$', name: 'Eastern Caribbean Dollar' },
        'Anguilla': { code: 'XCD', symbol: 'EC$', name: 'Eastern Caribbean Dollar' },
        'Bahamas': { code: 'BSD', symbol: 'B$', name: 'Bahamian Dollar' },
        'Barbados': { code: 'BBD', symbol: 'Bds$', name: 'Barbadian Dollar' },
        'British Virgin Islands': { code: 'USD', symbol: '$', name: 'US Dollar' },
        'Cayman Islands': { code: 'KYD', symbol: 'CI$', name: 'Cayman Islands Dollar' },
        'Dominica': { code: 'XCD', symbol: 'EC$', name: 'Eastern Caribbean Dollar' },
        'Dominican Republic': { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso' },
        'Grenada': { code: 'XCD', symbol: 'EC$', name: 'Eastern Caribbean Dollar' },
        'Guadeloupe': { code: 'EUR', symbol: '€', name: 'Euro' },
        'Haiti': { code: 'HTG', symbol: 'G', name: 'Haitian Gourde' },
        'Jamaica': { code: 'JMD', symbol: 'J$', name: 'Jamaican Dollar' },
        'Martinique': { code: 'EUR', symbol: '€', name: 'Euro' },
        'Montserrat': { code: 'XCD', symbol: 'EC$', name: 'Eastern Caribbean Dollar' },
        'Puerto Rico': { code: 'USD', symbol: '$', name: 'US Dollar' },
        'St. Kitts & Nevis': { code: 'XCD', symbol: 'EC$', name: 'Eastern Caribbean Dollar' },
        'St. Lucia': { code: 'XCD', symbol: 'EC$', name: 'Eastern Caribbean Dollar' },
        'St. Maarten': { code: 'ANG', symbol: 'NAƒ', name: 'Netherlands Antillean Guilder' },
        'St. Vincent & Grenadines': { code: 'XCD', symbol: 'EC$', name: 'Eastern Caribbean Dollar' },
        'Trinidad & Tobago': { code: 'TTD', symbol: 'TT$', name: 'Trinidad & Tobago Dollar' },
        'Turks & Caicos': { code: 'USD', symbol: '$', name: 'US Dollar' },
        'US Virgin Islands': { code: 'USD', symbol: '$', name: 'US Dollar' }
    },

    /**
     * Get currency info for a location
     */
    getCurrencyForLocation(location) {
        return this.currencyByLocation[location] || { code: 'USD', symbol: '$', name: 'US Dollar' };
    },

    /**
     * Format currency based on location
     */
    formatCurrency(amount, location = null) {
        const num = parseFloat(amount) || 0;
        const currency = location ? this.getCurrencyForLocation(location) : { code: 'USD', symbol: '$' };

        // Format number with commas
        const formatted = num.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });

        return `${currency.symbol}${formatted}`;
    },

    /**
     * Format currency with code (e.g., "EC$500 XCD")
     */
    formatCurrencyFull(amount, location = null) {
        const num = parseFloat(amount) || 0;
        const currency = location ? this.getCurrencyForLocation(location) : { code: 'USD', symbol: '$' };

        const formatted = num.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });

        return `${currency.symbol}${formatted} ${currency.code}`;
    },

    /**
     * Format date
     */
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    /**
     * Format relative time
     */
    formatRelativeTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return this.formatDate(dateString);
    },

    /**
     * Get initials from name
     */
    getInitials(name) {
        if (!name) return '??';
        return name.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    /**
     * Validate email format
     */
    isValidEmail(email) {
        if (!email) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    },

    /**
     * Validate phone number (basic validation)
     */
    isValidPhone(phone) {
        if (!phone) return true; // Phone is optional
        const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;
        return phoneRegex.test(phone.trim());
    },

    /**
     * Sanitize string for safe storage
     */
    sanitizeString(str, maxLength = 1000) {
        if (!str) return '';
        return String(str)
            .trim()
            .substring(0, maxLength)
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '');
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 4000) {
        // Sanitize message to prevent XSS
        const safeMessage = this.escapeHtml(message);
        // Remove existing toasts
        document.querySelectorAll('.hk-toast').forEach(t => t.remove());

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#FF9800',
            info: '#2196F3'
        };

        const toast = document.createElement('div');
        toast.className = 'hk-toast';
        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span>${safeMessage}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${colors[type] || colors.info};
            color: white;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 0.75rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.25);
            z-index: 10000;
            animation: hkSlideIn 0.3s ease;
            max-width: 400px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;

        toast.querySelector('button').style.cssText = `
            background: none;
            border: none;
            color: white;
            font-size: 1.25rem;
            cursor: pointer;
            padding: 0;
            margin-left: 0.5rem;
            opacity: 0.8;
        `;

        document.body.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => {
                toast.style.animation = 'hkSlideOut 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }
    },

    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        this.hideLoading();
        const safeMessage = this.escapeHtml(message);

        const overlay = document.createElement('div');
        overlay.id = 'hk-loading-overlay';
        overlay.innerHTML = `
            <div class="hk-loading-content">
                <div class="hk-spinner"></div>
                <p>${safeMessage}</p>
            </div>
        `;
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(26, 26, 46, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;

        const content = overlay.querySelector('.hk-loading-content');
        content.style.cssText = `
            text-align: center;
            color: white;
        `;

        const spinner = overlay.querySelector('.hk-spinner');
        spinner.style.cssText = `
            width: 50px;
            height: 50px;
            border: 4px solid rgba(255,215,0,0.3);
            border-top-color: #ffd700;
            border-radius: 50%;
            animation: hkSpin 1s linear infinite;
            margin: 0 auto 1rem;
        `;

        document.body.appendChild(overlay);
    },

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('hk-loading-overlay');
        if (overlay) overlay.remove();
    },

    /**
     * Confirm dialog
     */
    async confirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const result = window.confirm(message);
            resolve(result);
        });
    },

    // ===========================================
    // MARKETPLACE
    // ===========================================

    /**
     * Get marketplace categories with counts
     */
    async getMarketplaceCategories() {
        return this.request('getMarketplaceCategories', 'GET');
    },

    /**
     * Get marketplace listings with optional filters
     */
    async getListings(filters = {}) {
        return this.request('getListings', 'GET', {
            category: filters.category || '',
            condition: filters.condition || '',
            location: filters.location || '',
            minPrice: filters.minPrice || '',
            maxPrice: filters.maxPrice || '',
            search: filters.search || ''
        });
    },

    /**
     * Get a single listing by ID
     */
    async getListing(listingId) {
        return this.request('getListing', 'GET', { listingId: listingId });
    },

    /**
     * Get current user's listings
     */
    async getMyListings() {
        const user = this.getUserData();
        if (!user) {
            return { success: false, error: 'Not logged in' };
        }
        return this.request('getMyListings', 'GET', {
            sellerId: user.id,
            sellerType: user.type
        });
    },

    /**
     * Create a new listing
     */
    async createListing(data) {
        if (!data.title || data.price === undefined || !data.category) {
            return { success: false, error: 'Title, price, and category are required' };
        }

        const user = this.getUserData();
        if (!user) {
            return { success: false, error: 'You must be logged in to create a listing' };
        }

        // Validate title length
        if (data.title.trim().length < 3) {
            return { success: false, error: 'Title must be at least 3 characters' };
        }

        // Validate price
        const price = parseFloat(data.price);
        if (isNaN(price) || price < 0) {
            return { success: false, error: 'Please enter a valid price' };
        }

        return this.request('createListing', 'POST', {
            sellerId: user.id,
            sellerType: user.type,
            sellerName: user.name || user.businessName || '',
            sellerEmail: user.email || '',
            title: this.sanitizeString(data.title.trim(), 100),
            description: this.sanitizeString(data.description || '', 2000),
            price: price,
            category: data.category,
            condition: data.condition || 'Good',
            location: data.location || user.location || '',
            images: data.images || []
        });
    },

    /**
     * Update an existing listing
     */
    async updateListing(listingId, data) {
        const user = this.getUserData();
        if (!user) {
            return { success: false, error: 'Not logged in' };
        }

        return this.request('updateListing', 'POST', {
            listingId: listingId,
            userId: user.id,
            title: data.title,
            description: data.description,
            price: data.price,
            category: data.category,
            condition: data.condition,
            location: data.location,
            images: data.images,
            status: data.status
        });
    },

    /**
     * Mark a listing as sold
     */
    async markListingAsSold(listingId) {
        const user = this.getUserData();
        if (!user) {
            return { success: false, error: 'Not logged in' };
        }

        return this.request('markListingAsSold', 'POST', {
            listingId: listingId,
            userId: user.id
        });
    },

    /**
     * Delete a listing
     */
    async deleteListing(listingId) {
        const user = this.getUserData();
        if (!user) {
            return { success: false, error: 'Not logged in' };
        }

        return this.request('deleteListing', 'POST', {
            listingId: listingId,
            userId: user.id
        });
    },

    /**
     * Send message to seller about a listing
     */
    async sendListingMessage(listingId, message) {
        const user = this.getUserData();
        if (!user) {
            return { success: false, error: 'You must be logged in to contact a seller' };
        }

        return this.request('sendListingMessage', 'POST', {
            listingId: listingId,
            fromId: user.id,
            message: message
        });
    },

    /**
     * Get marketplace statistics
     */
    async getMarketplaceStats() {
        return this.request('getMarketplaceStats', 'GET');
    },

    // ===========================================
    // IMAGE UTILITIES
    // ===========================================

    /**
     * Convert file to base64
     */
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    /**
     * Compress image for upload
     * Returns base64 string of compressed image
     */
    async compressImage(file, maxWidth = 800, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                let { width, height } = img;

                // Calculate new dimensions
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);
                const base64 = canvas.toDataURL('image/jpeg', quality);
                resolve(base64);
            };

            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    },

    /**
     * Process multiple images for upload
     * Compresses and returns array of base64 strings
     */
    async processImages(files, maxImages = 5, maxWidth = 800, quality = 0.7) {
        const images = [];
        const filesToProcess = Array.from(files).slice(0, maxImages);

        for (const file of filesToProcess) {
            try {
                // Only process image files
                if (!file.type.startsWith('image/')) continue;

                // Check file size (skip if over 10MB)
                if (file.size > 10 * 1024 * 1024) {
                    console.warn(`Skipping ${file.name}: file too large`);
                    continue;
                }

                const compressed = await this.compressImage(file, maxWidth, quality);
                images.push(compressed);
            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
            }
        }

        return images;
    }
};

// Add CSS animations
const hkStyles = document.createElement('style');
hkStyles.textContent = `
    @keyframes hkSlideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes hkSlideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    @keyframes hkSpin {
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(hkStyles);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CariComProsAPI;
}
