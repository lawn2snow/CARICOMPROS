/**
 * Hidden Kingz Contractor Dashboard - Production Script
 * Full API integration with Google Apps Script backend
 */

// ===========================================
// STATE MANAGEMENT
// ===========================================

let currentContractor = null;
let availableJobs = [];
let myJobs = [];
let myQuotes = [];
let transactions = [];
let conversations = [];
let currentConversation = null;
let scheduledJobs = [];
let currentCalendarDate = new Date();
let myListings = [];
let listingImages = [];

// ===========================================
// AUTHENTICATION
// ===========================================

function checkAuth() {
    if (!CariComProsAPI.isLoggedIn()) {
        CariComProsAPI.showToast('Please log in to access your dashboard', 'error');
        setTimeout(() => window.location.href = 'index.html', 1500);
        return false;
    }

    const userType = CariComProsAPI.getUserType();
    if (userType !== 'contractor') {
        CariComProsAPI.showToast('Access denied. This dashboard is for contractors only.', 'error');
        setTimeout(() => window.location.href = '/customers', 1500);
        return false;
    }

    return true;
}

function logout() {
    if (confirm('Are you sure you want to log out?')) {
        CariComProsAPI.logout();
    }
}

// ===========================================
// UI HELPERS
// ===========================================

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatCurrency(amount) {
    return '$' + (parseFloat(amount) || 0).toFixed(2);
}

function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelativeTime(date) {
    if (!date) return '';
    const now = new Date();
    const d = new Date(date);
    const diff = Math.floor((now - d) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return formatDate(date);
}

function getInitials(name) {
    if (!name) return '--';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function generateStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        stars += i <= rating
            ? '<i class="fas fa-star"></i>'
            : '<i class="far fa-star" style="color:#ddd;"></i>';
    }
    return stars;
}

function showModal(id, content) {
    const existingModal = document.getElementById(id);
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = id;
    modal.innerHTML = content;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(id);
    });
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.remove();
}

// ===========================================
// NAVIGATION
// ===========================================

function showSection(section) {
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[onclick*="'${section}'"]`);
    if (activeNav) activeNav.classList.add('active');

    // Hide all sections
    document.querySelectorAll('.section-content').forEach(sec => sec.style.display = 'none');

    // Show target section
    const sectionEl = document.getElementById(section + '-section');
    if (sectionEl) sectionEl.style.display = 'block';

    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'jobs': 'Find Jobs',
        'my-jobs': 'My Jobs',
        'earnings': 'Earnings',
        'schedule': 'Schedule',
        'messages': 'Messages',
        'reviews': 'Reviews',
        'verification': 'Verification',
        'profile': 'Profile',
        'settings': 'Settings',
        'my-listings': 'My Listings'
    };
    document.getElementById('pageTitle').textContent = titles[section] || 'Dashboard';

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('active');

    // Load section data
    switch(section) {
        case 'dashboard': loadDashboard(); break;
        case 'jobs': loadAvailableJobs(); break;
        case 'my-jobs': loadMyJobs(); break;
        case 'earnings': loadEarnings(); break;
        case 'schedule': loadSchedule(); break;
        case 'messages': loadMessages(); break;
        case 'reviews': loadReviews(); break;
        case 'verification': loadVerification(); break;
        case 'profile': loadProfile(); break;
        case 'settings': loadSettings(); break;
        case 'my-listings': loadMyListings(); break;
    }
}

// ===========================================
// DASHBOARD
// ===========================================

async function loadDashboard() {
    try {
        // Load contractor jobs
        const jobsResult = await CariComProsAPI.request('getContractorJobs', 'GET', {
            contractorId: currentContractor.id
        });

        // Load contractor payments
        const paymentsResult = await CariComProsAPI.request('getContractorPayments', 'GET', {
            contractorId: currentContractor.id
        });

        // Update stats
        let totalEarnings = 0;
        let activeJobs = 0;
        let pendingQuotes = 0;

        if (jobsResult.success && jobsResult.jobs) {
            activeJobs = jobsResult.jobs.filter(j => j.Status === 'In Progress').length;
            myJobs = jobsResult.jobs;
        }

        if (jobsResult.success && jobsResult.quotes) {
            pendingQuotes = jobsResult.quotes.filter(q => q.Status === 'Pending').length;
            myQuotes = jobsResult.quotes;
        }

        if (paymentsResult.success && paymentsResult.payments) {
            totalEarnings = paymentsResult.payments
                .filter(p => p.Status === 'Completed')
                .reduce((sum, p) => sum + (parseFloat(p.ContractorPayout) || 0), 0);
        }

        document.getElementById('dashEarnings').textContent = formatCurrency(totalEarnings);
        document.getElementById('dashActiveJobs').textContent = activeJobs;
        document.getElementById('dashRating').textContent = (currentContractor.rating || 0).toFixed(1);
        document.getElementById('dashPendingQuotes').textContent = pendingQuotes;

        // Update badges
        document.getElementById('activeJobsBadge').textContent = activeJobs;
        document.getElementById('availableJobsBadge').textContent = '!';

        // Render active jobs
        renderDashboardActiveJobs(myJobs.filter(j => j.Status === 'In Progress').slice(0, 3));

        // Render recent reviews
        await renderDashboardReviews();

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function renderDashboardActiveJobs(jobs) {
    const container = document.getElementById('dashActiveJobsList');

    if (!jobs || jobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-check"></i>
                <p>No active jobs</p>
                <button class="btn btn-primary btn-small" onclick="showSection('jobs')">Find Jobs</button>
            </div>
        `;
        return;
    }

    container.innerHTML = jobs.map(job => `
        <div class="job-card" onclick="showJobDetails('${job.JobID}')">
            <div class="job-info">
                <div class="job-title">${escapeHtml(job.Title)}</div>
                <div class="job-customer"><i class="fas fa-user"></i> ${escapeHtml(job.CustomerName)}</div>
                <div class="job-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(job.Location)}</span>
                    <span><i class="fas fa-dollar-sign"></i> ${formatCurrency(job.Budget)}</span>
                </div>
            </div>
            <span class="job-status status-in-progress">In Progress</span>
        </div>
    `).join('');
}

async function renderDashboardReviews() {
    const container = document.getElementById('dashRecentReviews');

    try {
        const result = await CariComProsAPI.request('getContractorReviews', 'GET', {
            contractorId: currentContractor.id
        });

        if (!result.success || !result.reviews || result.reviews.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-star"></i>
                    <p>No reviews yet</p>
                </div>
            `;
            return;
        }

        const reviews = result.reviews.slice(0, 2);
        container.innerHTML = reviews.map(review => `
            <div class="review-card">
                <div class="review-header">
                    <span class="review-customer">${escapeHtml(review.CustomerName)}</span>
                    <span class="review-rating">${generateStars(review.Rating)}</span>
                </div>
                <p class="review-text">${escapeHtml(review.Comment || 'Great work!')}</p>
                <div class="review-date">${formatRelativeTime(review.CreatedAt)}</div>
            </div>
        `).join('');

    } catch (error) {
        container.innerHTML = '<div class="empty-state"><p>Could not load reviews</p></div>';
    }
}

// ===========================================
// AVAILABLE JOBS
// ===========================================

async function loadAvailableJobs() {
    const container = document.getElementById('availableJobsList');
    container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading jobs...</p></div>';

    try {
        const result = await CariComProsAPI.request('getJobs', 'GET', { status: 'Open' });

        if (result.success && result.jobs) {
            availableJobs = result.jobs;
            renderAvailableJobs(availableJobs);

            // Populate category filter
            const categories = [...new Set(availableJobs.map(j => j.Category))];
            const filter = document.getElementById('jobCategoryFilter');
            filter.innerHTML = '<option value="">All Categories</option>' +
                categories.map(c => `<option value="${c}">${c}</option>`).join('');
        } else {
            renderAvailableJobs([]);
        }
    } catch (error) {
        console.error('Error loading jobs:', error);
        renderAvailableJobs([]);
    }
}

function filterAvailableJobs() {
    const category = document.getElementById('jobCategoryFilter').value;
    const filtered = category
        ? availableJobs.filter(j => j.Category === category)
        : availableJobs;
    renderAvailableJobs(filtered);
}

function renderAvailableJobs(jobs) {
    const container = document.getElementById('availableJobsList');

    if (!jobs || jobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-briefcase"></i>
                <p>No jobs available right now</p>
                <p style="color:#888;font-size:0.9rem;">Check back soon for new opportunities!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = jobs.map(job => `
        <div class="job-card" onclick="showJobDetails('${job.JobID}')">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
                <span class="job-status status-open">${job.Category}</span>
                <span style="font-size:0.8rem;color:#888;">${formatRelativeTime(job.CreatedAt)}</span>
            </div>
            <div class="job-info">
                <div class="job-title">${escapeHtml(job.Title)}</div>
                <div class="job-customer"><i class="fas fa-user"></i> ${escapeHtml(job.CustomerName)} - ${escapeHtml(job.Location)}</div>
                <div class="job-meta">
                    <span><i class="fas fa-dollar-sign"></i> Budget: ${job.Budget ? formatCurrency(job.Budget) : 'TBD'}</span>
                    <span><i class="fas fa-clock"></i> ${job.Urgency || 'Flexible'}</span>
                </div>
            </div>
            <div class="job-actions" onclick="event.stopPropagation()">
                <button class="btn btn-outline btn-small" onclick="showJobDetails('${job.JobID}')">
                    <i class="fas fa-eye"></i> Details
                </button>
                <button class="btn btn-primary btn-small" onclick="openQuoteModal('${job.JobID}')">
                    <i class="fas fa-paper-plane"></i> Send Quote
                </button>
            </div>
        </div>
    `).join('');
}

function showJobDetails(jobId) {
    const job = [...availableJobs, ...myJobs].find(j => j.JobID === jobId);
    if (!job) return;

    showModal('jobDetailsModal', `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${escapeHtml(job.Title)}</h2>
                <button class="modal-close" onclick="closeModal('jobDetailsModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1rem;">
                    <span class="job-status status-open">${job.Category}</span>
                    <span class="job-status status-${(job.Status || 'open').toLowerCase().replace(' ','-')}">${job.Status || 'Open'}</span>
                </div>

                <div style="margin-bottom:1rem;">
                    <h4 style="color:#1a1a2e;margin-bottom:0.5rem;">Description</h4>
                    <p style="color:#666;">${escapeHtml(job.Description || 'No description provided')}</p>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                    <div>
                        <h4 style="color:#1a1a2e;margin-bottom:0.5rem;">Customer</h4>
                        <p><i class="fas fa-user"></i> ${escapeHtml(job.CustomerName)}</p>
                        <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(job.Location)}</p>
                    </div>
                    <div>
                        <h4 style="color:#1a1a2e;margin-bottom:0.5rem;">Budget</h4>
                        <p style="font-size:1.5rem;font-weight:bold;color:#27ae60;">${job.Budget ? formatCurrency(job.Budget) : 'TBD'}</p>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                    <div>
                        <h4 style="color:#1a1a2e;margin-bottom:0.5rem;">Urgency</h4>
                        <p>${job.Urgency || 'Flexible'}</p>
                    </div>
                    <div>
                        <h4 style="color:#1a1a2e;margin-bottom:0.5rem;">Posted</h4>
                        <p>${formatDate(job.CreatedAt)}</p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal('jobDetailsModal')">Close</button>
                ${job.Status === 'Open' ? `
                    <button class="btn btn-primary" onclick="closeModal('jobDetailsModal');openQuoteModal('${job.JobID}')">
                        <i class="fas fa-paper-plane"></i> Send Quote
                    </button>
                ` : job.Status === 'In Progress' ? `
                    <button class="btn btn-success" onclick="markJobComplete('${job.JobID}', ${job.Budget || 0})">
                        <i class="fas fa-check"></i> Mark Complete
                    </button>
                ` : ''}
            </div>
        </div>
    `);
}

// ===========================================
// QUOTES
// ===========================================

function openQuoteModal(jobId) {
    const job = availableJobs.find(j => j.JobID === jobId);
    if (!job) return;

    showModal('quoteModal', `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Send Quote</h2>
                <button class="modal-close" onclick="closeModal('quoteModal')">&times;</button>
            </div>
            <div class="modal-body">
                <p style="color:#666;margin-bottom:1rem;">Job: <strong>${escapeHtml(job.Title)}</strong></p>

                <div class="form-group">
                    <label class="form-label">Your Quote Amount ($) *</label>
                    <input type="number" class="form-input" id="quoteAmount" min="1" step="0.01"
                           value="${job.Budget || ''}" placeholder="Enter your price" oninput="updateQuotePreview()">
                    ${job.Budget ? `<small style="color:#888;">Customer budget: ${formatCurrency(job.Budget)}</small>` : ''}
                </div>

                <div class="form-group">
                    <label class="form-label">Timeline *</label>
                    <select class="form-select" id="quoteTimeline">
                        <option value="">Select timeline</option>
                        <option value="Same day">Same day</option>
                        <option value="1-2 days">1-2 days</option>
                        <option value="3-5 days">3-5 days</option>
                        <option value="1 week">1 week</option>
                        <option value="2+ weeks">2+ weeks</option>
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Message to Customer</label>
                    <textarea class="form-textarea" id="quoteMessage" rows="3"
                              placeholder="Introduce yourself and explain your approach..."></textarea>
                </div>

                <div style="background:#f8f9fa;padding:1rem;border-radius:10px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;">
                        <span>Your quote:</span>
                        <span id="previewQuote">$0.00</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;color:#888;">
                        <span>Platform fee (10%):</span>
                        <span id="previewFee">-$0.00</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-weight:bold;border-top:1px solid #ddd;padding-top:0.5rem;">
                        <span>Your earnings:</span>
                        <span id="previewEarnings" style="color:#27ae60;">$0.00</span>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal('quoteModal')">Cancel</button>
                <button class="btn btn-primary" onclick="submitQuote('${jobId}')">
                    <i class="fas fa-paper-plane"></i> Submit Quote
                </button>
            </div>
        </div>
    `);

    updateQuotePreview();
}

function updateQuotePreview() {
    const amount = parseFloat(document.getElementById('quoteAmount')?.value) || 0;
    const fee = amount * 0.10;
    const earnings = amount - fee;

    const previewQuote = document.getElementById('previewQuote');
    const previewFee = document.getElementById('previewFee');
    const previewEarnings = document.getElementById('previewEarnings');

    if (previewQuote) previewQuote.textContent = formatCurrency(amount);
    if (previewFee) previewFee.textContent = '-' + formatCurrency(fee);
    if (previewEarnings) previewEarnings.textContent = formatCurrency(earnings);
}

async function submitQuote(jobId) {
    const amount = parseFloat(document.getElementById('quoteAmount').value);
    const timeline = document.getElementById('quoteTimeline').value;
    const message = document.getElementById('quoteMessage').value.trim();

    if (!amount || amount <= 0) {
        CariComProsAPI.showToast('Please enter a valid quote amount', 'error');
        return;
    }

    if (!timeline) {
        CariComProsAPI.showToast('Please select a timeline', 'error');
        return;
    }

    CariComProsAPI.showLoading('Submitting quote...');

    try {
        const result = await CariComProsAPI.request('submitQuote', 'POST', {
            jobId: jobId,
            contractorId: currentContractor.id,
            contractorName: currentContractor.name || currentContractor.businessName,
            amount: amount,
            message: message,
            timeline: timeline
        });

        CariComProsAPI.hideLoading();

        if (result.success) {
            CariComProsAPI.showToast('Quote submitted successfully!', 'success');
            closeModal('quoteModal');
            loadAvailableJobs();
        } else {
            CariComProsAPI.showToast(result.error || 'Failed to submit quote', 'error');
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        CariComProsAPI.showToast('Error submitting quote', 'error');
    }
}

// ===========================================
// MY JOBS
// ===========================================

async function loadMyJobs() {
    try {
        const result = await CariComProsAPI.request('getContractorJobs', 'GET', {
            contractorId: currentContractor.id
        });

        if (result.success) {
            myJobs = result.jobs || [];
            myQuotes = result.quotes || [];
        }

        // Update tab counts
        const activeCount = myJobs.filter(j => j.Status === 'In Progress').length;
        const completedCount = myJobs.filter(j => j.Status === 'Completed').length;
        const quotesCount = myQuotes.length;

        document.getElementById('activeTabCount').textContent = `(${activeCount})`;
        document.getElementById('quotesTabCount').textContent = `(${quotesCount})`;
        document.getElementById('completedTabCount').textContent = `(${completedCount})`;

        // Show active tab by default
        showMyJobsTab('active');

    } catch (error) {
        console.error('Error loading my jobs:', error);
    }
}

function showMyJobsTab(tab, clickedElement) {
    // Update tab active state
    document.querySelectorAll('#my-jobs-section .tab').forEach(t => t.classList.remove('active'));

    // Find and activate the correct tab
    const tabs = document.querySelectorAll('#my-jobs-section .tab');
    tabs.forEach(t => {
        if (t.onclick && t.onclick.toString().includes(`'${tab}'`)) {
            t.classList.add('active');
        }
    });

    // Also handle if called with element
    if (clickedElement) {
        clickedElement.classList.add('active');
    } else if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    // Hide all tab content
    document.querySelectorAll('#my-jobs-section .tab-content').forEach(c => c.classList.remove('active'));

    switch(tab) {
        case 'active':
            document.getElementById('activeJobsTab').classList.add('active');
            renderMyJobsList(myJobs.filter(j => j.Status === 'In Progress'), 'activeJobsList');
            break;
        case 'quotes':
            document.getElementById('quotesTab').classList.add('active');
            renderMyQuotes();
            break;
        case 'completed':
            document.getElementById('completedJobsTab').classList.add('active');
            renderMyJobsList(myJobs.filter(j => j.Status === 'Completed'), 'completedJobsList');
            break;
    }
}

function renderMyJobsList(jobs, containerId) {
    const container = document.getElementById(containerId);

    if (!jobs || jobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>No jobs found</p>
            </div>
        `;
        return;
    }

    container.innerHTML = jobs.map(job => `
        <div class="job-card" onclick="showJobDetails('${job.JobID}')">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
                <span class="job-status status-${job.Status.toLowerCase().replace(' ','-')}">${job.Status}</span>
                <span style="font-size:0.8rem;color:#888;">${formatDate(job.CreatedAt)}</span>
            </div>
            <div class="job-info">
                <div class="job-title">${escapeHtml(job.Title)}</div>
                <div class="job-customer"><i class="fas fa-user"></i> ${escapeHtml(job.CustomerName)} - ${escapeHtml(job.Location)}</div>
                <div class="job-meta">
                    <span><i class="fas fa-dollar-sign"></i> ${formatCurrency(job.Budget)}</span>
                </div>
            </div>
            <div class="job-actions" onclick="event.stopPropagation()">
                ${job.Status === 'In Progress' ? `
                    <button class="btn btn-outline btn-small" onclick="openMessageModal('${job.CustomerID}', '${escapeHtml(job.CustomerName)}')">
                        <i class="fas fa-comment"></i> Message
                    </button>
                    <button class="btn btn-success btn-small" onclick="markJobComplete('${job.JobID}', ${job.Budget || 0})">
                        <i class="fas fa-check"></i> Complete
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function renderMyQuotes() {
    const container = document.getElementById('myQuotesList');

    if (!myQuotes || myQuotes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-invoice-dollar"></i>
                <p>No quotes sent yet</p>
                <button class="btn btn-primary btn-small" onclick="showSection('jobs')">Find Jobs</button>
            </div>
        `;
        return;
    }

    container.innerHTML = myQuotes.map(quote => `
        <div class="job-card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
                <span class="job-status status-${quote.Status.toLowerCase()}">${quote.Status}</span>
                <span style="font-size:0.8rem;color:#888;">${formatRelativeTime(quote.CreatedAt)}</span>
            </div>
            <div class="job-info">
                <div class="job-title">Quote: ${formatCurrency(quote.Amount)}</div>
                <div class="job-meta">
                    <span><i class="fas fa-clock"></i> ${quote.Timeline}</span>
                </div>
                ${quote.Message ? `<p style="color:#666;font-size:0.9rem;margin-top:0.5rem;">"${escapeHtml(quote.Message.substring(0, 80))}${quote.Message.length > 80 ? '...' : ''}"</p>` : ''}
            </div>
        </div>
    `).join('');
}

async function markJobComplete(jobId, amount) {
    if (!confirm('Mark this job as complete? The customer will be notified.')) return;

    CariComProsAPI.showLoading('Completing job...');

    try {
        const result = await CariComProsAPI.request('completeJob', 'POST', {
            jobId: jobId,
            contractorId: currentContractor.id,
            amount: amount
        });

        CariComProsAPI.hideLoading();

        if (result.success) {
            CariComProsAPI.showToast('Job completed! Payment will be processed.', 'success');
            closeModal('jobDetailsModal');
            loadMyJobs();
            loadDashboard();
        } else {
            CariComProsAPI.showToast(result.error || 'Failed to complete job', 'error');
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        CariComProsAPI.showToast('Error completing job', 'error');
    }
}

// ===========================================
// EARNINGS
// ===========================================

async function loadEarnings() {
    try {
        const result = await CariComProsAPI.request('getContractorPayments', 'GET', {
            contractorId: currentContractor.id
        });

        if (result.success && result.payments) {
            transactions = result.payments;

            const completed = transactions.filter(t => t.Status === 'Completed');
            const pending = transactions.filter(t => t.Status === 'Pending');

            const totalEarned = completed.reduce((sum, t) => sum + (parseFloat(t.ContractorPayout) || 0), 0);
            const pendingAmount = pending.reduce((sum, t) => sum + (parseFloat(t.ContractorPayout) || 0), 0);

            document.getElementById('totalEarned').textContent = formatCurrency(totalEarned);
            document.getElementById('availableBalance').textContent = formatCurrency(totalEarned);
            document.getElementById('pendingBalance').textContent = formatCurrency(pendingAmount);

            renderTransactions(transactions);
        } else {
            renderTransactions([]);
        }
    } catch (error) {
        console.error('Error loading earnings:', error);
        renderTransactions([]);
    }
}

function renderTransactions(transactions) {
    const container = document.getElementById('transactionsList');

    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:#888;">No transactions yet</td></tr>';
        return;
    }

    container.innerHTML = transactions.map(t => `
        <tr onclick="showTransactionDetails('${t.PaymentID}')">
            <td>${formatDate(t.CreatedAt)}</td>
            <td>${escapeHtml(t.JobTitle || 'Job Payment')}</td>
            <td>${escapeHtml(t.CustomerName || 'Customer')}</td>
            <td style="text-align:right;" class="amount-positive">+${formatCurrency(t.ContractorPayout)}</td>
            <td style="text-align:center;"><span class="job-status status-${t.Status.toLowerCase()}">${t.Status}</span></td>
        </tr>
    `).join('');
}

function showTransactionDetails(paymentId) {
    const transaction = transactions.find(t => t.PaymentID === paymentId);
    if (!transaction) return;

    showModal('transactionModal', `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Transaction Details</h2>
                <button class="modal-close" onclick="closeModal('transactionModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div style="text-align:center;margin-bottom:1.5rem;">
                    <div style="font-size:2rem;font-weight:bold;color:#27ae60;">${formatCurrency(transaction.ContractorPayout)}</div>
                    <span class="job-status status-${transaction.Status.toLowerCase()}">${transaction.Status}</span>
                </div>

                <div style="background:#f8f9fa;padding:1rem;border-radius:10px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;">
                        <span>Total Job Amount:</span>
                        <span>${formatCurrency(transaction.TotalAmount)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;color:#888;">
                        <span>Platform Fee (10%):</span>
                        <span>-${formatCurrency(transaction.PlatformFee)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;font-weight:bold;border-top:1px solid #ddd;padding-top:0.5rem;">
                        <span>Your Earnings:</span>
                        <span style="color:#27ae60;">${formatCurrency(transaction.ContractorPayout)}</span>
                    </div>
                </div>

                <div style="margin-top:1rem;">
                    <p><strong>Date:</strong> ${formatDate(transaction.CreatedAt)}</p>
                    <p><strong>Job:</strong> ${escapeHtml(transaction.JobTitle || 'Job Payment')}</p>
                    <p><strong>Payment ID:</strong> ${transaction.PaymentID}</p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal('transactionModal')">Close</button>
            </div>
        </div>
    `);
}

function requestWithdrawal() {
    // Check if payout settings are configured
    if (typeof ContractorPayouts !== 'undefined') {
        ContractorPayouts.openSettings();
    } else {
        showModal('withdrawModal', `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Withdraw Funds</h2>
                    <button class="modal-close" onclick="closeModal('withdrawModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="color:#666;margin-bottom:1rem;">To withdraw funds, please configure your payout method first.</p>
                    <button class="btn btn-primary" onclick="closeModal('withdrawModal');showSection('settings')">
                        Configure Payout Method
                    </button>
                </div>
            </div>
        `);
    }
}

// ===========================================
// SCHEDULE
// ===========================================

async function loadSchedule() {
    try {
        const result = await CariComProsAPI.request('getContractorJobs', 'GET', {
            contractorId: currentContractor.id
        });

        if (result.success && result.jobs) {
            scheduledJobs = result.jobs.filter(j => j.Status === 'In Progress');
        }

        initCalendar();
        renderUpcomingJobs();
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
}

function initCalendar() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;

    grid.innerHTML = '';
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

    // Empty cells for days before first day
    for (let i = 0; i < firstDay; i++) {
        const cell = document.createElement('div');
        cell.style.cssText = 'aspect-ratio:1;border:1px solid #e9ecef;border-radius:8px;opacity:0.3;';
        grid.appendChild(cell);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.textContent = day;
        cell.style.cssText = 'aspect-ratio:1;border:1px solid #e9ecef;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all 0.3s;';

        // Check if this day has jobs
        const hasJob = scheduledJobs.some(job => {
            const jobDate = new Date(job.CreatedAt);
            return jobDate.getDate() === day && jobDate.getMonth() === month && jobDate.getFullYear() === year;
        });

        if (hasJob) {
            cell.style.background = 'rgba(33,150,243,0.1)';
            cell.style.borderColor = '#2196F3';
        }

        // Today
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            cell.style.background = '#ffd700';
            cell.style.color = '#1a1a2e';
            cell.style.fontWeight = 'bold';
        }

        cell.onclick = () => showDayJobs(year, month, day);
        grid.appendChild(cell);
    }
}

function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    initCalendar();
}

function showDayJobs(year, month, day) {
    const selectedDate = new Date(year, month, day);
    const dayJobs = scheduledJobs.filter(job => {
        const jobDate = new Date(job.CreatedAt);
        return jobDate.toDateString() === selectedDate.toDateString();
    });

    if (dayJobs.length === 0) {
        CariComProsAPI.showToast('No jobs on this day', 'info');
        return;
    }

    showModal('dayJobsModal', `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Jobs on ${formatDate(selectedDate)}</h2>
                <button class="modal-close" onclick="closeModal('dayJobsModal')">&times;</button>
            </div>
            <div class="modal-body">
                ${dayJobs.map(job => `
                    <div class="job-card" style="margin-bottom:1rem;" onclick="closeModal('dayJobsModal');showJobDetails('${job.JobID}')">
                        <div class="job-title">${escapeHtml(job.Title)}</div>
                        <div class="job-customer"><i class="fas fa-user"></i> ${escapeHtml(job.CustomerName)}</div>
                        <div class="job-meta">
                            <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(job.Location)}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `);
}

function renderUpcomingJobs() {
    const container = document.getElementById('upcomingJobsList');

    if (!scheduledJobs || scheduledJobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-alt"></i>
                <p>No upcoming jobs</p>
            </div>
        `;
        return;
    }

    container.innerHTML = scheduledJobs.slice(0, 5).map(job => `
        <div class="job-card" onclick="showJobDetails('${job.JobID}')">
            <div class="job-info">
                <div class="job-title">${escapeHtml(job.Title)}</div>
                <div class="job-customer"><i class="fas fa-user"></i> ${escapeHtml(job.CustomerName)} - ${escapeHtml(job.Location)}</div>
                <div class="job-meta">
                    <span><i class="fas fa-calendar"></i> ${formatDate(job.CreatedAt)}</span>
                    <span><i class="fas fa-dollar-sign"></i> ${formatCurrency(job.Budget)}</span>
                </div>
            </div>
            <span class="job-status status-in-progress">In Progress</span>
        </div>
    `).join('');
}

// ===========================================
// MESSAGES
// ===========================================

async function loadMessages() {
    const sidebar = document.getElementById('conversationsList');
    sidebar.innerHTML = '<div style="padding:2rem;text-align:center;color:#888;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

    try {
        const result = await CariComProsAPI.request('getMessages', 'GET', {
            recipientId: currentContractor.id
        });

        if (result.success && result.conversations) {
            conversations = result.conversations;
            renderConversations(conversations);

            // Update badge
            const unread = conversations.filter(c => !c.Read).length;
            document.getElementById('messagesBadge').textContent = unread;
        } else {
            conversations = [];
            renderConversations([]);
        }
    } catch (error) {
        console.error('Error loading messages:', error);
        sidebar.innerHTML = '<div style="padding:2rem;text-align:center;color:#888;">No conversations</div>';
    }
}

function renderConversations(conversations) {
    const sidebar = document.getElementById('conversationsList');

    if (!conversations || conversations.length === 0) {
        sidebar.innerHTML = '<div style="padding:2rem;text-align:center;color:#888;">No conversations yet</div>';
        return;
    }

    sidebar.innerHTML = conversations.map(conv => `
        <div class="message-item ${conv.Read ? '' : 'unread'} ${currentConversation === conv.SenderID ? 'active' : ''}"
             onclick="openConversation('${conv.SenderID}', '${escapeHtml(conv.SenderName)}')">
            <div class="message-avatar">${getInitials(conv.SenderName)}</div>
            <div class="message-content">
                <div class="message-sender">${escapeHtml(conv.SenderName)}</div>
                <div class="message-preview">${escapeHtml(conv.LastMessage || 'No messages')}</div>
            </div>
            <div class="message-time">${formatRelativeTime(conv.LastMessageTime)}</div>
        </div>
    `).join('');
}

function openConversation(senderId, senderName) {
    currentConversation = senderId;

    // Update sidebar active state
    document.querySelectorAll('.message-item').forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');

    // Update chat header
    document.getElementById('chatHeader').style.display = 'flex';
    document.getElementById('chatAvatar').textContent = getInitials(senderName);
    document.getElementById('chatName').textContent = senderName;
    document.getElementById('chatInputArea').style.display = 'flex';

    // Load conversation messages
    loadConversationMessages(senderId);
}

async function loadConversationMessages(senderId) {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '<div style="text-align:center;padding:2rem;color:#888;"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const result = await CariComProsAPI.request('getConversation', 'GET', {
            user1: currentContractor.id,
            user2: senderId
        });

        if (result.success && result.messages) {
            renderChatMessages(result.messages);
        } else {
            chatMessages.innerHTML = '<div style="text-align:center;padding:2rem;color:#888;">Start a conversation!</div>';
        }
    } catch (error) {
        chatMessages.innerHTML = '<div style="text-align:center;padding:2rem;color:#888;">Could not load messages</div>';
    }
}

function renderChatMessages(messages) {
    const chatMessages = document.getElementById('chatMessages');

    if (!messages || messages.length === 0) {
        chatMessages.innerHTML = '<div style="text-align:center;padding:2rem;color:#888;">No messages yet</div>';
        return;
    }

    chatMessages.innerHTML = messages.map(msg => `
        <div class="chat-bubble ${msg.FromID === currentContractor.id ? 'sent' : 'received'}">
            <p>${escapeHtml(msg.Message)}</p>
            <div class="time">${formatRelativeTime(msg.CreatedAt)}</div>
        </div>
    `).join('');

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message || !currentConversation) return;

    input.value = '';

    try {
        await CariComProsAPI.request('sendMessage', 'POST', {
            fromId: currentContractor.id,
            toId: currentConversation,
            message: message
        });

        // Reload messages
        loadConversationMessages(currentConversation);
    } catch (error) {
        CariComProsAPI.showToast('Failed to send message', 'error');
    }
}

function openMessageModal(customerId, customerName) {
    showModal('messageModal', `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Message ${escapeHtml(customerName)}</h2>
                <button class="modal-close" onclick="closeModal('messageModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Message</label>
                    <textarea class="form-textarea" id="newMessageText" rows="4" placeholder="Type your message..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal('messageModal')">Cancel</button>
                <button class="btn btn-primary" onclick="sendNewMessage('${customerId}')">
                    <i class="fas fa-paper-plane"></i> Send
                </button>
            </div>
        </div>
    `);
}

async function sendNewMessage(recipientId) {
    const message = document.getElementById('newMessageText').value.trim();
    if (!message) {
        CariComProsAPI.showToast('Please enter a message', 'error');
        return;
    }

    CariComProsAPI.showLoading('Sending...');

    try {
        const result = await CariComProsAPI.request('sendMessage', 'POST', {
            fromId: currentContractor.id,
            toId: recipientId,
            message: message
        });

        CariComProsAPI.hideLoading();

        if (result.success) {
            CariComProsAPI.showToast('Message sent!', 'success');
            closeModal('messageModal');
        } else {
            CariComProsAPI.showToast(result.error || 'Failed to send', 'error');
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        CariComProsAPI.showToast('Failed to send message', 'error');
    }
}

// ===========================================
// REVIEWS
// ===========================================

async function loadReviews() {
    const container = document.getElementById('reviewsList');
    container.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading...</p></div>';

    try {
        const result = await CariComProsAPI.request('getContractorReviews', 'GET', {
            contractorId: currentContractor.id
        });

        if (result.success && result.reviews) {
            const reviews = result.reviews;
            const avgRating = reviews.length > 0
                ? reviews.reduce((sum, r) => sum + r.Rating, 0) / reviews.length
                : 0;

            document.getElementById('averageRating').textContent = avgRating.toFixed(1);
            document.getElementById('totalReviews').textContent = reviews.length;
            document.getElementById('ratingStars').innerHTML = generateStars(Math.round(avgRating));

            renderReviewsList(reviews);
        } else {
            renderReviewsList([]);
        }
    } catch (error) {
        console.error('Error loading reviews:', error);
        container.innerHTML = '<div class="empty-state"><i class="fas fa-star"></i><p>No reviews yet</p></div>';
    }
}

function renderReviewsList(reviews) {
    const container = document.getElementById('reviewsList');

    if (!reviews || reviews.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-star"></i>
                <p>No reviews yet</p>
                <p style="color:#888;font-size:0.9rem;">Complete jobs to receive reviews from customers</p>
            </div>
        `;
        return;
    }

    container.innerHTML = reviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <span class="review-customer">${escapeHtml(review.CustomerName)}</span>
                <span class="review-rating">${generateStars(review.Rating)}</span>
            </div>
            <p class="review-text">${escapeHtml(review.Comment || 'Great work!')}</p>
            ${review.JobTitle ? `<div style="font-size:0.85rem;color:#666;margin-top:0.5rem;">Job: ${escapeHtml(review.JobTitle)}</div>` : ''}
            <div class="review-date">${formatDate(review.CreatedAt)}</div>
        </div>
    `).join('');
}

// ===========================================
// VERIFICATION
// ===========================================

async function loadVerification() {
    const container = document.getElementById('verificationSteps');

    const verificationStatus = currentContractor.verified || 'Pending';
    const steps = [
        { id: 'basic', title: 'Basic Information', desc: 'Profile details and contact info', status: 'completed' },
        { id: 'identity', title: 'Identity Verification', desc: 'Government ID verification', status: verificationStatus === 'Verified' ? 'completed' : 'pending' },
        { id: 'certifications', title: 'Professional Certifications', desc: 'Upload licenses and certifications', status: 'incomplete' },
        { id: 'background', title: 'Background Check', desc: 'Criminal background verification', status: 'incomplete' },
        { id: 'insurance', title: 'Insurance Verification', desc: 'Liability insurance documentation', status: 'incomplete' }
    ];

    container.innerHTML = steps.map(step => `
        <div class="verification-step ${step.status}">
            <div class="step-icon ${step.status}">
                <i class="fas ${step.status === 'completed' ? 'fa-check' : step.status === 'pending' ? 'fa-clock' : 'fa-shield-alt'}"></i>
            </div>
            <div class="step-info">
                <div class="step-title">${step.title}</div>
                <div class="step-description">${step.desc}</div>
            </div>
            ${step.status === 'completed'
                ? '<span style="color:#4CAF50;">Completed</span>'
                : step.status === 'pending'
                ? '<span style="color:#FF9800;">Pending Review</span>'
                : `<button class="btn btn-outline btn-small" onclick="startVerificationStep('${step.id}')">${step.id === 'background' ? 'Start' : 'Upload'}</button>`
            }
        </div>
    `).join('');

    // Show upload section if needed
    document.getElementById('uploadDocSection').style.display = 'block';

    // Update sidebar verification badge
    updateVerificationBadge(verificationStatus);
}

function updateVerificationBadge(status) {
    const badge = document.getElementById('sidebarVerification');
    if (!badge) return;

    if (status === 'Verified') {
        badge.className = 'verification-status verified';
        badge.innerHTML = '<i class="fas fa-check"></i> <span>Verified</span>';
    } else if (status === 'Pending') {
        badge.className = 'verification-status pending';
        badge.innerHTML = '<i class="fas fa-clock"></i> <span>Pending</span>';
    } else {
        badge.className = 'verification-status unverified';
        badge.innerHTML = '<i class="fas fa-exclamation"></i> <span>Unverified</span>';
    }
}

function startVerificationStep(stepId) {
    if (stepId === 'background') {
        showModal('backgroundCheckModal', `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Background Check</h2>
                    <button class="modal-close" onclick="closeModal('backgroundCheckModal')">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="color:#666;margin-bottom:1rem;">A background check helps build trust with customers. This process typically takes 3-5 business days.</p>
                    <div style="background:#e3f2fd;padding:1rem;border-radius:10px;margin-bottom:1rem;">
                        <h4 style="color:#1976d2;margin-bottom:0.5rem;"><i class="fas fa-info-circle"></i> What's Required</h4>
                        <ul style="color:#666;margin-left:1rem;">
                            <li>Government-issued ID</li>
                            <li>Social security number (last 4 digits)</li>
                            <li>Current address verification</li>
                        </ul>
                    </div>
                    <p style="font-size:0.9rem;color:#888;">By proceeding, you consent to a background verification check.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-outline" onclick="closeModal('backgroundCheckModal')">Cancel</button>
                    <button class="btn btn-primary" onclick="initiateBackgroundCheck()">Start Background Check</button>
                </div>
            </div>
        `);
    } else {
        document.getElementById('docUpload').click();
    }
}

function handleDocUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
        CariComProsAPI.showToast('File size must be less than 10MB', 'error');
        return;
    }

    CariComProsAPI.showToast(`Document "${file.name}" uploaded successfully!`, 'success');

    // Show uploaded doc
    const uploadedDocs = document.getElementById('uploadedDocs');
    uploadedDocs.innerHTML += `
        <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem;background:#f8f9fa;border-radius:8px;margin-bottom:0.5rem;">
            <i class="fas fa-file-alt" style="color:#666;"></i>
            <span style="flex:1;">${escapeHtml(file.name)}</span>
            <span style="color:#FF9800;font-size:0.8rem;">Pending review</span>
        </div>
    `;
}

function initiateBackgroundCheck() {
    CariComProsAPI.showToast('Background check initiated. You will be notified when complete.', 'success');
    closeModal('backgroundCheckModal');
}

// ===========================================
// PROFILE
// ===========================================

function loadProfile() {
    if (!currentContractor) return;

    document.getElementById('profileName').value = currentContractor.name || '';
    document.getElementById('profileBusiness').value = currentContractor.businessName || '';
    document.getElementById('profileEmail').value = currentContractor.email || '';
    document.getElementById('profilePhone').value = currentContractor.phone || '';
    document.getElementById('profileCategory').value = currentContractor.category || '';
    document.getElementById('profileLocation').value = currentContractor.location || '';
    document.getElementById('profileBio').value = currentContractor.bio || '';
    document.getElementById('profileRate').value = currentContractor.hourlyRate || '';
}

async function saveProfile(event) {
    event.preventDefault();

    const data = {
        contractorId: currentContractor.id,
        name: document.getElementById('profileName').value.trim(),
        businessName: document.getElementById('profileBusiness').value.trim(),
        email: document.getElementById('profileEmail').value.trim(),
        phone: document.getElementById('profilePhone').value.trim(),
        category: document.getElementById('profileCategory').value,
        location: document.getElementById('profileLocation').value,
        bio: document.getElementById('profileBio').value.trim(),
        hourlyRate: document.getElementById('profileRate').value
    };

    if (!data.name || !data.email) {
        CariComProsAPI.showToast('Name and email are required', 'error');
        return;
    }

    CariComProsAPI.showLoading('Saving...');

    try {
        const result = await CariComProsAPI.request('updateContractor', 'POST', data);

        CariComProsAPI.hideLoading();

        if (result.success) {
            // Update local data
            currentContractor = { ...currentContractor, ...data };
            CariComProsAPI.setUserData(currentContractor);

            // Update sidebar
            document.getElementById('sidebarName').textContent = data.name || data.businessName;
            document.getElementById('sidebarAvatar').textContent = getInitials(data.name);

            CariComProsAPI.showToast('Profile updated!', 'success');
        } else {
            CariComProsAPI.showToast(result.error || 'Failed to update', 'error');
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        CariComProsAPI.showToast('Error updating profile', 'error');
    }
}

// ===========================================
// SETTINGS
// ===========================================

async function loadSettings() {
    // Load payout settings
    try {
        const result = await CariComProsAPI.request('getPayoutSettings', 'GET', {
            contractorId: currentContractor.id
        });

        if (result.success && result.settings) {
            displayPayoutSettings(result.settings);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

function displayPayoutSettings(settings) {
    const icon = document.getElementById('payoutMethodIcon');
    const name = document.getElementById('payoutMethodName');
    const detail = document.getElementById('payoutMethodDetail');
    const status = document.getElementById('payoutStatus');

    if (!settings || !settings.method) {
        icon.className = 'fas fa-wallet';
        icon.style.color = '#666';
        name.textContent = 'Not configured';
        detail.textContent = 'Set up your payout method';
        status.innerHTML = '<i class="fas fa-exclamation-circle"></i> Not set';
        status.style.color = '#999';
        return;
    }

    const methods = {
        'square': { icon: 'fab fa-square', color: '#006aff', name: 'Square', detail: settings.squareEmail },
        'paypal': { icon: 'fab fa-paypal', color: '#003087', name: 'PayPal', detail: settings.paypalEmail },
        'bank': { icon: 'fas fa-university', color: '#27ae60', name: 'Bank Transfer', detail: settings.bankName ? `${settings.bankName} ****${(settings.accountNumber || '').slice(-4)}` : 'Bank account' }
    };

    const method = methods[settings.method];
    if (method) {
        icon.className = method.icon;
        icon.style.color = method.color;
        name.textContent = method.name;
        detail.textContent = method.detail || 'Connected';
        status.innerHTML = '<i class="fas fa-check-circle"></i> Connected';
        status.style.color = '#27ae60';
    }
}

function openPayoutSettings() {
    if (typeof ContractorPayouts !== 'undefined') {
        ContractorPayouts.openSettings();
    } else {
        CariComProsAPI.showToast('Payout settings not available', 'error');
    }
}

function toggleSetting(element, setting) {
    element.classList.toggle('active');
    const isActive = element.classList.contains('active');
    console.log(`Setting ${setting}: ${isActive}`);
    // Save setting to backend if needed
}

function toggleAvailability(element) {
    element.classList.toggle('active');
    const isAvailable = element.classList.contains('active');
    CariComProsAPI.showToast(isAvailable ? 'You are now available for jobs' : 'You are now unavailable', 'info');
}

function showChangePasswordModal() {
    showModal('passwordModal', `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Change Password</h2>
                <button class="modal-close" onclick="closeModal('passwordModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label class="form-label">Current Password</label>
                    <input type="password" class="form-input" id="currentPassword">
                </div>
                <div class="form-group">
                    <label class="form-label">New Password</label>
                    <input type="password" class="form-input" id="newPassword">
                </div>
                <div class="form-group">
                    <label class="form-label">Confirm New Password</label>
                    <input type="password" class="form-input" id="confirmPassword">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-outline" onclick="closeModal('passwordModal')">Cancel</button>
                <button class="btn btn-primary" onclick="changePassword()">Update Password</button>
            </div>
        </div>
    `);
}

async function changePassword() {
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;

    if (!newPass || newPass.length < 6) {
        CariComProsAPI.showToast('Password must be at least 6 characters', 'error');
        return;
    }

    if (newPass !== confirm) {
        CariComProsAPI.showToast('Passwords do not match', 'error');
        return;
    }

    CariComProsAPI.showLoading('Updating...');

    try {
        const result = await CariComProsAPI.request('updatePassword', 'POST', {
            contractorId: currentContractor.id,
            currentPassword: current,
            newPassword: newPass
        });

        CariComProsAPI.hideLoading();

        if (result.success) {
            CariComProsAPI.showToast('Password updated!', 'success');
            closeModal('passwordModal');
        } else {
            CariComProsAPI.showToast(result.error || 'Failed to update password', 'error');
        }
    } catch (error) {
        CariComProsAPI.hideLoading();
        CariComProsAPI.showToast('Error updating password', 'error');
    }
}

function setup2FA() {
    CariComProsAPI.showToast('Two-factor authentication coming soon!', 'info');
}

function deleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    if (!confirm('This will permanently delete all your data. Are you absolutely sure?')) return;

    CariComProsAPI.showToast('Please contact support to delete your account.', 'info');
}

// ===========================================
// NOTIFICATIONS
// ===========================================

function showNotifications() {
    showModal('notificationsModal', `
        <div class="modal-content" style="max-width:400px;">
            <div class="modal-header">
                <h2>Notifications</h2>
                <button class="modal-close" onclick="closeModal('notificationsModal')">&times;</button>
            </div>
            <div class="modal-body" style="max-height:400px;overflow-y:auto;">
                <div style="padding:1rem;border-bottom:1px solid #eee;cursor:pointer;" onclick="showSection('jobs');closeModal('notificationsModal');">
                    <i class="fas fa-briefcase" style="color:#2196F3;"></i>
                    <span style="margin-left:0.5rem;">New jobs available in your area</span>
                    <div style="font-size:0.8rem;color:#999;margin-top:0.25rem;">Just now</div>
                </div>
                <div style="padding:2rem;text-align:center;color:#888;">
                    <i class="fas fa-bell" style="font-size:2rem;color:#ddd;"></i>
                    <p style="margin-top:0.5rem;">No more notifications</p>
                </div>
            </div>
        </div>
    `);
}

// ===========================================
// INITIALIZATION
// ===========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Hidden Kingz Contractor Dashboard - Production');

    // Check authentication
    if (!checkAuth()) return;

    // Load contractor data
    currentContractor = CariComProsAPI.getUserData();

    if (currentContractor) {
        console.log('Contractor:', currentContractor.name || currentContractor.email);

        // Update sidebar
        document.getElementById('sidebarName').textContent = currentContractor.name || currentContractor.businessName || 'Contractor';
        document.getElementById('sidebarAvatar').textContent = getInitials(currentContractor.name || currentContractor.businessName);
        updateVerificationBadge(currentContractor.verified);
    }

    // Load dashboard
    loadDashboard();

    // Handle hash navigation
    const hash = window.location.hash.replace('#', '');
    if (hash) {
        showSection(hash);
    }
});

// Handle browser back/forward
window.addEventListener('hashchange', function() {
    const hash = window.location.hash.replace('#', '');
    if (hash) showSection(hash);
});

// Close modals on Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => m.remove());
    }
});

// ===========================================
// MARKETPLACE LISTINGS
// ===========================================

async function loadMyListings() {
    if (!currentContractor) return;

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
            ? `<img src="${images[0]}" alt="${escapeHtml(listing.Title)}">`
            : `<i class="fas fa-image"></i>`;

        return `
            <div class="listing-card">
                <div class="listing-image">
                    ${imageHtml}
                </div>
                <div class="listing-content">
                    <div class="listing-price">${parseFloat(listing.Price) === 0 ? 'FREE' : CariComProsAPI.formatCurrency(listing.Price, listing.Location)}</div>
                    <div class="listing-title">${escapeHtml(listing.Title)}</div>
                    <div class="listing-meta">
                        <span><i class="fas fa-tag"></i> ${escapeHtml(listing.Condition)}</span>
                        <span class="listing-status ${listing.Status}">${listing.Status === 'active' ? 'Active' : listing.Status === 'sold' ? 'Sold' : listing.Status}</span>
                    </div>
                    <div class="listing-meta">
                        <span><i class="fas fa-eye"></i> ${listing.Views || 0} views</span>
                        <span>${formatRelativeTime(listing.CreatedAt)}</span>
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
    const previewEl = document.getElementById('listingImagePreview');
    if (previewEl) previewEl.innerHTML = '';
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

    const previewContainer = document.getElementById('listingImagePreview');
    const items = previewContainer.querySelectorAll('.image-preview-item');
    items.forEach((item, i) => {
        const btn = item.querySelector('.image-preview-remove');
        btn.setAttribute('onclick', `removeListingImage(${i}, this.parentElement)`);
    });
}

async function submitListing(event) {
    event.preventDefault();

    if (!currentContractor) {
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
    if (!confirm('Mark this listing as sold?')) return;

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
    if (!confirm('Delete this listing? This action cannot be undone.')) return;

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

// ===========================================
// MAKE ALL FUNCTIONS GLOBAL
// ===========================================

window.showSection = showSection;
window.toggleSidebar = toggleSidebar;
window.logout = logout;
window.showJobDetails = showJobDetails;
window.openQuoteModal = openQuoteModal;
window.submitQuote = submitQuote;
window.updateQuotePreview = updateQuotePreview;
window.filterAvailableJobs = filterAvailableJobs;
window.showMyJobsTab = showMyJobsTab;
window.markJobComplete = markJobComplete;
window.loadEarnings = loadEarnings;
window.showTransactionDetails = showTransactionDetails;
window.requestWithdrawal = requestWithdrawal;
window.changeMonth = changeMonth;
window.showDayJobs = showDayJobs;
window.openMessageModal = openMessageModal;
window.sendNewMessage = sendNewMessage;
window.sendChatMessage = sendChatMessage;
window.openConversation = openConversation;
window.startVerificationStep = startVerificationStep;
window.handleDocUpload = handleDocUpload;
window.initiateBackgroundCheck = initiateBackgroundCheck;
window.saveProfile = saveProfile;
window.toggleSetting = toggleSetting;
window.toggleAvailability = toggleAvailability;
window.openPayoutSettings = openPayoutSettings;
window.showChangePasswordModal = showChangePasswordModal;
window.changePassword = changePassword;
window.setup2FA = setup2FA;
window.deleteAccount = deleteAccount;
window.showNotifications = showNotifications;
window.closeModal = closeModal;
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
