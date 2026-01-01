/**
 * Hidden Kingz - Production Index Page Script
 * Live stats, authentication, and real-time data
 */

// ===========================================
// LIVE STATISTICS
// ===========================================

// Default category data structure (will be populated from API)
const categoryConfig = {
    'Plumbing': { icon: 'fa-faucet', color: '#2196F3' },
    'Electrical': { icon: 'fa-bolt', color: '#FF9800' },
    'Landscaping': { icon: 'fa-leaf', color: '#4CAF50' },
    'Cleaning': { icon: 'fa-broom', color: '#9C27B0' },
    'HVAC': { icon: 'fa-wind', color: '#00BCD4' },
    'Carpentry': { icon: 'fa-hammer', color: '#795548' },
    'Painting': { icon: 'fa-paint-roller', color: '#E91E63' },
    'Roofing': { icon: 'fa-home', color: '#607D8B' },
    'Security': { icon: 'fa-shield-alt', color: '#F44336' },
    'Moving': { icon: 'fa-truck', color: '#673AB7' },
    'Auto Repair': { icon: 'fa-car', color: '#3F51B5' },
    'Beauty': { icon: 'fa-spa', color: '#E91E63' },
    'Catering': { icon: 'fa-utensils', color: '#FF5722' },
    'Photography': { icon: 'fa-camera', color: '#9E9E9E' },
    'Tutoring': { icon: 'fa-graduation-cap', color: '#03A9F4' },
    'General': { icon: 'fa-tools', color: '#757575' }
};

let liveStatsData = null;
let statsRefreshInterval = null;

/**
 * Fetch live statistics from API
 */
async function fetchLiveStats() {
    try {
        const result = await CariComProsAPI.request('getLiveStats', 'GET');
        if (result.success) {
            liveStatsData = result;
            updateStatsDisplay(result);
        }
    } catch (error) {
        console.error('Error fetching live stats:', error);
    }
}

/**
 * Update the display with live statistics
 */
function updateStatsDisplay(data) {
    // Update hero stats
    const totalProsEl = document.getElementById('total-pros');
    const totalJobsEl = document.getElementById('total-jobs');
    const totalCustomersEl = document.getElementById('total-customers');

    if (totalProsEl) totalProsEl.textContent = formatNumber(data.contractors?.total || 0);
    if (totalJobsEl) totalJobsEl.textContent = formatNumber(data.jobs?.completed || 0);
    if (totalCustomersEl) totalCustomersEl.textContent = formatNumber(data.customers?.total || 0);

    // Update category cards with live contractor counts
    updateCategoryCards(data.contractors?.byCategory || {});
}

/**
 * Update category cards with live counts
 */
function updateCategoryCards(categoryData) {
    // Update all category cards with data-category attribute
    document.querySelectorAll('.category-card[data-category]').forEach(card => {
        const category = card.getAttribute('data-category');
        const countEl = card.querySelector('.category-count');

        if (countEl) {
            const count = categoryData[category]?.total || 0;
            countEl.textContent = `${formatNumber(count)} Pro${count !== 1 ? 's' : ''}`;
        }
    });

    // Fallback: Update by category name if no data-category attribute
    document.querySelectorAll('.category-card:not([data-category])').forEach(card => {
        const categoryName = card.querySelector('.category-name')?.textContent;
        const countEl = card.querySelector('.category-count');

        if (categoryName && countEl) {
            const count = categoryData[categoryName]?.total || 0;
            countEl.textContent = `${formatNumber(count)} Pro${count !== 1 ? 's' : ''}`;
        }
    });
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Start auto-refresh of stats (every 60 seconds)
 */
function startStatsRefresh() {
    fetchLiveStats();
    statsRefreshInterval = setInterval(fetchLiveStats, 60000);
}

/**
 * Stop auto-refresh
 */
function stopStatsRefresh() {
    if (statsRefreshInterval) {
        clearInterval(statsRefreshInterval);
    }
}

// ===========================================
// MODAL FUNCTIONS
// ===========================================

function showModal(type) {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    const modal = document.getElementById(type + '-modal');
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// ===========================================
// AUTHENTICATION
// ===========================================

/**
 * Handle login form submission
 */
async function handleLogin(event) {
    event.preventDefault();

    // Get values using IDs for reliability
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');

    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value : '';

    if (!email) {
        CariComProsAPI.showToast('Please enter your email', 'error');
        return;
    }

    CariComProsAPI.showLoading('Signing in...');

    try {
        // Use the API login function
        const result = await CariComProsAPI.login(email, password);

        CariComProsAPI.hideLoading();

        if (result.success) {
            CariComProsAPI.showToast('Welcome back!', 'success');

            // Close the modal
            const modal = document.getElementById('loginModal');
            if (modal) modal.classList.remove('active');

            setTimeout(() => {
                const userType = CariComProsAPI.getUserType();
                if (userType === 'contractor') {
                    window.location.href = '/contractors';
                } else {
                    window.location.href = '/customers';
                }
            }, 500);
        } else {
            CariComProsAPI.showToast(result.error || 'Invalid email or password', 'error');
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        CariComProsAPI.showToast('Login failed. Please try again.', 'error');
        console.error('Login error:', error);
    }
}

/**
 * Handle customer signup
 */
async function handleCustomerSignup(event) {
    event.preventDefault();
    const form = event.target;

    const inputs = form.querySelectorAll('input');
    const selects = form.querySelectorAll('select');

    const name = inputs[0]?.value?.trim() || '';
    const email = form.querySelector('input[type="email"]')?.value?.trim() || '';
    const phone = form.querySelector('input[type="tel"]')?.value?.trim() || '';
    const location = selects[0]?.value || '';

    if (!name || !email) {
        CariComProsAPI.showToast('Please fill in all required fields', 'error');
        return;
    }

    CariComProsAPI.showLoading('Creating your account...');

    try {
        const result = await CariComProsAPI.registerCustomer({
            name: name,
            email: email,
            phone: phone,
            location: location
        });

        CariComProsAPI.hideLoading();

        if (result.success) {
            CariComProsAPI.showToast('Account created successfully!', 'success');
            setTimeout(() => {
                window.location.href = '/customers';
            }, 1000);
        } else {
            CariComProsAPI.showToast(result.error || 'Registration failed', 'error');
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        CariComProsAPI.showToast('Registration failed. Please try again.', 'error');
    }
}

/**
 * Handle contractor signup
 */
async function handleContractorSignup(event) {
    event.preventDefault();
    const form = event.target;

    const inputs = form.querySelectorAll('input');
    const selects = form.querySelectorAll('select');

    const name = inputs[0]?.value?.trim() || '';
    const businessName = inputs[1]?.value?.trim() || '';
    const email = form.querySelector('input[type="email"]')?.value?.trim() || '';
    const phone = form.querySelector('input[type="tel"]')?.value?.trim() || '';
    const category = selects[0]?.value || '';
    const location = selects[1]?.value || '';

    if (!name || !email || !category) {
        CariComProsAPI.showToast('Please fill in all required fields', 'error');
        return;
    }

    CariComProsAPI.showLoading('Creating your account...');

    try {
        const result = await CariComProsAPI.registerContractor({
            name: name,
            email: email,
            phone: phone,
            category: category,
            location: location,
            businessName: businessName
        });

        CariComProsAPI.hideLoading();

        if (result.success) {
            CariComProsAPI.showToast('Account created successfully!', 'success');
            // Refresh stats to show new contractor count
            fetchLiveStats();
            setTimeout(() => {
                window.location.href = '/contractors';
            }, 1000);
        } else {
            CariComProsAPI.showToast(result.error || 'Registration failed', 'error');
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        CariComProsAPI.showToast('Registration failed. Please try again.', 'error');
    }
}

/**
 * Generic signup handler
 */
function handleSignup(event) {
    event.preventDefault();
    const form = event.target;
    const isContractor = form.innerHTML.includes('Business Name') ||
        form.innerHTML.includes('Category') ||
        form.closest('.modal')?.id?.includes('contractor');

    if (isContractor) {
        handleContractorSignup(event);
    } else {
        handleCustomerSignup(event);
    }
}

// ===========================================
// SEARCH & NAVIGATION
// ===========================================

/**
 * Handle service search
 */
function searchServices(event) {
    event.preventDefault();
    const form = event.target;
    const searchInput = form.querySelector('input[type="text"]');
    const categorySelect = form.querySelector('select');

    const searchTerm = searchInput?.value?.trim() || '';
    const category = categorySelect?.value || '';

    // Store search params
    if (searchTerm) localStorage.setItem('hk_search_term', searchTerm);
    if (category) localStorage.setItem('hk_search_category', category);

    // Redirect to browse contractors
    window.location.href = '/browse';
}

/**
 * Select a category and navigate
 */
function selectCategory(category) {
    localStorage.setItem('hk_search_category', category);
    window.location.href = '/browse';
}

/**
 * Scroll to search section
 */
function scrollToSearch() {
    const searchEl = document.querySelector('.search-container, .hero-search');
    if (searchEl) {
        searchEl.scrollIntoView({ behavior: 'smooth' });
    }
}

// ===========================================
// INITIALIZATION
// ===========================================

// Close modal on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
};

// Close modal on Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Hidden Kingz initialized');
    console.log('API Version:', CariComProsAPI.config.version);

    // Start fetching live stats
    startStatsRefresh();

    // Check if user is already logged in
    if (CariComProsAPI.isLoggedIn()) {
        const userType = CariComProsAPI.getUserType();
        console.log('User logged in as:', userType);

        // Update UI for logged-in state
        const loginBtns = document.querySelectorAll('[onclick*="showModal(\'login"]');
        loginBtns.forEach(btn => {
            btn.textContent = 'Dashboard';
            btn.onclick = () => {
                window.location.href = userType === 'contractor' ? '/contractors' : '/customers';
            };
        });
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    stopStatsRefresh();
});
