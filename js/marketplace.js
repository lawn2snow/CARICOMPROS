/**
 * Hidden Kingz Marketplace - JavaScript
 * Handles all marketplace functionality
 */

// State
let currentFilters = {
    category: '',
    location: '',
    condition: '',
    minPrice: '',
    maxPrice: '',
    search: ''
};
let uploadedImages = [];
let currentListing = null;
let allListings = [];

// Verification State
let selectedIdTypeValue = '';
let uploadedIdImage = null;
let currentVerificationStep = 1;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeMarketplace();
});

async function initializeMarketplace() {
    // Update auth button state
    updateAuthButton();

    // Setup category chips
    setupCategoryChips();

    // Setup search on Enter key
    setupSearchInput();

    // Check for URL params (e.g., ?category=Electronics)
    checkUrlParams();

    // Load listings
    await loadListings();
}

function updateAuthButton() {
    const authBtn = document.getElementById('authBtn');
    if (CariComProsAPI.isLoggedIn()) {
        const user = CariComProsAPI.getUserData();
        authBtn.textContent = user.name || 'My Account';
        authBtn.onclick = () => {
            const userType = CariComProsAPI.getUserType();
            window.location.href = userType === 'contractor' ? 'contractors.html' : 'customers.html';
        };
    }
}

function setupCategoryChips() {
    const chips = document.querySelectorAll('.category-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            // Update active state
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            // Update filter and reload
            currentFilters.category = chip.dataset.category === 'all' ? '' : chip.dataset.category;
            loadListings();
        });
    });
}

function setupSearchInput() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });
}

function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);

    // Check for direct listing link (from social share)
    const listingId = params.get('listing');
    if (listingId) {
        // Open listing detail after a short delay to allow page to load
        setTimeout(() => {
            openListingDetail(listingId);
        }, 500);
    }

    // Check for category filter
    const category = params.get('category');
    if (category) {
        currentFilters.category = category;
        // Update active chip
        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.classList.remove('active');
            if (chip.dataset.category === category) {
                chip.classList.add('active');
            }
        });
    }
}

// ============================================
// LISTINGS MANAGEMENT
// ============================================

async function loadListings() {
    const grid = document.getElementById('listingsGrid');
    const emptyState = document.getElementById('emptyState');
    const spinner = document.getElementById('loadingSpinner');
    const countEl = document.getElementById('listingsCount');

    // Show loading
    grid.innerHTML = '';
    emptyState.classList.add('hidden');
    spinner.classList.remove('hidden');

    try {
        const result = await CariComProsAPI.getListings(currentFilters);

        spinner.classList.add('hidden');

        if (!result.success) {
            CariComProsAPI.showToast(result.error || 'Failed to load listings', 'error');
            emptyState.classList.remove('hidden');
            return;
        }

        allListings = result.listings || [];

        // Apply sorting
        sortListings();

        // Update count
        countEl.textContent = `(${allListings.length})`;

        if (allListings.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            renderListings(allListings);
        }

    } catch (error) {
        console.error('Error loading listings:', error);
        spinner.classList.add('hidden');
        emptyState.classList.remove('hidden');
        CariComProsAPI.showToast('Error loading listings', 'error');
    }
}

function sortListings() {
    const sortBy = document.getElementById('sortBy').value;

    switch (sortBy) {
        case 'price-low':
            allListings.sort((a, b) => (a.Price || 0) - (b.Price || 0));
            break;
        case 'price-high':
            allListings.sort((a, b) => (b.Price || 0) - (a.Price || 0));
            break;
        case 'newest':
        default:
            allListings.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
            break;
    }
}

function renderListings(listings) {
    const grid = document.getElementById('listingsGrid');
    grid.innerHTML = '';

    listings.forEach(listing => {
        const card = createListingCard(listing);
        grid.appendChild(card);
    });
}

function createListingCard(listing) {
    const card = document.createElement('div');
    card.className = 'listing-card';
    card.onclick = () => openListingDetail(listing.ListingID);

    const price = listing.Price === 0 || listing.Price === '0'
        ? 'FREE'
        : CariComProsAPI.formatCurrency(listing.Price, listing.Location);

    const priceClass = listing.Price === 0 || listing.Price === '0' ? 'free' : '';

    const mainImage = listing.Images && listing.Images.length > 0
        ? listing.Images[0]
        : null;

    const imageHTML = mainImage
        ? `<img src="${mainImage}" alt="${listing.Title}" loading="lazy">`
        : `<div class="no-image"><i class="fas fa-image"></i></div>`;

    const soldBadge = listing.Status === 'sold'
        ? '<div class="sold-badge">SOLD</div>'
        : '';

    const verifiedBadge = isSellerVerified(listing)
        ? '<span class="verified-badge"><i class="fas fa-shield-alt"></i> Verified</span>'
        : '';

    card.innerHTML = `
        <div class="listing-card-image">
            ${imageHTML}
            ${soldBadge}
        </div>
        <div class="listing-card-content">
            <div class="listing-card-price ${priceClass}">${price}</div>
            <h3 class="listing-card-title">${escapeHTML(listing.Title)}</h3>
            <div class="listing-card-meta">
                <span class="condition">${listing.Condition || 'Good'}</span>
                <span><i class="fas fa-map-marker-alt"></i> ${listing.Location || 'Caribbean'}</span>
                ${verifiedBadge}
            </div>
        </div>
    `;

    return card;
}

// ============================================
// FILTERS
// ============================================

function applyFilters() {
    currentFilters.search = document.getElementById('searchInput').value.trim();
    currentFilters.location = document.getElementById('locationFilter').value;
    currentFilters.condition = document.getElementById('conditionFilter').value;
    currentFilters.minPrice = document.getElementById('minPrice').value;
    currentFilters.maxPrice = document.getElementById('maxPrice').value;

    loadListings();
}

function resetFilters() {
    // Reset form inputs
    document.getElementById('searchInput').value = '';
    document.getElementById('locationFilter').value = '';
    document.getElementById('conditionFilter').value = '';
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';

    // Reset category
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.remove('active');
        if (chip.dataset.category === 'all') {
            chip.classList.add('active');
        }
    });

    // Reset filters object
    currentFilters = {
        category: '',
        location: '',
        condition: '',
        minPrice: '',
        maxPrice: '',
        search: ''
    };

    loadListings();
}

// ============================================
// LISTING DETAIL
// ============================================

async function openListingDetail(listingId) {
    const modal = document.getElementById('listingDetailModal');

    try {
        CariComProsAPI.showLoading('Loading listing...');

        const result = await CariComProsAPI.getListing(listingId);

        CariComProsAPI.hideLoading();

        if (!result.success || !result.listing) {
            CariComProsAPI.showToast('Listing not found', 'error');
            return;
        }

        currentListing = result.listing;
        populateListingDetail(currentListing);
        modal.classList.add('active');

    } catch (error) {
        CariComProsAPI.hideLoading();
        console.error('Error loading listing:', error);
        CariComProsAPI.showToast('Error loading listing', 'error');
    }
}

function populateListingDetail(listing) {
    // Title
    document.getElementById('detailTitle').textContent = listing.Title;

    // Price with location-based currency
    const priceEl = document.getElementById('detailPrice');
    if (listing.Price === 0 || listing.Price === '0') {
        priceEl.textContent = 'FREE';
        priceEl.classList.add('free');
    } else {
        priceEl.textContent = CariComProsAPI.formatCurrency(listing.Price, listing.Location);
        priceEl.classList.remove('free');
    }

    // Meta
    document.getElementById('detailCondition').textContent = listing.Condition || 'Good';
    document.getElementById('detailLocation').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${listing.Location || 'Caribbean'}`;
    document.getElementById('detailViews').innerHTML = `<i class="fas fa-eye"></i> ${listing.Views || 0} views`;

    // Description
    document.getElementById('detailDescription').textContent = listing.Description || 'No description provided.';

    // Gallery
    setupGallery(listing.Images || []);

    // Seller info
    const sellerName = listing.SellerName || 'Seller';
    const initials = CariComProsAPI.getInitials(sellerName);
    document.getElementById('sellerAvatar').textContent = initials;

    // Add verified badge to seller name if verified
    const sellerNameEl = document.getElementById('sellerName');
    if (isSellerVerified(listing)) {
        sellerNameEl.innerHTML = `${escapeHTML(sellerName)} <span class="verified-badge"><i class="fas fa-shield-alt"></i> Verified</span>`;
    } else {
        sellerNameEl.textContent = sellerName;
    }

    const createdAt = listing.CreatedAt ? CariComProsAPI.formatRelativeTime(listing.CreatedAt) : '';
    document.getElementById('sellerMeta').textContent = `Listed ${createdAt}`;
}

function setupGallery(images) {
    const mainGallery = document.getElementById('galleryMain');
    const thumbsContainer = document.getElementById('galleryThumbs');

    if (!images || images.length === 0) {
        mainGallery.innerHTML = '<div class="no-image"><i class="fas fa-image"></i></div>';
        thumbsContainer.innerHTML = '';
        return;
    }

    // Main image
    mainGallery.innerHTML = `<img src="${images[0]}" alt="Listing image">`;

    // Thumbnails
    if (images.length > 1) {
        thumbsContainer.innerHTML = images.map((img, i) => `
            <div class="gallery-thumb ${i === 0 ? 'active' : ''}" onclick="switchGalleryImage(${i})">
                <img src="${img}" alt="Thumbnail ${i + 1}">
            </div>
        `).join('');
    } else {
        thumbsContainer.innerHTML = '';
    }
}

function switchGalleryImage(index) {
    if (!currentListing || !currentListing.Images) return;

    const images = currentListing.Images;
    if (index < 0 || index >= images.length) return;

    // Update main image
    document.getElementById('galleryMain').innerHTML = `<img src="${images[index]}" alt="Listing image">`;

    // Update active thumb
    document.querySelectorAll('.gallery-thumb').forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
}

// ============================================
// CREATE LISTING
// ============================================

function openCreateListingModal() {
    // Check if logged in
    if (!CariComProsAPI.isLoggedIn()) {
        document.getElementById('loginRequiredModal').classList.add('active');
        return;
    }

    // Check verification status
    const user = CariComProsAPI.getUserData();
    const verificationStatus = user?.verificationStatus || localStorage.getItem('ccp_verification_status');

    if (verificationStatus === 'pending') {
        // Show pending verification modal
        document.getElementById('verificationPendingModal').classList.add('active');
        return;
    }

    if (verificationStatus !== 'verified') {
        // Show verification required modal
        document.getElementById('verificationRequiredModal').classList.add('active');
        return;
    }

    // Reset form
    document.getElementById('createListingForm').reset();
    uploadedImages = [];
    document.getElementById('imagePreviews').innerHTML = '';

    // Pre-fill location if user has one
    if (user && user.location) {
        const locationSelect = document.querySelector('#createListingForm select[name="location"]');
        const options = locationSelect.options;
        for (let i = 0; i < options.length; i++) {
            if (options[i].value && user.location.includes(options[i].value)) {
                locationSelect.value = options[i].value;
                break;
            }
        }
    }

    document.getElementById('createListingModal').classList.add('active');
}

async function handleImageUpload(event) {
    const files = event.target.files;
    const previewsContainer = document.getElementById('imagePreviews');

    if (uploadedImages.length + files.length > 5) {
        CariComProsAPI.showToast('Maximum 5 images allowed', 'warning');
        return;
    }

    for (const file of files) {
        if (uploadedImages.length >= 5) break;

        try {
            // Compress image
            const compressed = await CariComProsAPI.compressImage(file, 800, 0.7);
            uploadedImages.push(compressed);

            // Add preview
            const preview = document.createElement('div');
            preview.className = 'image-preview';
            preview.innerHTML = `
                <img src="${compressed}" alt="Preview">
                <button type="button" class="remove-image" onclick="removeImage(${uploadedImages.length - 1})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            previewsContainer.appendChild(preview);

        } catch (error) {
            console.error('Error processing image:', error);
            CariComProsAPI.showToast('Error processing image', 'error');
        }
    }

    // Clear file input
    event.target.value = '';
}

function removeImage(index) {
    uploadedImages.splice(index, 1);
    renderImagePreviews();
}

function renderImagePreviews() {
    const container = document.getElementById('imagePreviews');
    container.innerHTML = '';

    uploadedImages.forEach((img, i) => {
        const preview = document.createElement('div');
        preview.className = 'image-preview';
        preview.innerHTML = `
            <img src="${img}" alt="Preview">
            <button type="button" class="remove-image" onclick="removeImage(${i})">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(preview);
    });
}

async function submitListing(event) {
    event.preventDefault();

    if (!CariComProsAPI.isLoggedIn()) {
        CariComProsAPI.showToast('Please log in to create a listing', 'warning');
        return;
    }

    const form = event.target;
    const formData = new FormData(form);

    const listingData = {
        title: formData.get('title'),
        description: formData.get('description'),
        price: parseFloat(formData.get('price')) || 0,
        category: formData.get('category'),
        condition: formData.get('condition'),
        location: formData.get('location'),
        images: uploadedImages
    };

    try {
        CariComProsAPI.showLoading('Creating listing...');

        const result = await CariComProsAPI.createListing(listingData);

        CariComProsAPI.hideLoading();

        if (result.success) {
            CariComProsAPI.showToast('Listing created successfully!', 'success');
            closeModal('createListingModal');

            // Reset form
            form.reset();
            uploadedImages = [];
            document.getElementById('imagePreviews').innerHTML = '';

            // Reload listings
            loadListings();
        } else {
            CariComProsAPI.showToast(result.error || 'Failed to create listing', 'error');
        }

    } catch (error) {
        CariComProsAPI.hideLoading();
        console.error('Error creating listing:', error);
        CariComProsAPI.showToast('Error creating listing', 'error');
    }
}

// ============================================
// CONTACT SELLER
// ============================================

function contactSeller() {
    if (!CariComProsAPI.isLoggedIn()) {
        closeModal('listingDetailModal');
        document.getElementById('loginRequiredModal').classList.add('active');
        return;
    }

    if (!currentListing) return;

    // Check if user is the seller
    const user = CariComProsAPI.getUserData();
    if (user.id === currentListing.SellerID) {
        CariComProsAPI.showToast('This is your own listing', 'info');
        return;
    }

    // Prompt for message
    const message = prompt(`Send a message to ${currentListing.SellerName || 'the seller'} about "${currentListing.Title}":`);

    if (message && message.trim()) {
        sendMessageToSeller(message.trim());
    }
}

async function sendMessageToSeller(message) {
    if (!currentListing) return;

    try {
        CariComProsAPI.showLoading('Sending message...');

        const result = await CariComProsAPI.sendListingMessage(currentListing.ListingID, message);

        CariComProsAPI.hideLoading();

        if (result.success) {
            CariComProsAPI.showToast('Message sent successfully!', 'success');
            closeModal('listingDetailModal');
        } else {
            CariComProsAPI.showToast(result.error || 'Failed to send message', 'error');
        }

    } catch (error) {
        CariComProsAPI.hideLoading();
        console.error('Error sending message:', error);
        CariComProsAPI.showToast('Error sending message', 'error');
    }
}

// ============================================
// UTILITIES
// ============================================

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function handleAuthClick() {
    if (CariComProsAPI.isLoggedIn()) {
        const userType = CariComProsAPI.getUserType();
        window.location.href = userType === 'contractor' ? 'contractors.html' : 'customers.html';
    } else {
        window.location.href = 'index.html#login';
    }
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileMenuOverlay');

    if (menu && overlay) {
        menu.classList.add('active');
        overlay.classList.add('active');
        document.body.classList.add('menu-open');
        updateMobileAccountNav();
    }
}

function closeMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('mobileMenuOverlay');

    if (menu && overlay) {
        menu.classList.remove('active');
        overlay.classList.remove('active');
        document.body.classList.remove('menu-open');
    }
}

function selectCategoryAndClose(category) {
    closeMobileMenu();

    // Update filter
    currentFilters.category = category;

    // Update category chips
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.remove('active');
        if (chip.dataset.category === category) {
            chip.classList.add('active');
        }
    });

    // Reload listings
    loadListings();

    // Scroll to listings
    document.getElementById('listingsGrid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateMobileAccountNav() {
    const accountNav = document.getElementById('mobileAccountNav');
    if (!accountNav) return;

    if (CariComProsAPI.isLoggedIn()) {
        const user = CariComProsAPI.getUserData();
        const userType = CariComProsAPI.getUserType();
        const dashboardUrl = userType === 'contractor' ? 'contractors.html' : 'customers.html';

        accountNav.innerHTML = `
            <li><a href="${dashboardUrl}"><i class="fas fa-user"></i> My Dashboard</a></li>
            <li><a href="${dashboardUrl}#my-listings"><i class="fas fa-tags"></i> My Listings</a></li>
            <li><a href="#" onclick="CariComProsAPI.logout(); return false;"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
        `;
    } else {
        accountNav.innerHTML = `
            <li><a href="index.html#login" onclick="closeMobileMenu()"><i class="fas fa-sign-in-alt"></i> Sign In</a></li>
            <li><a href="index.html#signup" onclick="closeMobileMenu()"><i class="fas fa-user-plus"></i> Sign Up</a></li>
        `;
    }
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================
// SOCIAL MEDIA SHARING
// ============================================

function getListingShareUrl() {
    if (!currentListing) return window.location.href;
    return `${window.location.origin}/marketplace.html?listing=${currentListing.ListingID}`;
}

function getShareText() {
    if (!currentListing) return 'Check out this listing on Hidden Kingz Marketplace!';
    const price = parseFloat(currentListing.Price) === 0
        ? 'FREE'
        : CariComProsAPI.formatCurrency(currentListing.Price, currentListing.Location);
    return `${currentListing.Title} - ${price} on Hidden Kingz Marketplace!`;
}

function shareListing(platform) {
    if (!currentListing) {
        CariComProsAPI.showToast('No listing to share', 'error');
        return;
    }

    const url = encodeURIComponent(getListingShareUrl());
    const text = encodeURIComponent(getShareText());
    const title = encodeURIComponent(currentListing.Title);

    let shareUrl = '';

    switch (platform) {
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
            break;
        case 'whatsapp':
            shareUrl = `https://api.whatsapp.com/send?text=${text}%20${url}`;
            break;
        case 'telegram':
            shareUrl = `https://t.me/share/url?url=${url}&text=${text}`;
            break;
        case 'linkedin':
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
            break;
        default:
            return;
    }

    // Open share window
    window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes');

    // Track share (optional analytics)
    console.log(`Listing shared on ${platform}:`, currentListing.ListingID);
}

function copyListingLink() {
    if (!currentListing) {
        CariComProsAPI.showToast('No listing to share', 'error');
        return;
    }

    const url = getListingShareUrl();
    const btn = document.getElementById('copyLinkBtn');

    // Use modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            showCopySuccess(btn);
        }).catch(() => {
            fallbackCopyToClipboard(url, btn);
        });
    } else {
        fallbackCopyToClipboard(url, btn);
    }
}

function fallbackCopyToClipboard(text, btn) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        document.execCommand('copy');
        showCopySuccess(btn);
    } catch (err) {
        CariComProsAPI.showToast('Failed to copy link', 'error');
    }

    document.body.removeChild(textarea);
}

function showCopySuccess(btn) {
    CariComProsAPI.showToast('Link copied to clipboard!', 'success');

    if (btn) {
        btn.classList.add('copied');
        btn.innerHTML = '<i class="fas fa-check"></i>';

        setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = '<i class="fas fa-link"></i>';
        }, 2000);
    }
}

// Close modals and mobile menu with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Close modals
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
        });
        // Close mobile menu
        closeMobileMenu();
    }
});

// Make mobile menu functions globally available
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.selectCategoryAndClose = selectCategoryAndClose;
window.updateMobileAccountNav = updateMobileAccountNav;

// Close modals when clicking outside
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// ============================================
// ID VERIFICATION FUNCTIONS
// ============================================

function openVerificationModal() {
    // Reset verification state
    selectedIdTypeValue = '';
    uploadedIdImage = null;
    currentVerificationStep = 1;

    // Reset form
    const form = document.getElementById('verificationForm');
    if (form) form.reset();

    // Reset ID type selection
    document.querySelectorAll('.id-type-option').forEach(opt => opt.classList.remove('selected'));
    document.getElementById('selectedIdType').value = '';
    document.getElementById('step1NextBtn').disabled = true;

    // Reset upload section
    const uploadSection = document.getElementById('idUploadSection');
    if (uploadSection) {
        uploadSection.classList.remove('has-file');
        document.getElementById('uploadIcon').className = 'fas fa-cloud-upload-alt';
        document.getElementById('uploadText').textContent = 'Click or tap to upload';
        document.getElementById('uploadSubtext').style.display = 'block';
        document.getElementById('idPreview').style.display = 'none';
        document.getElementById('idPreview').innerHTML = '';
    }
    document.getElementById('step2NextBtn').disabled = true;

    // Show step 1
    goToStep(1);

    // Open modal
    document.getElementById('verificationModal').classList.add('active');
}

function selectIdType(element) {
    // Remove selection from all options
    document.querySelectorAll('.id-type-option').forEach(opt => opt.classList.remove('selected'));

    // Select clicked option
    element.classList.add('selected');

    // Store value
    selectedIdTypeValue = element.dataset.type;
    document.getElementById('selectedIdType').value = selectedIdTypeValue;

    // Update ID type name for step 2
    const typeNames = {
        'drivers-license': "Driver's License",
        'national-id': 'National ID',
        'passport': 'Passport',
        'other': 'Government ID'
    };
    document.getElementById('selectedIdTypeName').textContent = typeNames[selectedIdTypeValue] || 'ID';

    // Enable next button
    document.getElementById('step1NextBtn').disabled = false;
}

function goToStep(step) {
    currentVerificationStep = step;

    // Hide all steps
    document.getElementById('verificationStep1').style.display = 'none';
    document.getElementById('verificationStep2').style.display = 'none';
    document.getElementById('verificationStep3').style.display = 'none';

    // Show current step
    document.getElementById(`verificationStep${step}`).style.display = 'block';

    // Update progress indicators
    for (let i = 1; i <= 3; i++) {
        const stepEl = document.getElementById(`step${i}`);
        stepEl.classList.remove('active', 'completed');

        if (i < step) {
            stepEl.classList.add('completed');
        } else if (i === step) {
            stepEl.classList.add('active');
        }
    }

    // Pre-fill name from user data if on step 3
    if (step === 3) {
        const user = CariComProsAPI.getUserData();
        if (user && user.name) {
            const nameInput = document.getElementById('verifyFullName');
            if (nameInput && !nameInput.value) {
                nameInput.value = user.name;
            }
        }
    }
}

async function handleIdUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        CariComProsAPI.showToast('Please upload an image file', 'error');
        return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        CariComProsAPI.showToast('Image must be less than 10MB', 'error');
        return;
    }

    try {
        // Compress image
        uploadedIdImage = await CariComProsAPI.compressImage(file, 1200, 0.8);

        // Update UI
        const uploadSection = document.getElementById('idUploadSection');
        uploadSection.classList.add('has-file');

        document.getElementById('uploadIcon').className = 'fas fa-check-circle';
        document.getElementById('uploadText').textContent = 'ID uploaded successfully';
        document.getElementById('uploadSubtext').style.display = 'none';

        // Show preview
        const preview = document.getElementById('idPreview');
        preview.innerHTML = `<img src="${uploadedIdImage}" alt="ID Preview">`;
        preview.style.display = 'block';

        // Enable next button
        document.getElementById('step2NextBtn').disabled = false;

    } catch (error) {
        console.error('Error processing ID image:', error);
        CariComProsAPI.showToast('Error processing image', 'error');
    }

    // Clear file input
    event.target.value = '';
}

async function submitVerification(event) {
    event.preventDefault();

    if (!CariComProsAPI.isLoggedIn()) {
        CariComProsAPI.showToast('Please log in first', 'warning');
        return;
    }

    if (!uploadedIdImage) {
        CariComProsAPI.showToast('Please upload your ID', 'error');
        goToStep(2);
        return;
    }

    // Get form data
    const verificationData = {
        idType: selectedIdTypeValue,
        idImage: uploadedIdImage,
        fullName: document.getElementById('verifyFullName').value,
        idNumber: document.getElementById('verifyIdNumber').value,
        expiryDate: document.getElementById('verifyExpiry').value,
        country: document.getElementById('verifyCountry').value,
        submittedAt: new Date().toISOString()
    };

    try {
        CariComProsAPI.showLoading('Submitting verification...');

        // Try to submit to API (if endpoint exists)
        let result;
        if (typeof CariComProsAPI.submitVerification === 'function') {
            result = await CariComProsAPI.submitVerification(verificationData);
        } else {
            // Fallback: Store locally and mark as pending
            result = { success: true };
        }

        // Store verification status locally
        localStorage.setItem('ccp_verification_status', 'pending');
        localStorage.setItem('ccp_verification_data', JSON.stringify({
            submittedAt: verificationData.submittedAt,
            idType: verificationData.idType,
            fullName: verificationData.fullName
        }));

        // Update user data if available
        const user = CariComProsAPI.getUserData();
        if (user) {
            user.verificationStatus = 'pending';
            localStorage.setItem('ccp_user', JSON.stringify(user));
        }

        CariComProsAPI.hideLoading();

        if (result.success) {
            CariComProsAPI.showToast('Verification submitted successfully!', 'success');
            closeModal('verificationModal');

            // Show pending modal
            document.getElementById('verificationPendingModal').classList.add('active');
        } else {
            CariComProsAPI.showToast(result.error || 'Verification submission failed', 'error');
        }

    } catch (error) {
        CariComProsAPI.hideLoading();
        console.error('Error submitting verification:', error);
        CariComProsAPI.showToast('Error submitting verification', 'error');
    }
}

// Get verification status
function getVerificationStatus() {
    const user = CariComProsAPI.getUserData();
    return user?.verificationStatus || localStorage.getItem('ccp_verification_status') || 'unverified';
}

// Check if seller is verified
function isSellerVerified(listing) {
    return listing?.SellerVerified === true || listing?.SellerVerified === 'true';
}

// Make verification functions globally available
window.openVerificationModal = openVerificationModal;
window.selectIdType = selectIdType;
window.goToStep = goToStep;
window.handleIdUpload = handleIdUpload;
window.submitVerification = submitVerification;
window.getVerificationStatus = getVerificationStatus;
