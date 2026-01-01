/**
 * Hidden Kingz - Customer Dashboard (Production Ready)
 * Full API integration with real-time data
 * Version: 2.0.0
 */

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===========================================
// STATE MANAGEMENT
// ===========================================

let currentUser = null;
let customerJobs = [];
let customerQuotes = [];
let contractors = [];
let messages = [];
let currentSection = 'dashboard';
let myListings = [];
let listingImages = [];

// ===========================================
// INITIALIZATION
// ===========================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Customer Dashboard initializing...');

    // Check authentication
    if (!CariComProsAPI.isLoggedIn()) {
        // Allow browsing contractors without login
        const hash = window.location.hash.replace('#', '');
        const storedCategory = localStorage.getItem('hk_search_category');

        if (hash === 'contractors' || storedCategory) {
            // Guest mode - can browse contractors
            initGuestMode();
            return;
        }

        window.location.href = 'index.html';
        return;
    }

    // Load user data
    currentUser = CariComProsAPI.getUserData();
    if (!currentUser) {
        CariComProsAPI.logout();
        return;
    }

    // Update UI with user info
    updateUserInfo();

    // Setup event listeners
    setupEventListeners();

    // Check if we should navigate to a specific section
    const hash = window.location.hash.replace('#', '');
    const storedCategory = localStorage.getItem('hk_search_category');
    const storedSearch = localStorage.getItem('hk_search_term');

    if (hash === 'contractors' || storedCategory || storedSearch) {
        showSection('contractors');
    } else if (hash && ['post-job', 'my-jobs', 'quotes', 'payments', 'reviews', 'messages', 'settings'].includes(hash)) {
        showSection(hash);
    } else {
        await loadDashboardData();
    }

    console.log('Customer Dashboard ready');
});

function initGuestMode() {
    console.log('Guest mode - browsing contractors');

    // Update UI for guest
    const userProfile = document.querySelector('.user-profile');
    if (userProfile) {
        userProfile.innerHTML = `
            <div class="user-avatar" style="background: linear-gradient(45deg, #666, #999);">?</div>
            <div class="user-info">
                <h3>Guest</h3>
                <span><a href="index.html" style="color: #ffd700;">Sign in</a> to post jobs</span>
            </div>
        `;
    }

    // Hide sections that require login
    document.querySelectorAll('.nav-item[onclick*="post-job"], .nav-item[onclick*="my-jobs"], .nav-item[onclick*="quotes"], .nav-item[onclick*="payments"], .nav-item[onclick*="reviews"], .nav-item[onclick*="messages"], .nav-item[onclick*="settings"]').forEach(item => {
        item.style.opacity = '0.5';
        item.onclick = () => {
            CariComProsAPI.showToast('Please sign in to access this feature', 'warning');
        };
    });

    showSection('contractors');
}

// ===========================================
// EVENT LISTENERS
// ===========================================

function setupEventListeners() {
    // Sidebar toggle
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.addEventListener('click', toggleSidebar);
    }

    // Close modals on escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });

    // Notification button
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', showNotifications);
    }

    // Logout button
    const logoutBtn = document.querySelector('[onclick*="logout"], .logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = logout;
    }
}

// ===========================================
// USER INTERFACE
// ===========================================

function updateUserInfo() {
    if (!currentUser) return;

    // Update sidebar user profile
    const nameEl = document.querySelector('.user-info h3');
    const locationEl = document.querySelector('.user-info span');
    const avatarEl = document.querySelector('.user-avatar');

    if (nameEl) nameEl.textContent = currentUser.name || 'Customer';
    if (locationEl) locationEl.textContent = currentUser.location || 'Caribbean';
    if (avatarEl) avatarEl.textContent = CariComProsAPI.getInitials(currentUser.name);

    // Update settings form if on that page
    const settingsName = document.querySelector('#settings-section input[type="text"]');
    const settingsEmail = document.querySelector('#settings-section input[type="email"]');
    const settingsPhone = document.querySelector('#settings-section input[type="tel"]');

    if (settingsName) settingsName.value = currentUser.name || '';
    if (settingsEmail) settingsEmail.value = currentUser.email || '';
    if (settingsPhone) settingsPhone.value = currentUser.phone || '';
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

function showSection(section) {
    currentSection = section;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[onclick*="'${section}'"]`);
    if (activeNav) activeNav.classList.add('active');

    // Hide all sections
    document.querySelectorAll('.section-content').forEach(sec => sec.style.display = 'none');

    // Show selected section
    const sectionEl = document.getElementById(section + '-section');
    if (sectionEl) sectionEl.style.display = 'block';

    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'post-job': 'Post a Job',
        'my-jobs': 'My Jobs',
        'quotes': 'Quotes',
        'contractors': 'Find Contractors',
        'categories': 'Service Categories',
        'my-listings': 'My Listings',
        'payments': 'Payments',
        'reviews': 'My Reviews',
        'messages': 'Messages',
        'settings': 'Settings'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[section] || 'Dashboard';

    // Close mobile sidebar
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.remove('active');

    // Update URL hash
    window.location.hash = section;

    // Load section data
    loadSectionData(section);
}

async function loadSectionData(section) {
    switch (section) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'contractors':
            await loadContractors();
            break;
        case 'my-jobs':
            await loadCustomerJobs();
            break;
        case 'quotes':
            await loadCustomerQuotes();
            break;
        case 'my-listings':
            await loadMyListings();
            break;
        case 'messages':
            await loadMessages();
            break;
        case 'payments':
            await loadPaymentHistory();
            break;
        case 'reviews':
            await loadCustomerReviews();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// ===========================================
// DASHBOARD
// ===========================================

async function loadDashboardData() {
    if (!currentUser) return;

    try {
        // Load user's jobs
        const jobsResult = await CariComProsAPI.getJobs({ customerId: currentUser.id });
        if (jobsResult.success) {
            customerJobs = jobsResult.jobs || [];
            updateDashboardStats();
            renderRecentJobs();
        }

        // Load quotes
        const quotesResult = await CariComProsAPI.request('getCustomerQuotes', 'GET', { customerId: currentUser.id });
        if (quotesResult.success) {
            customerQuotes = quotesResult.quotes || [];
            updateQuotesBadge();
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function updateDashboardStats() {
    const activeJobs = customerJobs.filter(j => ['Open', 'In Progress', 'Quoted'].includes(j.Status)).length;
    const completedJobs = customerJobs.filter(j => j.Status === 'Completed').length;
    const pendingQuotes = customerQuotes.filter(q => q.Status === 'Pending').length;
    const totalSpent = customerJobs
        .filter(j => j.Status === 'Completed')
        .reduce((sum, j) => sum + (parseFloat(j.FinalAmount || j.Budget) || 0), 0);

    // Update stat cards
    const statValues = document.querySelectorAll('.stats-grid .stat-value');
    if (statValues[0]) statValues[0].textContent = activeJobs;
    if (statValues[1]) statValues[1].textContent = completedJobs;
    if (statValues[2]) statValues[2].textContent = pendingQuotes;
    if (statValues[3]) statValues[3].textContent = CariComProsAPI.formatCurrency(totalSpent);
}

function updateQuotesBadge() {
    const pendingQuotes = customerQuotes.filter(q => q.Status === 'Pending').length;
    const badge = document.querySelector('.nav-item[onclick*="quotes"] .nav-badge');
    if (badge) {
        badge.textContent = pendingQuotes;
        badge.style.display = pendingQuotes > 0 ? 'inline-block' : 'none';
    }
}

function renderRecentJobs() {
    const container = document.querySelector('#dashboard-section .jobs-list');
    if (!container) return;

    const recentJobs = customerJobs.slice(0, 5);

    if (recentJobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 3rem;">
                <i class="fas fa-briefcase" style="font-size: 3rem; color: #ddd; margin-bottom: 1rem;"></i>
                <h3 style="color: #1a1a2e; margin-bottom: 0.5rem;">No Jobs Yet</h3>
                <p style="color: #666; margin-bottom: 1.5rem;">Post your first job to find contractors</p>
                <button class="btn btn-primary" onclick="showSection('post-job')">
                    <i class="fas fa-plus"></i> Post a Job
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = recentJobs.map(job => `
        <div class="job-card" onclick="viewJobDetails('${job.JobID}')" style="cursor: pointer;">
            <div class="job-header">
                <div>
                    <div class="job-title">${job.Title || 'Untitled Job'}</div>
                    <div class="job-category">${job.Category || 'General'}</div>
                </div>
                <span class="job-status status-${(job.Status || 'open').toLowerCase().replace(' ', '-')}">${job.Status || 'Open'}</span>
            </div>
            <div class="job-details">
                <div class="job-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${job.Location || 'N/A'}</span>
                </div>
                <div class="job-detail">
                    <i class="fas fa-calendar"></i>
                    <span>${CariComProsAPI.formatDate(job.CreatedAt)}</span>
                </div>
                <div class="job-detail">
                    <i class="fas fa-dollar-sign"></i>
                    <span>${job.Budget ? CariComProsAPI.formatCurrency(job.Budget) : 'TBD'}</span>
                </div>
                ${job.QuotesReceived ? `
                <div class="job-detail">
                    <i class="fas fa-file-invoice-dollar"></i>
                    <span>${job.QuotesReceived} quote${job.QuotesReceived > 1 ? 's' : ''}</span>
                </div>
                ` : ''}
            </div>
            <div class="job-actions">
                ${job.QuotesReceived > 0 ? `
                    <button class="btn btn-primary btn-small" onclick="event.stopPropagation(); viewJobQuotes('${job.JobID}')">
                        View Quotes
                    </button>
                ` : ''}
                ${job.Status === 'In Progress' ? `
                    <button class="btn btn-success btn-small" onclick="event.stopPropagation(); markJobComplete('${job.JobID}')">
                        Mark Complete
                    </button>
                ` : ''}
                ${job.Status === 'Completed' && !job.ReviewSubmitted ? `
                    <button class="btn btn-outline btn-small" onclick="event.stopPropagation(); openReviewModal('${job.JobID}', '${job.AssignedContractor}', '${job.ContractorName || ''}')">
                        Leave Review
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// ===========================================
// CONTRACTORS
// ===========================================

async function loadContractors(filters = {}) {
    CariComProsAPI.showLoading('Loading contractors...');

    try {
        // Check for stored search filters
        const storedCategory = localStorage.getItem('hk_search_category');
        const storedSearch = localStorage.getItem('hk_search_term');

        if (storedCategory && !filters.category) {
            filters.category = storedCategory;
            localStorage.removeItem('hk_search_category');
        }

        if (storedSearch && !filters.search) {
            filters.search = storedSearch;
            localStorage.removeItem('hk_search_term');
        }

        // Update the section title
        const sectionTitle = document.querySelector('#contractors-section .section-title');
        if (sectionTitle) {
            if (filters.category) {
                sectionTitle.textContent = `${filters.category} Contractors`;
            } else if (filters.search) {
                sectionTitle.textContent = `Search: "${filters.search}"`;
            } else {
                sectionTitle.textContent = 'Find Contractors';
            }
        }

        // Update filter dropdowns
        if (filters.category) {
            const categorySelect = document.getElementById('contractorCategoryFilter');
            if (categorySelect) {
                for (let i = 0; i < categorySelect.options.length; i++) {
                    if (categorySelect.options[i].textContent === filters.category) {
                        categorySelect.selectedIndex = i;
                        break;
                    }
                }
            }
        }

        const result = await CariComProsAPI.getContractors(filters);
        CariComProsAPI.hideLoading();

        if (result.success) {
            contractors = result.contractors || [];
            renderContractors(contractors, filters.category);
        } else {
            CariComProsAPI.showToast('Failed to load contractors', 'error');
            renderContractors([], filters.category);
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        console.error('Error loading contractors:', error);
        CariComProsAPI.showToast('Error loading contractors', 'error');
        renderContractors([]);
    }
}

function renderContractors(list, filterCategory = null) {
    const container = document.querySelector('#contractors-section .contractors-grid');
    if (!container) return;

    if (list.length === 0) {
        const categoryText = filterCategory ? ` for "${filterCategory}"` : '';
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <i class="fas fa-users" style="font-size: 3rem; color: #ddd; margin-bottom: 1rem;"></i>
                <h3 style="color: #1a1a2e; margin-bottom: 0.5rem;">No contractors found${categoryText}</h3>
                <p style="color: #666; margin-bottom: 1.5rem;">Be the first ${filterCategory || 'service'} provider in your area!</p>
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button class="btn btn-outline" onclick="clearContractorFilters()">
                        <i class="fas fa-th-large"></i> View All
                    </button>
                    <a href="index.html" class="btn btn-primary" style="text-decoration: none;">
                        <i class="fas fa-hard-hat"></i> Become a Pro
                    </a>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(c => {
        const initials = CariComProsAPI.getInitials(c.Name);
        const rating = parseFloat(c.Rating) || 0;
        const isVerified = c.Verified === 'Verified';

        return `
            <div class="contractor-card">
                <div class="contractor-header">
                    <div class="contractor-avatar-lg">${initials}</div>
                    <div>
                        <div class="contractor-name">
                            ${c.Name || 'Unknown'}
                            ${isVerified ? '<span class="verified-badge"><i class="fas fa-check"></i> Verified</span>' : ''}
                        </div>
                        <div class="contractor-specialty">${c.Category || 'General Services'}</div>
                        <div class="contractor-rating">
                            <span class="stars">${renderStars(rating)}</span>
                            <span class="rating-text">${rating.toFixed(1)} (${c.JobsCompleted || 0} jobs)</span>
                        </div>
                    </div>
                </div>
                <div class="contractor-stats">
                    <div class="contractor-stat">
                        <div class="contractor-stat-value">${c.JobsCompleted || 0}</div>
                        <div class="contractor-stat-label">Jobs</div>
                    </div>
                    <div class="contractor-stat">
                        <div class="contractor-stat-value">${c.Experience || 'N/A'}</div>
                        <div class="contractor-stat-label">Experience</div>
                    </div>
                    <div class="contractor-stat">
                        <div class="contractor-stat-value">${c.Location?.split(',')[0] || 'N/A'}</div>
                        <div class="contractor-stat-label">Location</div>
                    </div>
                </div>
                ${c.Services ? `
                <div class="contractor-services">
                    ${c.Services.split(',').slice(0, 3).map(s => `<span class="service-tag">${s.trim()}</span>`).join('')}
                </div>
                ` : ''}
                <div class="contractor-actions">
                    <button class="btn btn-outline btn-small" onclick="viewContractorProfile('${c.ID}')">
                        <i class="fas fa-user"></i> Profile
                    </button>
                    <button class="btn btn-primary btn-small" onclick="requestQuoteFrom('${c.ID}', '${c.Name}', '${c.Category}')">
                        <i class="fas fa-paper-plane"></i> Request Quote
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    let html = '';

    for (let i = 0; i < fullStars; i++) html += '<i class="fas fa-star"></i>';
    if (halfStar) html += '<i class="fas fa-star-half-alt"></i>';
    for (let i = fullStars + (halfStar ? 1 : 0); i < 5; i++) html += '<i class="far fa-star"></i>';

    return html;
}

function searchContractors() {
    const searchInput = document.getElementById('contractorSearchInput');
    const categorySelect = document.getElementById('contractorCategoryFilter');
    const locationSelect = document.getElementById('contractorLocationFilter');

    const filters = {};

    if (searchInput?.value?.trim()) {
        filters.search = searchInput.value.trim();
    }
    if (categorySelect?.value && categorySelect.value !== '') {
        filters.category = categorySelect.value;
    }
    if (locationSelect?.value && locationSelect.value !== '') {
        filters.location = locationSelect.value;
    }

    loadContractors(filters);
}

function clearContractorFilters() {
    document.getElementById('contractorSearchInput').value = '';
    document.getElementById('contractorCategoryFilter').selectedIndex = 0;
    document.getElementById('contractorLocationFilter').selectedIndex = 0;
    loadContractors();
}

function viewContractorProfile(contractorId) {
    const contractor = contractors.find(c => c.ID === contractorId);
    if (!contractor) {
        CariComProsAPI.showToast('Contractor not found', 'error');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'contractorProfileModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header" style="background: linear-gradient(135deg, #1a1a2e, #16213e); color: white;">
                <h3 class="modal-title" style="color: #ffd700;">${contractor.Name}</h3>
                <button class="modal-close" onclick="closeModal('contractorProfileModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div style="display: flex; gap: 1.5rem; margin-bottom: 1.5rem;">
                    <div style="width: 100px; height: 100px; background: linear-gradient(45deg, #ffd700, #ffed4e); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; color: #1a1a2e;">
                        ${CariComProsAPI.getInitials(contractor.Name)}
                    </div>
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 0.5rem; color: #1a1a2e;">${contractor.Name}</h3>
                        ${contractor.BusinessName ? `<p style="color: #666; margin: 0 0 0.5rem;">${contractor.BusinessName}</p>` : ''}
                        <p style="color: #666; margin: 0;"><i class="fas fa-map-marker-alt"></i> ${contractor.Location || 'Caribbean'}</p>
                        ${contractor.Verified === 'Verified' ? `
                            <span style="display: inline-block; margin-top: 0.5rem; background: #00bfa5; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem;">
                                <i class="fas fa-check"></i> Verified Professional
                            </span>
                        ` : ''}
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 10px; margin-bottom: 1.5rem;">
                    <div style="text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #ffd700;">${parseFloat(contractor.Rating || 0).toFixed(1)}</div>
                        <div style="font-size: 0.8rem; color: #666;">Rating</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #1a1a2e;">${contractor.JobsCompleted || 0}</div>
                        <div style="font-size: 0.8rem; color: #666;">Jobs Done</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #1a1a2e;">${contractor.Experience || 'N/A'}</div>
                        <div style="font-size: 0.8rem; color: #666;">Experience</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: #4CAF50;">98%</div>
                        <div style="font-size: 0.8rem; color: #666;">On Time</div>
                    </div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: #1a1a2e; margin-bottom: 0.75rem;">Services</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        <span style="background: #e3f2fd; color: #1976d2; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem;">${contractor.Category}</span>
                        ${contractor.Services ? contractor.Services.split(',').map(s => `
                            <span style="background: #f5f5f5; color: #666; padding: 0.5rem 1rem; border-radius: 20px; font-size: 0.9rem;">${s.trim()}</span>
                        `).join('') : ''}
                    </div>
                </div>

                ${contractor.Bio ? `
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: #1a1a2e; margin-bottom: 0.75rem;">About</h4>
                    <p style="color: #666; line-height: 1.6;">${contractor.Bio}</p>
                </div>
                ` : ''}
            </div>
            <div class="modal-footer" style="display: flex; gap: 1rem;">
                <button class="btn btn-outline" onclick="messageContractor('${contractor.ID}', '${contractor.Name}')" style="flex: 1;">
                    <i class="fas fa-comment"></i> Message
                </button>
                <button class="btn btn-primary" onclick="closeModal('contractorProfileModal'); requestQuoteFrom('${contractor.ID}', '${contractor.Name}', '${contractor.Category}')" style="flex: 1;">
                    <i class="fas fa-paper-plane"></i> Request Quote
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function requestQuoteFrom(contractorId, contractorName, category) {
    if (!CariComProsAPI.isLoggedIn()) {
        CariComProsAPI.showToast('Please sign in to request a quote', 'warning');
        setTimeout(() => window.location.href = 'index.html', 1500);
        return;
    }

    localStorage.setItem('hk_selected_contractor', JSON.stringify({
        id: contractorId,
        name: contractorName,
        category: category
    }));

    showSection('post-job');

    // Pre-fill category if available
    setTimeout(() => {
        const categorySelect = document.querySelector('#post-job-section select');
        if (categorySelect && category) {
            for (let i = 0; i < categorySelect.options.length; i++) {
                if (categorySelect.options[i].textContent.includes(category)) {
                    categorySelect.selectedIndex = i;
                    break;
                }
            }
        }
        CariComProsAPI.showToast(`Creating job request for ${contractorName}`, 'info');
    }, 100);
}

// ===========================================
// JOB MANAGEMENT
// ===========================================

async function loadCustomerJobs() {
    if (!currentUser) return;

    CariComProsAPI.showLoading('Loading your jobs...');

    try {
        const result = await CariComProsAPI.getJobs({ customerId: currentUser.id });
        CariComProsAPI.hideLoading();

        if (result.success) {
            customerJobs = result.jobs || [];
            renderCustomerJobs();
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        console.error('Error loading jobs:', error);
    }
}

function renderCustomerJobs() {
    const container = document.querySelector('#my-jobs-section .section-body .jobs-list, #active-jobs');
    if (!container) return;

    if (customerJobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 3rem;">
                <i class="fas fa-folder-open" style="font-size: 3rem; color: #ddd; margin-bottom: 1rem;"></i>
                <h3 style="color: #1a1a2e; margin-bottom: 0.5rem;">No Jobs Yet</h3>
                <p style="color: #666; margin-bottom: 1.5rem;">You haven't posted any jobs yet</p>
                <button class="btn btn-primary" onclick="showSection('post-job')">
                    <i class="fas fa-plus"></i> Post Your First Job
                </button>
            </div>
        `;
        return;
    }

    // Update tab counts
    const activeCount = customerJobs.filter(j => j.Status === 'In Progress').length;
    const openCount = customerJobs.filter(j => j.Status === 'Open' || j.Status === 'Quoted').length;
    const completedCount = customerJobs.filter(j => j.Status === 'Completed').length;

    document.querySelectorAll('.tabs .tab').forEach(tab => {
        if (tab.textContent.includes('Active')) tab.textContent = `Active (${activeCount})`;
        if (tab.textContent.includes('Open')) tab.textContent = `Open (${openCount})`;
        if (tab.textContent.includes('Completed')) tab.textContent = `Completed (${completedCount})`;
    });

    container.innerHTML = customerJobs.map(job => `
        <div class="job-card" onclick="viewJobDetails('${job.JobID}')" style="cursor: pointer;">
            <div class="job-header">
                <div>
                    <div class="job-title">${job.Title || 'Untitled'}</div>
                    <div class="job-category">${job.Category || 'General'}</div>
                </div>
                <span class="job-status status-${(job.Status || 'open').toLowerCase().replace(' ', '-')}">${job.Status || 'Open'}</span>
            </div>
            <div class="job-details">
                <div class="job-detail">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${job.Location || 'N/A'}</span>
                </div>
                <div class="job-detail">
                    <i class="fas fa-calendar"></i>
                    <span>${CariComProsAPI.formatDate(job.CreatedAt)}</span>
                </div>
                <div class="job-detail">
                    <i class="fas fa-dollar-sign"></i>
                    <span>${job.Budget ? CariComProsAPI.formatCurrency(job.Budget) : 'TBD'}</span>
                </div>
                ${job.QuotesReceived ? `
                <div class="job-detail">
                    <i class="fas fa-file-invoice-dollar"></i>
                    <span>${job.QuotesReceived} quotes</span>
                </div>
                ` : ''}
                ${job.ContractorName ? `
                <div class="job-detail">
                    <i class="fas fa-user"></i>
                    <span>${job.ContractorName}</span>
                </div>
                ` : ''}
            </div>
            <div class="job-actions" onclick="event.stopPropagation();">
                ${job.QuotesReceived > 0 && job.Status !== 'Completed' ? `
                    <button class="btn btn-outline btn-small" onclick="viewJobQuotes('${job.JobID}')">
                        <i class="fas fa-file-invoice-dollar"></i> View Quotes
                    </button>
                ` : ''}
                ${job.Status === 'In Progress' ? `
                    <button class="btn btn-outline btn-small" onclick="messageContractor('${job.AssignedContractor}', '${job.ContractorName}')">
                        <i class="fas fa-comment"></i> Message
                    </button>
                    <button class="btn btn-success btn-small" onclick="markJobComplete('${job.JobID}', ${job.FinalAmount || job.Budget || 0})">
                        <i class="fas fa-check"></i> Mark Complete
                    </button>
                ` : ''}
                ${job.Status === 'Completed' && !job.ReviewSubmitted ? `
                    <button class="btn btn-primary btn-small" onclick="openReviewModal('${job.JobID}', '${job.AssignedContractor}', '${job.ContractorName}')">
                        <i class="fas fa-star"></i> Leave Review
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function showJobTab(tab) {
    document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Filter jobs based on tab
    const container = document.querySelector('#active-jobs');
    if (!container) return;

    let filteredJobs;
    switch(tab) {
        case 'active':
            filteredJobs = customerJobs.filter(j => j.Status === 'In Progress');
            break;
        case 'open':
            filteredJobs = customerJobs.filter(j => j.Status === 'Open' || j.Status === 'Quoted');
            break;
        case 'completed':
            filteredJobs = customerJobs.filter(j => j.Status === 'Completed');
            break;
        case 'cancelled':
            filteredJobs = customerJobs.filter(j => j.Status === 'Cancelled');
            break;
        default:
            filteredJobs = customerJobs;
    }

    if (filteredJobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 2rem; color: #666;">
                <i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>No ${tab} jobs</p>
            </div>
        `;
        return;
    }

    // Reuse the render logic with filtered jobs
    const tempJobs = customerJobs;
    customerJobs = filteredJobs;
    renderCustomerJobs();
    customerJobs = tempJobs;
}

function viewJobDetails(jobId) {
    const job = customerJobs.find(j => j.JobID === jobId);
    if (!job) {
        CariComProsAPI.showToast('Job not found', 'error');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'jobDetailsModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3 class="modal-title">${job.Title}</h3>
                <button class="modal-close" onclick="closeModal('jobDetailsModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                    <span class="service-tag" style="background: #e3f2fd; color: #1976d2;">${job.Category}</span>
                    <span class="job-status status-${(job.Status || 'open').toLowerCase().replace(' ', '-')}" style="padding: 0.5rem 1rem;">${job.Status}</span>
                </div>

                <div style="background: #f8f9fa; padding: 1rem; border-radius: 10px; margin-bottom: 1.5rem;">
                    <h4 style="margin: 0 0 0.75rem; color: #1a1a2e;">Description</h4>
                    <p style="color: #666; margin: 0; line-height: 1.6;">${job.Description || 'No description provided'}</p>
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 10px;">
                        <div style="font-size: 0.8rem; color: #666; margin-bottom: 0.25rem;">Budget</div>
                        <div style="font-weight: bold; color: #1a1a2e;">${job.Budget ? CariComProsAPI.formatCurrency(job.Budget) : 'To be discussed'}</div>
                    </div>
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 10px;">
                        <div style="font-size: 0.8rem; color: #666; margin-bottom: 0.25rem;">Location</div>
                        <div style="font-weight: bold; color: #1a1a2e;">${job.Location || 'Not specified'}</div>
                    </div>
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 10px;">
                        <div style="font-size: 0.8rem; color: #666; margin-bottom: 0.25rem;">Posted</div>
                        <div style="font-weight: bold; color: #1a1a2e;">${CariComProsAPI.formatDate(job.CreatedAt)}</div>
                    </div>
                    <div style="padding: 1rem; background: #f8f9fa; border-radius: 10px;">
                        <div style="font-size: 0.8rem; color: #666; margin-bottom: 0.25rem;">Timeline</div>
                        <div style="font-weight: bold; color: #1a1a2e;">${job.Urgency || 'Flexible'}</div>
                    </div>
                </div>

                ${job.ContractorName ? `
                <div style="padding: 1rem; background: linear-gradient(135deg, #e8f5e9, #c8e6c9); border-radius: 10px; margin-bottom: 1.5rem;">
                    <div style="font-size: 0.8rem; color: #388e3c; margin-bottom: 0.5rem;">Assigned Contractor</div>
                    <div style="font-weight: bold; color: #1b5e20;">${job.ContractorName}</div>
                </div>
                ` : ''}

                ${job.QuotesReceived > 0 ? `
                <div style="padding: 1rem; background: #fff3e0; border-radius: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-size: 0.8rem; color: #e65100;">Quotes Received</div>
                            <div style="font-weight: bold; color: #e65100; font-size: 1.25rem;">${job.QuotesReceived}</div>
                        </div>
                        <button class="btn btn-primary btn-small" onclick="closeModal('jobDetailsModal'); viewJobQuotes('${job.JobID}')">
                            View Quotes
                        </button>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function markJobComplete(jobId, amount) {
    const confirmed = await CariComProsAPI.confirm('Mark this job as complete? This will notify the contractor and process any pending payment.');
    if (!confirmed) return;

    CariComProsAPI.showLoading('Completing job...');

    try {
        const job = customerJobs.find(j => j.JobID === jobId);
        const result = await CariComProsAPI.completeJob(jobId, job?.AssignedContractor, amount);

        CariComProsAPI.hideLoading();

        if (result.success) {
            CariComProsAPI.showToast('Job marked as complete!', 'success');
            loadCustomerJobs();
            loadDashboardData();

            // Prompt for review
            setTimeout(() => {
                if (job?.AssignedContractor) {
                    openReviewModal(jobId, job.AssignedContractor, job.ContractorName);
                }
            }, 1000);
        } else {
            CariComProsAPI.showToast(result.error || 'Failed to complete job', 'error');
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        CariComProsAPI.showToast('Error completing job', 'error');
    }
}

// ===========================================
// JOB POSTING
// ===========================================

async function submitJob(event) {
    event.preventDefault();

    if (!currentUser) {
        CariComProsAPI.showToast('Please sign in to post a job', 'warning');
        return;
    }

    const form = event.target;

    // Get form values
    const title = form.querySelector('input[type="text"]')?.value?.trim();
    const category = form.querySelector('select')?.value;
    const location = form.querySelectorAll('select')[1]?.value;
    const description = form.querySelector('textarea')?.value?.trim();
    const budgetMin = form.querySelectorAll('input[type="number"]')[0]?.value;
    const budgetMax = form.querySelectorAll('input[type="number"]')[1]?.value;
    const timeline = form.querySelectorAll('select')[2]?.value;

    if (!title || !category || !description) {
        CariComProsAPI.showToast('Please fill in all required fields', 'error');
        return;
    }

    const budget = budgetMax ? `${budgetMin || 0}-${budgetMax}` : (budgetMin || '');

    CariComProsAPI.showLoading('Posting your job...');

    try {
        const result = await CariComProsAPI.createJob({
            customerId: currentUser.id,
            customerName: currentUser.name,
            customerEmail: currentUser.email,
            customerPhone: currentUser.phone || '',
            title: title,
            category: category,
            location: location || currentUser.location,
            description: description,
            budget: budget,
            urgency: timeline || 'Flexible'
        });

        CariComProsAPI.hideLoading();

        if (result.success) {
            CariComProsAPI.showToast('Job posted successfully! Contractors will start sending quotes.', 'success');
            form.reset();

            // Clear any stored contractor selection
            localStorage.removeItem('hk_selected_contractor');

            showSection('my-jobs');
        } else {
            CariComProsAPI.showToast(result.error || 'Failed to post job', 'error');
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        CariComProsAPI.showToast('Error posting job', 'error');
    }
}

// ===========================================
// QUOTES
// ===========================================

async function loadCustomerQuotes() {
    if (!currentUser) return;

    CariComProsAPI.showLoading('Loading quotes...');

    try {
        const result = await CariComProsAPI.request('getCustomerQuotes', 'GET', {
            customerId: currentUser.id
        });

        CariComProsAPI.hideLoading();

        if (result.success) {
            customerQuotes = result.quotes || [];
            renderQuotes(customerQuotes);
        } else {
            renderQuotes([]);
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        console.error('Error loading quotes:', error);
        renderQuotes([]);
    }
}

function renderQuotes(quotes) {
    const container = document.querySelector('#quotes-section .quotes-list');
    if (!container) return;

    // Hide the info alert if no pending quotes
    const alert = document.querySelector('#quotes-section .alert');
    if (alert) {
        const pendingCount = quotes.filter(q => q.Status === 'Pending').length;
        alert.style.display = pendingCount > 0 ? 'flex' : 'none';
        if (pendingCount > 0) {
            alert.innerHTML = `<i class="fas fa-info-circle"></i><span>You have ${pendingCount} quote${pendingCount > 1 ? 's' : ''} waiting for your review.</span>`;
        }
    }

    if (quotes.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 3rem;">
                <i class="fas fa-file-invoice-dollar" style="font-size: 3rem; color: #ddd; margin-bottom: 1rem;"></i>
                <h3 style="color: #1a1a2e; margin-bottom: 0.5rem;">No Quotes Yet</h3>
                <p style="color: #666; margin-bottom: 1.5rem;">Post a job to start receiving quotes from contractors</p>
                <button class="btn btn-primary" onclick="showSection('post-job')">
                    <i class="fas fa-plus"></i> Post a Job
                </button>
            </div>
        `;
        return;
    }

    // Group quotes by job
    const jobGroups = {};
    quotes.forEach(q => {
        const key = q.JobID || 'unknown';
        if (!jobGroups[key]) jobGroups[key] = { job: q.JobTitle, quotes: [] };
        jobGroups[key].quotes.push(q);
    });

    container.innerHTML = Object.entries(jobGroups).map(([jobId, group]) => `
        <div style="margin-bottom: 2rem;">
            <h3 style="margin-bottom: 1rem; color: #1a1a2e; border-bottom: 2px solid #ffd700; padding-bottom: 0.5rem;">
                ${group.job || 'Job'} - ${group.quotes.length} Quote${group.quotes.length > 1 ? 's' : ''}
            </h3>
            ${group.quotes.map((quote, index) => `
                <div class="quote-card ${index === 0 && quote.Status === 'Pending' ? 'recommended' : ''}" style="position: relative;">
                    ${index === 0 && quote.Status === 'Pending' ? `
                        <div style="position: absolute; top: 1rem; right: 1rem; background: #4CAF50; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">
                            Best Value
                        </div>
                    ` : ''}
                    <div class="quote-header">
                        <div class="contractor-info">
                            <div class="contractor-avatar">${CariComProsAPI.getInitials(quote.ContractorName)}</div>
                            <div class="contractor-details">
                                <h4>
                                    ${quote.ContractorName}
                                    ${quote.ContractorVerified ? '<span class="verified-badge"><i class="fas fa-check"></i></span>' : ''}
                                </h4>
                                <div class="contractor-specialty">${quote.ContractorCategory || 'Professional'}</div>
                            </div>
                        </div>
                        <div class="quote-price">
                            <div class="price-amount">${CariComProsAPI.formatCurrency(quote.Amount)}</div>
                            <div class="price-label">${quote.PriceType || 'Fixed Price'}</div>
                        </div>
                    </div>
                    <div class="quote-stats">
                        <div class="quote-stat">
                            <div class="quote-stat-value">${parseFloat(quote.ContractorRating || 0).toFixed(1)} <i class="fas fa-star" style="color: var(--accent); font-size: 0.8rem;"></i></div>
                            <div class="quote-stat-label">Rating</div>
                        </div>
                        <div class="quote-stat">
                            <div class="quote-stat-value">${quote.ContractorJobs || 0}</div>
                            <div class="quote-stat-label">Jobs Done</div>
                        </div>
                        <div class="quote-stat">
                            <div class="quote-stat-value">${quote.Timeline || 'TBD'}</div>
                            <div class="quote-stat-label">Timeline</div>
                        </div>
                        <div class="quote-stat">
                            <div class="quote-stat-value">${CariComProsAPI.formatRelativeTime(quote.CreatedAt)}</div>
                            <div class="quote-stat-label">Received</div>
                        </div>
                    </div>
                    ${quote.Message ? `
                        <div class="quote-message">"${quote.Message}"</div>
                    ` : ''}
                    <div class="quote-actions">
                        ${quote.Status === 'Pending' ? `
                            <button class="btn btn-outline btn-small" onclick="messageContractor('${quote.ContractorID}', '${quote.ContractorName}')">
                                <i class="fas fa-comment"></i> Message
                            </button>
                            <button class="btn btn-outline btn-small" onclick="viewContractorProfile('${quote.ContractorID}')">
                                <i class="fas fa-user"></i> Profile
                            </button>
                            <button class="btn btn-outline btn-small" onclick="declineQuote('${quote.QuoteID}')" style="color: var(--error);">
                                Decline
                            </button>
                            <button class="btn btn-success btn-small" onclick="acceptQuote('${quote.QuoteID}', '${quote.JobID}', '${quote.ContractorID}', '${quote.ContractorName}', ${quote.Amount})">
                                <i class="fas fa-check"></i> Accept
                            </button>
                        ` : `
                            <span class="job-status status-${quote.Status?.toLowerCase()}" style="padding: 0.5rem 1rem;">
                                ${quote.Status}
                            </span>
                        `}
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('');
}

async function viewJobQuotes(jobId) {
    CariComProsAPI.showLoading('Loading quotes...');

    try {
        const result = await CariComProsAPI.request('getJobQuotes', 'GET', { jobId: jobId });
        CariComProsAPI.hideLoading();

        if (result.success && result.quotes?.length > 0) {
            showJobQuotesModal(jobId, result.quotes);
        } else {
            CariComProsAPI.showToast('No quotes found for this job', 'info');
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        CariComProsAPI.showToast('Error loading quotes', 'error');
    }
}

function showJobQuotesModal(jobId, quotes) {
    const job = customerJobs.find(j => j.JobID === jobId);

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'jobQuotesModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; max-height: 80vh; overflow-y: auto;">
            <div class="modal-header" style="background: linear-gradient(135deg, #1a1a2e, #16213e); color: white;">
                <div>
                    <h3 class="modal-title" style="color: #ffd700; margin: 0;">Quotes Received</h3>
                    <p style="margin: 0.5rem 0 0; opacity: 0.9; font-size: 0.9rem;">${job?.Title || 'Job'}</p>
                </div>
                <button class="modal-close" onclick="closeModal('jobQuotesModal')" style="color: white;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 1.5rem;">
                ${quotes.length === 0 ? `
                    <div style="text-align: center; padding: 2rem; color: #666;">
                        <i class="fas fa-inbox" style="font-size: 3rem; opacity: 0.3;"></i>
                        <p>No quotes received yet.</p>
                    </div>
                ` : quotes.map((quote, index) => `
                    <div style="background: ${index === 0 ? '#f0fdf4' : '#f8f9fa'}; border: ${index === 0 ? '2px solid #4CAF50' : '1px solid #e9ecef'}; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; position: relative;">
                        ${index === 0 ? `
                            <div style="position: absolute; top: -10px; right: 1rem; background: #4CAF50; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600;">
                                Recommended
                            </div>
                        ` : ''}
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                            <div style="display: flex; gap: 1rem;">
                                <div style="width: 50px; height: 50px; background: linear-gradient(45deg, #ffd700, #ffed4e); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #1a1a2e;">
                                    ${CariComProsAPI.getInitials(quote.ContractorName)}
                                </div>
                                <div>
                                    <div style="font-weight: bold; color: #1a1a2e;">${quote.ContractorName}</div>
                                    <div style="font-size: 0.9rem; color: #666;">
                                        <i class="fas fa-star" style="color: #ffd700;"></i> ${parseFloat(quote.ContractorRating || 0).toFixed(1)}
                                        <span style="margin-left: 1rem;">${quote.ContractorJobs || 0} jobs</span>
                                    </div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 1.5rem; font-weight: bold; color: #27ae60;">${CariComProsAPI.formatCurrency(quote.Amount)}</div>
                                <div style="font-size: 0.85rem; color: #666;">${quote.Timeline || 'Timeline TBD'}</div>
                            </div>
                        </div>
                        ${quote.Message ? `
                            <p style="color: #555; font-style: italic; margin: 1rem 0; padding: 1rem; background: white; border-radius: 8px;">"${quote.Message}"</p>
                        ` : ''}
                        ${quote.Status === 'Pending' ? `
                            <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
                                <button onclick="declineQuote('${quote.QuoteID}'); closeModal('jobQuotesModal');" style="flex: 1; padding: 0.75rem; border: 1px solid #ddd; background: white; border-radius: 8px; cursor: pointer; font-weight: 500;">
                                    Decline
                                </button>
                                <button onclick="closeModal('jobQuotesModal'); acceptQuote('${quote.QuoteID}', '${jobId}', '${quote.ContractorID}', '${quote.ContractorName}', ${quote.Amount})" style="flex: 2; padding: 0.75rem; background: linear-gradient(45deg, #ffd700, #ffed4e); color: #1a1a2e; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
                                    <i class="fas fa-check"></i> Accept & Hire
                                </button>
                            </div>
                        ` : `
                            <div style="text-align: center; padding: 0.75rem; background: #e8f5e9; border-radius: 8px; color: #27ae60; font-weight: bold;">
                                <i class="fas fa-check-circle"></i> ${quote.Status}
                            </div>
                        `}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function acceptQuote(quoteId, jobId, contractorId, contractorName, amount) {
    const confirmed = await CariComProsAPI.confirm(`Accept quote from ${contractorName} for ${CariComProsAPI.formatCurrency(amount)}? This will assign the job to them.`);
    if (!confirmed) return;

    CariComProsAPI.showLoading('Accepting quote...');

    try {
        const result = await CariComProsAPI.acceptQuote(quoteId, jobId, contractorId);
        CariComProsAPI.hideLoading();

        if (result.success) {
            CariComProsAPI.showToast(`Quote accepted! ${contractorName} has been assigned to your job.`, 'success');
            loadCustomerQuotes();
            loadCustomerJobs();
            loadDashboardData();
        } else {
            CariComProsAPI.showToast(result.error || 'Failed to accept quote', 'error');
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        CariComProsAPI.showToast('Error accepting quote', 'error');
    }
}

async function declineQuote(quoteId) {
    const confirmed = await CariComProsAPI.confirm('Decline this quote? The contractor will be notified.');
    if (!confirmed) return;

    CariComProsAPI.showLoading('Declining quote...');

    try {
        const result = await CariComProsAPI.request('declineQuote', 'POST', { quoteId: quoteId });
        CariComProsAPI.hideLoading();

        if (result.success) {
            CariComProsAPI.showToast('Quote declined', 'success');
            loadCustomerQuotes();
        } else {
            CariComProsAPI.showToast(result.error || 'Failed to decline quote', 'error');
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        CariComProsAPI.showToast('Error declining quote', 'error');
    }
}

// ===========================================
// MESSAGES
// ===========================================

async function loadMessages() {
    if (!currentUser) return;

    CariComProsAPI.showLoading('Loading messages...');

    try {
        const result = await CariComProsAPI.getMessages(currentUser.id);
        CariComProsAPI.hideLoading();

        if (result.success) {
            messages = result.messages || [];
            renderMessages();
        } else {
            renderMessages([]);
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        renderMessages([]);
    }
}

function renderMessages() {
    const container = document.querySelector('#messages-section .section-body');
    if (!container) return;

    if (messages.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 3rem;">
                <i class="fas fa-comments" style="font-size: 3rem; color: #ddd; margin-bottom: 1rem;"></i>
                <h3 style="color: #1a1a2e; margin-bottom: 0.5rem;">No Messages Yet</h3>
                <p style="color: #666; margin-bottom: 1.5rem;">Start a conversation by messaging a contractor</p>
                <button class="btn btn-primary" onclick="showSection('contractors')">
                    <i class="fas fa-search"></i> Find Contractors
                </button>
            </div>
        `;
        return;
    }

    // Group messages by conversation
    const conversations = {};
    messages.forEach(msg => {
        const otherId = msg.FromID === currentUser.id ? msg.ToID : msg.FromID;
        const otherName = msg.FromID === currentUser.id ? msg.ToName : msg.FromName;
        if (!conversations[otherId]) {
            conversations[otherId] = { name: otherName, messages: [] };
        }
        conversations[otherId].messages.push(msg);
    });

    container.innerHTML = `
        <div style="display: grid; gap: 1rem;">
            ${Object.entries(conversations).map(([id, conv]) => {
                const lastMsg = conv.messages[conv.messages.length - 1];
                const unread = conv.messages.filter(m => !m.Read && m.ToID === currentUser.id).length;
                return `
                    <div onclick="openConversation('${id}', '${conv.name}')" style="display: flex; gap: 1rem; padding: 1rem; background: white; border-radius: 10px; cursor: pointer; border: 1px solid #e9ecef; transition: all 0.3s;">
                        <div style="width: 50px; height: 50px; background: linear-gradient(45deg, #ffd700, #ffed4e); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #1a1a2e;">
                            ${CariComProsAPI.getInitials(conv.name)}
                        </div>
                        <div style="flex: 1;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <span style="font-weight: bold; color: #1a1a2e;">${conv.name}</span>
                                <span style="font-size: 0.8rem; color: #999;">${CariComProsAPI.formatRelativeTime(lastMsg.CreatedAt)}</span>
                            </div>
                            <p style="margin: 0.25rem 0 0; color: #666; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                ${lastMsg.Message}
                            </p>
                        </div>
                        ${unread > 0 ? `
                            <div style="min-width: 24px; height: 24px; background: #f44336; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: bold;">
                                ${unread}
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function messageContractor(contractorId, contractorName) {
    if (!CariComProsAPI.isLoggedIn()) {
        CariComProsAPI.showToast('Please sign in to send messages', 'warning');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'messageModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3 class="modal-title">Message ${contractorName}</h3>
                <button class="modal-close" onclick="closeModal('messageModal')">&times;</button>
            </div>
            <div class="modal-body">
                <textarea id="messageText" class="form-textarea" placeholder="Type your message here..." style="min-height: 150px; width: 100%;"></textarea>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal('messageModal')">Cancel</button>
                <button class="btn btn-primary" onclick="sendMessage('${contractorId}', '${contractorName}')">
                    <i class="fas fa-paper-plane"></i> Send
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('messageText').focus();
}

async function sendMessage(toId, toName) {
    const messageText = document.getElementById('messageText')?.value?.trim();
    if (!messageText) {
        CariComProsAPI.showToast('Please enter a message', 'warning');
        return;
    }

    CariComProsAPI.showLoading('Sending message...');

    try {
        const result = await CariComProsAPI.sendMessage({
            toId: toId,
            message: messageText
        });

        CariComProsAPI.hideLoading();

        if (result.success) {
            CariComProsAPI.showToast('Message sent!', 'success');
            closeModal('messageModal');
            loadMessages();
        } else {
            CariComProsAPI.showToast(result.error || 'Failed to send message', 'error');
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        CariComProsAPI.showToast('Error sending message', 'error');
    }
}

function openConversation(userId, userName) {
    // For now, open a simple message modal
    messageContractor(userId, userName);
}

// ===========================================
// PAYMENTS
// ===========================================

async function loadPaymentHistory() {
    if (!currentUser) return;

    const container = document.querySelector('#payments-section .section-body table tbody, #payments-section tbody');
    if (!container) return;

    // Get completed jobs as payment history
    const completedJobs = customerJobs.filter(j => j.Status === 'Completed');

    if (completedJobs.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 3rem; color: #666;">
                    <i class="fas fa-credit-card" style="font-size: 2rem; margin-bottom: 1rem; display: block; opacity: 0.5;"></i>
                    No payment history yet
                </td>
            </tr>
        `;
        return;
    }

    container.innerHTML = completedJobs.map(job => `
        <tr style="border-bottom: 1px solid #e9ecef;">
            <td style="padding: 1rem;">${CariComProsAPI.formatDate(job.CompletedAt || job.UpdatedAt)}</td>
            <td style="padding: 1rem;">${job.Title}</td>
            <td style="padding: 1rem;">${job.ContractorName || 'N/A'}</td>
            <td style="padding: 1rem; text-align: right;">${CariComProsAPI.formatCurrency(job.FinalAmount || job.Budget)}</td>
            <td style="padding: 1rem; text-align: center;">
                <span class="job-status status-completed">Paid</span>
            </td>
        </tr>
    `).join('');
}

// ===========================================
// REVIEWS
// ===========================================

async function loadCustomerReviews() {
    if (!currentUser) return;

    const container = document.querySelector('#reviews-section .reviews-list');
    if (!container) return;

    // Get reviews from completed jobs
    const completedJobs = customerJobs.filter(j => j.Status === 'Completed');

    if (completedJobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 3rem;">
                <i class="fas fa-star" style="font-size: 3rem; color: #ddd; margin-bottom: 1rem;"></i>
                <h3 style="color: #1a1a2e; margin-bottom: 0.5rem;">No Reviews Yet</h3>
                <p style="color: #666;">Complete a job to leave a review</p>
            </div>
        `;
        return;
    }

    container.innerHTML = completedJobs.map(job => `
        <div class="review-card">
            <div class="review-header">
                <span class="review-job">${job.Title}</span>
                <span class="review-rating">
                    ${job.ReviewRating ? renderStars(job.ReviewRating) : '<span style="color: #999;">Not yet reviewed</span>'}
                </span>
            </div>
            <div class="review-contractor">Contractor: ${job.ContractorName || 'Unknown'}</div>
            ${job.ReviewComment ? `
                <p class="review-text">${job.ReviewComment}</p>
            ` : ''}
            <div class="review-date">${CariComProsAPI.formatDate(job.CompletedAt || job.UpdatedAt)}</div>
            ${!job.ReviewSubmitted ? `
                <button class="btn btn-primary btn-small" onclick="openReviewModal('${job.JobID}', '${job.AssignedContractor}', '${job.ContractorName}')" style="margin-top: 1rem;">
                    <i class="fas fa-star"></i> Leave Review
                </button>
            ` : ''}
        </div>
    `).join('');
}

function openReviewModal(jobId, contractorId, contractorName) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'reviewModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3 class="modal-title">Rate ${contractorName}</h3>
                <button class="modal-close" onclick="closeModal('reviewModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div style="text-align: center; margin-bottom: 1.5rem;">
                    <p style="margin-bottom: 1rem; color: #666;">How was your experience?</p>
                    <div id="starRating" style="font-size: 2.5rem; color: #ddd; cursor: pointer;">
                        ${[1,2,3,4,5].map(i => `<i class="far fa-star" data-rating="${i}" onmouseover="previewRating(${i})" onmouseout="resetRating()" onclick="setRating(${i})"></i>`).join('')}
                    </div>
                    <input type="hidden" id="selectedRating" value="0">
                </div>
                <div class="form-group">
                    <label class="form-label">Your Review (optional)</label>
                    <textarea id="reviewComment" class="form-textarea" placeholder="Tell us about your experience..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal('reviewModal')">Cancel</button>
                <button class="btn btn-primary" onclick="submitReview('${jobId}', '${contractorId}')">
                    <i class="fas fa-check"></i> Submit Review
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function previewRating(rating) {
    const stars = document.querySelectorAll('#starRating i');
    stars.forEach((star, index) => {
        star.className = index < rating ? 'fas fa-star' : 'far fa-star';
        star.style.color = index < rating ? '#ffd700' : '#ddd';
    });
}

function resetRating() {
    const selectedRating = parseInt(document.getElementById('selectedRating').value) || 0;
    previewRating(selectedRating);
}

function setRating(rating) {
    document.getElementById('selectedRating').value = rating;
    previewRating(rating);
}

async function submitReview(jobId, contractorId) {
    const rating = parseInt(document.getElementById('selectedRating').value);
    const comment = document.getElementById('reviewComment')?.value?.trim();

    if (!rating) {
        CariComProsAPI.showToast('Please select a rating', 'warning');
        return;
    }

    CariComProsAPI.showLoading('Submitting review...');

    try {
        const result = await CariComProsAPI.submitReview({
            jobId: jobId,
            contractorId: contractorId,
            rating: rating,
            comment: comment
        });

        CariComProsAPI.hideLoading();

        if (result.success) {
            CariComProsAPI.showToast('Thank you for your review!', 'success');
            closeModal('reviewModal');
            loadCustomerReviews();
            loadCustomerJobs();
        } else {
            CariComProsAPI.showToast(result.error || 'Failed to submit review', 'error');
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        CariComProsAPI.showToast('Error submitting review', 'error');
    }
}

// ===========================================
// SETTINGS
// ===========================================

function loadSettings() {
    updateUserInfo();
}

async function saveSettings(event) {
    event.preventDefault();

    if (!currentUser) return;

    const form = event.target;
    const name = form.querySelector('input[type="text"]')?.value?.trim();
    const email = form.querySelector('input[type="email"]')?.value?.trim();
    const phone = form.querySelector('input[type="tel"]')?.value?.trim();
    const location = form.querySelector('select')?.value;

    CariComProsAPI.showLoading('Saving settings...');

    try {
        const result = await CariComProsAPI.request('updateCustomer', 'POST', {
            customerId: currentUser.id,
            name: name,
            email: email,
            phone: phone,
            location: location
        });

        CariComProsAPI.hideLoading();

        if (result.success) {
            // Update local user data
            currentUser.name = name;
            currentUser.email = email;
            currentUser.phone = phone;
            currentUser.location = location;
            CariComProsAPI.setUserData(currentUser);

            updateUserInfo();
            CariComProsAPI.showToast('Settings saved!', 'success');
        } else {
            CariComProsAPI.showToast(result.error || 'Failed to save settings', 'error');
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        CariComProsAPI.showToast('Error saving settings', 'error');
    }
}

// ===========================================
// UTILITIES
// ===========================================

function showNotifications() {
    const pendingQuotes = customerQuotes.filter(q => q.Status === 'Pending').length;
    const activeJobs = customerJobs.filter(j => j.Status === 'In Progress').length;

    let notifications = [];
    if (pendingQuotes > 0) {
        notifications.push(`${pendingQuotes} new quote${pendingQuotes > 1 ? 's' : ''} received`);
    }
    if (activeJobs > 0) {
        notifications.push(`${activeJobs} job${activeJobs > 1 ? 's' : ''} in progress`);
    }

    if (notifications.length === 0) {
        CariComProsAPI.showToast('No new notifications', 'info');
    } else {
        CariComProsAPI.showToast(notifications.join(' • '), 'info');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.remove());
}

function logout() {
    CariComProsAPI.logout();
}

function handlePhotoUpload(event) {
    const files = event.target.files;
    const preview = document.getElementById('photoPreview');
    if (!preview) return;

    for (let file of files) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.innerHTML = `
                    <img src="${e.target.result}" alt="Preview">
                    <button class="preview-remove" onclick="this.parentElement.remove()">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                preview.appendChild(div);
            };
            reader.readAsDataURL(file);
        }
    }
}

// ===========================================
// MARKETPLACE LISTINGS
// ===========================================

async function loadMyListings() {
    if (!currentUser) return;

    const loadingEl = document.getElementById('listingsLoading');
    const gridEl = document.getElementById('myListingsGrid');
    const emptyEl = document.getElementById('noListingsState');

    if (loadingEl) loadingEl.style.display = 'block';
    if (gridEl) gridEl.innerHTML = '';
    if (emptyEl) emptyEl.style.display = 'none';

    try {
        const result = await CariComProsAPI.getMyListings();

        if (loadingEl) loadingEl.style.display = 'none';

        if (result.success) {
            myListings = result.listings || [];
            renderMyListings();
            updateListingStats();
        } else {
            if (emptyEl) emptyEl.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading listings:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'block';
    }
}

function updateListingStats() {
    const activeCount = myListings.filter(l => l.Status === 'active').length;
    const soldCount = myListings.filter(l => l.Status === 'sold').length;
    const totalViews = myListings.reduce((sum, l) => sum + (parseInt(l.Views) || 0), 0);

    const activeEl = document.getElementById('activeListingsCount');
    const soldEl = document.getElementById('soldListingsCount');
    const viewsEl = document.getElementById('totalListingViews');
    const navBadge = document.getElementById('nav-listings-count');

    if (activeEl) activeEl.textContent = activeCount;
    if (soldEl) soldEl.textContent = soldCount;
    if (viewsEl) viewsEl.textContent = totalViews;
    if (navBadge) navBadge.textContent = activeCount;
}

function renderMyListings() {
    const gridEl = document.getElementById('myListingsGrid');
    const emptyEl = document.getElementById('noListingsState');

    if (!gridEl) return;

    if (myListings.length === 0) {
        gridEl.innerHTML = '';
        if (emptyEl) emptyEl.style.display = 'block';
        return;
    }

    if (emptyEl) emptyEl.style.display = 'none';

    gridEl.innerHTML = myListings.map(listing => {
        const images = listing.Images ? JSON.parse(listing.Images) : [];
        const imageHtml = images.length > 0
            ? `<img src="${images[0]}" alt="${listing.Title}">`
            : `<i class="fas fa-image"></i>`;

        return `
            <div class="listing-card">
                <div class="listing-image">
                    ${imageHtml}
                </div>
                <div class="listing-content">
                    <div class="listing-price">${parseFloat(listing.Price) === 0 ? 'FREE' : CariComProsAPI.formatCurrency(listing.Price, listing.Location)}</div>
                    <div class="listing-title">${listing.Title}</div>
                    <div class="listing-meta">
                        <span><i class="fas fa-tag"></i> ${listing.Condition}</span>
                        <span class="listing-status ${listing.Status}">${listing.Status === 'active' ? 'Active' : listing.Status === 'sold' ? 'Sold' : listing.Status}</span>
                    </div>
                    <div class="listing-meta">
                        <span><i class="fas fa-eye"></i> ${listing.Views || 0} views</span>
                        <span>${CariComProsAPI.formatRelativeTime(listing.CreatedAt)}</span>
                    </div>
                    <div class="listing-actions">
                        ${listing.Status === 'active' ? `
                            <button class="btn btn-outline btn-small" onclick="openEditListingModal('${listing.ListingID}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-success btn-small" onclick="markListingAsSold('${listing.ListingID}')">
                                <i class="fas fa-check"></i> Sold
                            </button>
                            <button class="btn btn-outline btn-small" onclick="deleteListing('${listing.ListingID}')" style="color: var(--error);">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : `
                            <button class="btn btn-outline btn-small" onclick="deleteListing('${listing.ListingID}')" style="width: 100%;">
                                <i class="fas fa-trash"></i> Remove
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openCreateListingModal() {
    if (!CariComProsAPI.isLoggedIn()) {
        CariComProsAPI.showToast('Please sign in to create a listing', 'warning');
        setTimeout(() => window.location.href = 'index.html', 1500);
        return;
    }

    listingImages = [];
    document.getElementById('createListingForm')?.reset();
    document.getElementById('listingImagePreview').innerHTML = '';
    document.getElementById('createListingModal').classList.add('active');
}

function closeCreateListingModal() {
    document.getElementById('createListingModal').classList.remove('active');
    listingImages = [];
}

async function handleListingImageUpload(event) {
    const files = event.target.files;
    const previewContainer = document.getElementById('listingImagePreview');

    if (!previewContainer) return;

    const maxImages = 5;
    const currentCount = listingImages.length;
    const allowedCount = maxImages - currentCount;

    if (allowedCount <= 0) {
        CariComProsAPI.showToast('Maximum 5 images allowed', 'warning');
        return;
    }

    const filesToProcess = Array.from(files).slice(0, allowedCount);

    for (const file of filesToProcess) {
        if (!file.type.startsWith('image/')) continue;

        try {
            const compressed = await CariComProsAPI.compressImage(file, 800, 0.7);
            listingImages.push(compressed);

            const div = document.createElement('div');
            div.className = 'image-preview-item';
            div.innerHTML = `
                <img src="${compressed}" alt="Preview">
                <button class="image-preview-remove" onclick="removeListingImage(${listingImages.length - 1}, this.parentElement)">
                    <i class="fas fa-times"></i>
                </button>
            `;
            previewContainer.appendChild(div);
        } catch (error) {
            console.error('Error processing image:', error);
        }
    }

    event.target.value = '';
}

function removeListingImage(index, element) {
    listingImages.splice(index, 1);
    element.remove();

    // Re-index remaining images
    const previewContainer = document.getElementById('listingImagePreview');
    const items = previewContainer.querySelectorAll('.image-preview-item');
    items.forEach((item, i) => {
        const btn = item.querySelector('.image-preview-remove');
        btn.setAttribute('onclick', `removeListingImage(${i}, this.parentElement)`);
    });
}

async function submitListing(event) {
    event.preventDefault();

    if (!currentUser) {
        CariComProsAPI.showToast('Please sign in to create a listing', 'warning');
        return;
    }

    const title = document.getElementById('listingTitle')?.value?.trim();
    const price = parseFloat(document.getElementById('listingPrice')?.value) || 0;
    const category = document.getElementById('listingCategory')?.value;
    const condition = document.getElementById('listingCondition')?.value;
    const location = document.getElementById('listingLocation')?.value;
    const description = document.getElementById('listingDescription')?.value?.trim();

    if (!title || !category || !condition || !location || !description) {
        CariComProsAPI.showToast('Please fill in all required fields', 'error');
        return;
    }

    const submitBtn = document.getElementById('submitListingBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    }

    try {
        const result = await CariComProsAPI.createListing({
            title,
            description,
            price,
            category,
            condition,
            location,
            images: listingImages
        });

        if (result.success) {
            CariComProsAPI.showToast('Listing created successfully!', 'success');
            closeCreateListingModal();
            loadMyListings();
        } else {
            CariComProsAPI.showToast(result.error || 'Failed to create listing', 'error');
        }
    } catch (error) {
        console.error('Error creating listing:', error);
        CariComProsAPI.showToast('Error creating listing', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check"></i> Create Listing';
        }
    }
}

function openEditListingModal(listingId) {
    const listing = myListings.find(l => l.ListingID === listingId);
    if (!listing) {
        CariComProsAPI.showToast('Listing not found', 'error');
        return;
    }

    document.getElementById('editListingId').value = listingId;
    document.getElementById('editListingTitle').value = listing.Title || '';
    document.getElementById('editListingPrice').value = listing.Price || 0;
    document.getElementById('editListingCategory').value = listing.Category || '';
    document.getElementById('editListingCondition').value = listing.Condition || '';
    document.getElementById('editListingLocation').value = listing.Location || '';
    document.getElementById('editListingDescription').value = listing.Description || '';

    document.getElementById('editListingModal').classList.add('active');
}

function closeEditListingModal() {
    document.getElementById('editListingModal').classList.remove('active');
}

async function updateListing(event) {
    event.preventDefault();

    const listingId = document.getElementById('editListingId')?.value;
    const title = document.getElementById('editListingTitle')?.value?.trim();
    const price = parseFloat(document.getElementById('editListingPrice')?.value) || 0;
    const category = document.getElementById('editListingCategory')?.value;
    const condition = document.getElementById('editListingCondition')?.value;
    const location = document.getElementById('editListingLocation')?.value;
    const description = document.getElementById('editListingDescription')?.value?.trim();

    if (!listingId || !title || !category || !condition || !location || !description) {
        CariComProsAPI.showToast('Please fill in all required fields', 'error');
        return;
    }

    const updateBtn = document.getElementById('updateListingBtn');
    if (updateBtn) {
        updateBtn.disabled = true;
        updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }

    try {
        const result = await CariComProsAPI.updateListing(listingId, {
            title,
            description,
            price,
            category,
            condition,
            location
        });

        if (result.success) {
            CariComProsAPI.showToast('Listing updated successfully!', 'success');
            closeEditListingModal();
            loadMyListings();
        } else {
            CariComProsAPI.showToast(result.error || 'Failed to update listing', 'error');
        }
    } catch (error) {
        console.error('Error updating listing:', error);
        CariComProsAPI.showToast('Error updating listing', 'error');
    } finally {
        if (updateBtn) {
            updateBtn.disabled = false;
            updateBtn.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        }
    }
}

async function markListingAsSold(listingId) {
    const confirmed = await CariComProsAPI.confirm('Mark this listing as sold?');
    if (!confirmed) return;

    CariComProsAPI.showLoading('Updating listing...');

    try {
        const result = await CariComProsAPI.markListingAsSold(listingId);
        CariComProsAPI.hideLoading();

        if (result.success) {
            CariComProsAPI.showToast('Listing marked as sold!', 'success');
            loadMyListings();
        } else {
            CariComProsAPI.showToast(result.error || 'Failed to update listing', 'error');
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        CariComProsAPI.showToast('Error updating listing', 'error');
    }
}

async function deleteListing(listingId) {
    const confirmed = await CariComProsAPI.confirm('Delete this listing? This action cannot be undone.');
    if (!confirmed) return;

    CariComProsAPI.showLoading('Deleting listing...');

    try {
        const result = await CariComProsAPI.deleteListing(listingId);
        CariComProsAPI.hideLoading();

        if (result.success) {
            CariComProsAPI.showToast('Listing deleted', 'success');
            loadMyListings();
        } else {
            CariComProsAPI.showToast(result.error || 'Failed to delete listing', 'error');
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        CariComProsAPI.showToast('Error deleting listing', 'error');
    }
}

// Make functions globally available
window.showSection = showSection;
window.showJobTab = showJobTab;
window.toggleSidebar = toggleSidebar;
window.searchContractors = searchContractors;
window.clearContractorFilters = clearContractorFilters;
window.viewContractorProfile = viewContractorProfile;
window.requestQuoteFrom = requestQuoteFrom;
window.viewJobDetails = viewJobDetails;
window.viewJobQuotes = viewJobQuotes;
window.markJobComplete = markJobComplete;
window.submitJob = submitJob;
window.acceptQuote = acceptQuote;
window.declineQuote = declineQuote;
window.messageContractor = messageContractor;
window.sendMessage = sendMessage;
window.openReviewModal = openReviewModal;
window.previewRating = previewRating;
window.resetRating = resetRating;
window.setRating = setRating;
window.submitReview = submitReview;
window.saveSettings = saveSettings;
window.closeModal = closeModal;
window.logout = logout;
window.handlePhotoUpload = handlePhotoUpload;
// Marketplace functions
window.loadMyListings = loadMyListings;
window.openCreateListingModal = openCreateListingModal;
window.closeCreateListingModal = closeCreateListingModal;
window.handleListingImageUpload = handleListingImageUpload;
window.removeListingImage = removeListingImage;
window.submitListing = submitListing;
window.openEditListingModal = openEditListingModal;
window.closeEditListingModal = closeEditListingModal;
window.updateListing = updateListing;
window.markListingAsSold = markListingAsSold;
window.deleteListing = deleteListing;
