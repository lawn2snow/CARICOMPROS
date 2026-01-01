/**
 * Hidden Kingz Payment Service
 * Square Integration for payments + Multiple payout options for contractors
 */

const CariComProsPayments = {
    // Square Configuration (Production)
    square: {
        applicationId: 'sq0idp-xIW9dHKUC0at-qe7k9yjiw',
        locationId: '', // Will be set after fetching from Square
        environment: 'production', // 'sandbox' for testing, 'production' for live
        apiVersion: '2024-01-17'
    },

    // Platform fee percentage
    platformFeePercent: 10,

    // Payment instance
    payments: null,
    card: null,

    /**
     * Initialize Square Payments
     */
    async initialize() {
        try {
            if (!window.Square) {
                console.error('Square SDK not loaded');
                return false;
            }

            this.payments = window.Square.payments(
                this.square.applicationId,
                this.square.locationId
            );

            console.log('Square Payments initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize Square:', error);
            return false;
        }
    },

    /**
     * Create card payment form
     * @param {string} containerId - DOM element ID to mount card form
     */
    async createCardForm(containerId) {
        try {
            if (!this.payments) {
                await this.initialize();
            }

            this.card = await this.payments.card();
            await this.card.attach(`#${containerId}`);

            console.log('Card form attached');
            return this.card;
        } catch (error) {
            console.error('Failed to create card form:', error);
            throw error;
        }
    },

    /**
     * Process payment through Square
     * @param {Object} paymentData - Payment details
     */
    async processPayment(paymentData) {
        const { amount, currency = 'USD', jobId, customerId, contractorId, description } = paymentData;

        try {
            CariComProsAPI.showLoading('Processing payment...');

            // Tokenize the card
            const tokenResult = await this.card.tokenize();

            if (tokenResult.status !== 'OK') {
                throw new Error(tokenResult.errors?.[0]?.message || 'Card tokenization failed');
            }

            // Send to backend for processing
            const result = await CariComProsAPI.request('processPayment', 'POST', {
                sourceId: tokenResult.token,
                amount: Math.round(amount * 100), // Convert to cents
                currency: currency,
                jobId: jobId,
                customerId: customerId,
                contractorId: contractorId,
                description: description || `Payment for Job #${jobId}`,
                platformFee: Math.round(amount * (this.platformFeePercent / 100) * 100)
            });

            CariComProsAPI.hideLoading();

            if (result.success) {
                CariComProsAPI.showToast('Payment successful!', 'success');
                return result;
            } else {
                throw new Error(result.error || 'Payment failed');
            }
        } catch (error) {
            CariComProsAPI.hideLoading();
            CariComProsAPI.showToast(error.message || 'Payment failed', 'error');
            throw error;
        }
    },

    /**
     * Calculate payment breakdown
     * @param {number} amount - Total amount
     */
    calculateBreakdown(amount) {
        const platformFee = amount * (this.platformFeePercent / 100);
        const contractorPayout = amount - platformFee;

        return {
            total: amount,
            platformFee: platformFee,
            contractorPayout: contractorPayout,
            platformFeePercent: this.platformFeePercent
        };
    },

    /**
     * Format currency
     * @param {number} amount - Amount to format
     * @param {string} currency - Currency code
     */
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    // HK Coins configuration (1 HK Coin = $1 USD)
    hkCoins: {
        name: 'HK Coins',
        symbol: 'HKC',
        icon: 'fas fa-coins',
        color: '#ffd700',
        rate: 1.0, // 1 HK Coin = $1 USD
        packages: [
            { coins: 50, price: 50, bonus: 0, label: 'Starter' },
            { coins: 100, price: 95, bonus: 5, label: 'Basic', popular: false },
            { coins: 250, price: 225, bonus: 25, label: 'Value', popular: true },
            { coins: 500, price: 425, bonus: 75, label: 'Pro', popular: false },
            { coins: 1000, price: 800, bonus: 200, label: 'Premium', popular: false }
        ]
    },

    // User's coin balance (loaded from backend)
    userCoinBalance: 0,

    // Selected payment method
    selectedPaymentMethod: 'card',

    /**
     * Get user's HK Coin balance
     */
    async getCoinBalance() {
        try {
            const result = await CariComProsAPI.request('getCoinBalance', 'GET', {
                customerId: CariComProsAPI.getUserId()
            });
            this.userCoinBalance = result.balance || 0;
            return this.userCoinBalance;
        } catch (error) {
            console.error('Failed to get coin balance:', error);
            return 0;
        }
    },

    /**
     * Open Buy HK Coins modal
     */
    openBuyCoinsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'buyCoinsModal';
        modal.innerHTML = `
            <div class="modal-content" style="background: white; border-radius: 15px; max-width: 600px; width: 90%; margin: auto; position: relative; top: 50%; transform: translateY(-50%); max-height: 90vh; overflow-y: auto;">
                <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 25px; text-align: center; border-radius: 15px 15px 0 0;">
                    <div style="font-size: 3rem; margin-bottom: 10px;"><i class="fas fa-coins" style="color: #ffd700;"></i></div>
                    <h2 style="margin: 0; color: #ffd700;">Buy HK Coins</h2>
                    <p style="margin: 10px 0 0; opacity: 0.9;">Platform credits for paying services</p>
                    <div style="margin-top: 15px; padding: 10px; background: rgba(255,215,0,0.2); border-radius: 10px;">
                        <span style="font-size: 0.9rem;">Your Balance: </span>
                        <strong style="font-size: 1.25rem; color: #ffd700;">${this.userCoinBalance} HKC</strong>
                    </div>
                </div>

                <div style="padding: 25px;">
                    <div style="background: #e3f2fd; padding: 15px; border-radius: 10px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-info-circle" style="color: #1976d2;"></i>
                        <span style="font-size: 0.9rem; color: #1565c0;">
                            <strong>No credit card?</strong> Buy HK Coins with any payment method and use them to pay for services!
                        </span>
                    </div>

                    <h4 style="margin: 0 0 15px; color: #1a1a2e;">Select a Package</h4>

                    <div class="coin-packages" style="display: grid; gap: 12px;">
                        ${this.hkCoins.packages.map((pkg, index) => `
                            <div class="coin-package ${pkg.popular ? 'popular' : ''}" data-index="${index}" onclick="CariComProsPayments.selectCoinPackage(${index})" style="padding: 15px 20px; border: 2px solid ${pkg.popular ? '#ffd700' : '#e9ecef'}; border-radius: 12px; cursor: pointer; transition: all 0.3s; display: flex; justify-content: space-between; align-items: center; background: ${pkg.popular ? 'rgba(255,215,0,0.05)' : 'white'}; position: relative;">
                                ${pkg.popular ? '<span style="position: absolute; top: -10px; right: 15px; background: #ffd700; color: #1a1a2e; padding: 2px 10px; border-radius: 10px; font-size: 0.7rem; font-weight: bold;">BEST VALUE</span>' : ''}
                                <div style="display: flex; align-items: center; gap: 15px;">
                                    <div style="width: 50px; height: 50px; background: linear-gradient(45deg, #ffd700, #ffed4e); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                        <i class="fas fa-coins" style="color: #1a1a2e; font-size: 1.25rem;"></i>
                                    </div>
                                    <div>
                                        <div style="font-weight: bold; color: #1a1a2e; font-size: 1.1rem;">${pkg.coins} HKC</div>
                                        <div style="font-size: 0.85rem; color: #666;">${pkg.label}${pkg.bonus > 0 ? ` <span style="color: #27ae60;">+${pkg.bonus} bonus!</span>` : ''}</div>
                                    </div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 1.25rem; font-weight: bold; color: #1a1a2e;">$${pkg.price}</div>
                                    ${pkg.bonus > 0 ? `<div style="font-size: 0.75rem; color: #27ae60;">Save $${pkg.coins - pkg.price + pkg.bonus}</div>` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 10px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: #666;">Selected Package</span>
                            <span id="selected-package-name" style="font-weight: 600; color: #1a1a2e;">-</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid #e9ecef;">
                            <span style="font-weight: 600; color: #1a1a2e;">Total</span>
                            <span id="selected-package-price" style="font-weight: bold; font-size: 1.25rem; color: #27ae60;">$0.00</span>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button class="btn btn-outline" onclick="document.getElementById('buyCoinsModal').remove();" style="flex: 1; padding: 15px; border: 2px solid #ddd; background: white; border-radius: 10px; cursor: pointer;">
                            Cancel
                        </button>
                        <button class="btn btn-primary" id="buy-coins-btn" disabled onclick="CariComProsPayments.proceedToCoinPurchase()" style="flex: 2; background: linear-gradient(45deg, #ffd700, #ffed4e); color: #1a1a2e; border: none; padding: 15px; border-radius: 10px; font-weight: bold; cursor: pointer; opacity: 0.5;">
                            <i class="fas fa-shopping-cart"></i> Buy Now
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add styles for selection
        const style = document.createElement('style');
        style.id = 'coin-package-styles';
        style.textContent = `
            .coin-package:hover {
                border-color: #ffd700 !important;
                background: rgba(255,215,0,0.05) !important;
            }
            .coin-package.selected {
                border-color: #ffd700 !important;
                background: rgba(255,215,0,0.1) !important;
                box-shadow: 0 0 0 3px rgba(255,215,0,0.2);
            }
        `;
        document.head.appendChild(style);
    },

    selectedCoinPackageIndex: -1,

    /**
     * Select a coin package
     */
    selectCoinPackage(index) {
        this.selectedCoinPackageIndex = index;
        const pkg = this.hkCoins.packages[index];

        // Update UI
        document.querySelectorAll('.coin-package').forEach((el, i) => {
            el.classList.toggle('selected', i === index);
        });

        document.getElementById('selected-package-name').textContent = `${pkg.coins} HKC ${pkg.bonus > 0 ? `(+${pkg.bonus} bonus)` : ''}`;
        document.getElementById('selected-package-price').textContent = `$${pkg.price.toFixed(2)}`;

        const buyBtn = document.getElementById('buy-coins-btn');
        buyBtn.disabled = false;
        buyBtn.style.opacity = '1';
    },

    /**
     * Proceed to coin purchase payment
     */
    async proceedToCoinPurchase() {
        if (this.selectedCoinPackageIndex < 0) return;

        const pkg = this.hkCoins.packages[this.selectedCoinPackageIndex];

        // Close the buy coins modal
        document.getElementById('buyCoinsModal')?.remove();

        // Open payment modal for coin purchase
        this.openCoinPurchasePaymentModal(pkg);
    },

    /**
     * Open payment modal specifically for buying coins
     */
    openCoinPurchasePaymentModal(pkg) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'coinPurchaseModal';
        modal.innerHTML = `
            <div class="modal-content" style="background: white; border-radius: 15px; max-width: 500px; width: 90%; margin: auto; position: relative; top: 50%; transform: translateY(-50%); max-height: 90vh; overflow-y: auto;">
                <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 25px; text-align: center; border-radius: 15px 15px 0 0;">
                    <h2 style="margin: 0; color: #ffd700;">Complete Purchase</h2>
                    <p style="margin: 10px 0 0; opacity: 0.9;">${pkg.coins} HK Coins${pkg.bonus > 0 ? ` + ${pkg.bonus} Bonus` : ''}</p>
                </div>

                <div style="padding: 25px;">
                    <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: center;">
                        <div style="font-size: 3rem; color: #ffd700; margin-bottom: 10px;"><i class="fas fa-coins"></i></div>
                        <div style="font-size: 2rem; font-weight: bold; color: #1a1a2e;">${pkg.coins + pkg.bonus} HKC</div>
                        <div style="color: #666; font-size: 0.9rem;">Will be added to your balance</div>
                    </div>

                    <h4 style="margin: 0 0 15px; color: #1a1a2e;">Payment Details</h4>
                    <div id="coin-card-container" style="min-height: 100px; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px;"></div>
                    <div id="coin-card-errors" style="color: #e74c3c; font-size: 0.9em; margin-bottom: 15px; display: none;"></div>

                    <div style="display: flex; align-items: center; color: #666; font-size: 0.85em; margin-bottom: 20px;">
                        <i class="fas fa-lock" style="margin-right: 8px; color: #27ae60;"></i>
                        <span>Secured by Square. Your payment information is encrypted.</span>
                    </div>

                    <div style="display: flex; justify-content: space-between; padding: 15px; background: #e8f5e9; border-radius: 10px; margin-bottom: 20px;">
                        <span style="font-weight: 600; color: #1a1a2e;">Total</span>
                        <span style="font-weight: bold; font-size: 1.5rem; color: #27ae60;">$${pkg.price.toFixed(2)}</span>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-outline" onclick="document.getElementById('coinPurchaseModal').remove();" style="flex: 1; padding: 15px; border: 2px solid #ddd; background: white; border-radius: 10px; cursor: pointer;">
                            Cancel
                        </button>
                        <button class="btn btn-primary" id="confirm-coin-purchase-btn" onclick="CariComProsPayments.completeCoinPurchase(${pkg.coins}, ${pkg.bonus}, ${pkg.price})" style="flex: 2; background: linear-gradient(45deg, #ffd700, #ffed4e); color: #1a1a2e; border: none; padding: 15px; border-radius: 10px; font-weight: bold; cursor: pointer;">
                            <i class="fas fa-credit-card"></i> Pay $${pkg.price.toFixed(2)}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Initialize card form
        setTimeout(async () => {
            try {
                if (!this.payments) {
                    await this.initialize();
                }
                this.coinCard = await this.payments.card();
                await this.coinCard.attach('#coin-card-container');
            } catch (error) {
                console.error('Failed to create card form:', error);
            }
        }, 100);
    },

    coinCard: null,

    /**
     * Complete coin purchase
     */
    async completeCoinPurchase(coins, bonus, price) {
        const btn = document.getElementById('confirm-coin-purchase-btn');
        const errorDiv = document.getElementById('coin-card-errors');

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            // Tokenize the card
            const tokenResult = await this.coinCard.tokenize();
            if (tokenResult.status !== 'OK') {
                throw new Error(tokenResult.errors?.[0]?.message || 'Card tokenization failed');
            }

            CariComProsAPI.showLoading('Processing payment...');

            // Process the payment
            const result = await CariComProsAPI.request('purchaseCoins', 'POST', {
                sourceId: tokenResult.token,
                amount: Math.round(price * 100), // Convert to cents
                coins: coins,
                bonus: bonus,
                customerId: CariComProsAPI.getUserId()
            });

            CariComProsAPI.hideLoading();

            if (result.success) {
                this.userCoinBalance = result.newBalance || (this.userCoinBalance + coins + bonus);
                document.getElementById('coinPurchaseModal')?.remove();
                this.showCoinPurchaseSuccess(coins + bonus);
            } else {
                throw new Error(result.error || 'Purchase failed');
            }
        } catch (error) {
            CariComProsAPI.hideLoading();
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            btn.disabled = false;
            btn.innerHTML = `<i class="fas fa-credit-card"></i> Pay $${price.toFixed(2)}`;
        }
    },

    /**
     * Show coin purchase success modal
     */
    showCoinPurchaseSuccess(totalCoins) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'coinSuccessModal';
        modal.innerHTML = `
            <div class="modal-content" style="background: white; border-radius: 15px; max-width: 400px; width: 90%; margin: auto; position: relative; top: 50%; transform: translateY(-50%); text-align: center; padding: 40px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(45deg, #ffd700, #ffed4e); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <i class="fas fa-check" style="font-size: 40px; color: #1a1a2e;"></i>
                </div>
                <h2 style="color: #1a1a2e; margin: 0 0 10px;">Coins Added!</h2>
                <p style="color: #666; margin: 0 0 20px;">Your HK Coins have been added to your account.</p>
                <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                    <div style="font-size: 0.9em; color: #888;">Your New Balance</div>
                    <div style="font-weight: bold; color: #ffd700; font-size: 2rem;">${this.userCoinBalance} HKC</div>
                </div>
                <button class="btn btn-primary" onclick="document.getElementById('coinSuccessModal').remove(); location.reload();" style="width: 100%; background: linear-gradient(45deg, #ffd700, #ffed4e); color: #1a1a2e; border: none; padding: 15px; border-radius: 10px; font-weight: bold; cursor: pointer;">
                    Done
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    },

    /**
     * Pay for a job using HK Coins
     */
    async payWithCoins(jobId, contractorId, amount) {
        if (this.userCoinBalance < amount) {
            CariComProsAPI.showToast('Insufficient coin balance. Please buy more coins.', 'error');
            this.openBuyCoinsModal();
            return;
        }

        const confirmed = await CariComProsAPI.confirm(
            `Pay ${amount} HK Coins for this service?\n\nYour balance: ${this.userCoinBalance} HKC\nAfter payment: ${this.userCoinBalance - amount} HKC`
        );

        if (!confirmed) return;

        CariComProsAPI.showLoading('Processing payment...');

        try {
            const result = await CariComProsAPI.request('payWithCoins', 'POST', {
                jobId: jobId,
                contractorId: contractorId,
                amount: amount,
                customerId: CariComProsAPI.getUserId()
            });

            CariComProsAPI.hideLoading();

            if (result.success) {
                this.userCoinBalance = result.newBalance || (this.userCoinBalance - amount);
                this.closePaymentModal();
                this.showPaymentSuccess({ transactionId: result.transactionId || 'COIN-' + Date.now() });
            } else {
                throw new Error(result.error || 'Payment failed');
            }
        } catch (error) {
            CariComProsAPI.hideLoading();
            CariComProsAPI.showToast(error.message || 'Payment failed', 'error');
        }
    },

    /**
     * Create payment modal for customer
     * @param {Object} jobData - Job details
     * @param {Object} quoteData - Accepted quote details
     */
    createPaymentModal(jobData, quoteData) {
        const breakdown = this.calculateBreakdown(quoteData.amount);
        this.selectedPaymentMethod = 'card';
        const canPayWithCoins = this.userCoinBalance >= breakdown.total;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'paymentModal';
        modal.innerHTML = `
            <div class="modal-content payment-modal" style="background: white; border-radius: 15px; max-width: 550px; width: 90%; margin: auto; position: relative; top: 50%; transform: translateY(-50%); max-height: 90vh; overflow-y: auto;">
                <div class="payment-header" style="background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 25px; text-align: center; border-radius: 15px 15px 0 0;">
                    <h2 style="margin: 0; color: #ffd700;">Complete Payment</h2>
                    <p style="margin: 10px 0 0; opacity: 0.9;">${jobData.title}</p>
                </div>

                <div style="padding: 25px;">
                    <!-- Payment Summary -->
                    <div class="payment-summary" style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                        <h4 style="margin: 0 0 15px; color: #1a1a2e;">Payment Summary</h4>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>Service Amount</span>
                            <span>${this.formatCurrency(breakdown.total)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #1a1a2e; font-weight: bold; font-size: 1.2em;">
                            <span>Total</span>
                            <span style="color: #27ae60;">${this.formatCurrency(breakdown.total)}</span>
                        </div>
                    </div>

                    <!-- Contractor Info -->
                    <div class="contractor-info" style="display: flex; align-items: center; padding: 15px; background: #e8f5e9; border-radius: 10px; margin-bottom: 20px;">
                        <div style="width: 50px; height: 50px; background: #27ae60; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; margin-right: 15px;">
                            ${quoteData.contractorName?.charAt(0) || 'C'}
                        </div>
                        <div>
                            <div style="font-weight: bold; color: #1a1a2e;">${quoteData.contractorName}</div>
                            <div style="color: #666; font-size: 0.9em;">Verified Contractor</div>
                        </div>
                    </div>

                    <!-- Payment Method Selection -->
                    <h4 style="margin: 0 0 15px; color: #1a1a2e;">Select Payment Method</h4>

                    <div class="payment-method-tabs" style="display: flex; gap: 10px; margin-bottom: 20px;">
                        <button id="tab-card" onclick="CariComProsPayments.selectPaymentMethod('card')" class="payment-tab active" style="flex: 1; padding: 12px; border: 2px solid #ffd700; background: #fffef0; border-radius: 10px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fas fa-credit-card"></i> Card
                        </button>
                        <button id="tab-coins" onclick="CariComProsPayments.selectPaymentMethod('coins')" class="payment-tab" style="flex: 1; padding: 12px; border: 2px solid #ddd; background: white; border-radius: 10px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fas fa-coins" style="color: #ffd700;"></i> HK Coins
                        </button>
                    </div>

                    <!-- Card Payment Section -->
                    <div id="card-payment-section">
                        <div id="card-container" style="min-height: 100px; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px;"></div>
                        <div id="card-errors" style="color: #e74c3c; font-size: 0.9em; margin-bottom: 15px; display: none;"></div>
                        <div style="display: flex; align-items: center; color: #666; font-size: 0.85em; margin-bottom: 20px;">
                            <i class="fas fa-lock" style="margin-right: 8px; color: #27ae60;"></i>
                            <span>Secured by Square. Your payment information is encrypted.</span>
                        </div>
                    </div>

                    <!-- HK Coins Payment Section -->
                    <div id="coins-payment-section" style="display: none;">
                        <div style="background: linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,237,78,0.1)); padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: center; border: 2px solid #ffd700;">
                            <div style="font-size: 2.5rem; color: #ffd700; margin-bottom: 10px;"><i class="fas fa-coins"></i></div>
                            <div style="font-size: 0.9rem; color: #666; margin-bottom: 5px;">Your Balance</div>
                            <div style="font-size: 2rem; font-weight: bold; color: #1a1a2e;">${this.userCoinBalance} HKC</div>
                            ${canPayWithCoins ?
                                `<div style="margin-top: 10px; color: #27ae60; font-size: 0.9rem;"><i class="fas fa-check-circle"></i> You have enough coins!</div>` :
                                `<div style="margin-top: 10px; color: #e74c3c; font-size: 0.9rem;"><i class="fas fa-times-circle"></i> You need ${breakdown.total - this.userCoinBalance} more coins</div>`
                            }
                        </div>

                        ${!canPayWithCoins ? `
                            <div style="background: #fff3e0; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <i class="fas fa-info-circle" style="color: #ff9800;"></i>
                                    <span style="font-size: 0.9rem; color: #e65100;">
                                        You don't have enough HK Coins. Buy more to pay with coins!
                                    </span>
                                </div>
                                <button onclick="CariComProsPayments.closePaymentModal(); CariComProsPayments.openBuyCoinsModal();" style="margin-top: 15px; width: 100%; padding: 12px; background: linear-gradient(45deg, #ffd700, #ffed4e); color: #1a1a2e; border: none; border-radius: 10px; font-weight: bold; cursor: pointer;">
                                    <i class="fas fa-shopping-cart"></i> Buy HK Coins
                                </button>
                            </div>
                        ` : `
                            <div style="background: #e8f5e9; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                                    <span style="color: #666;">Payment Amount</span>
                                    <span style="font-weight: 600; color: #1a1a2e;">${Math.ceil(breakdown.total)} HKC</span>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid #c8e6c9;">
                                    <span style="color: #666;">Remaining Balance</span>
                                    <span style="font-weight: 600; color: #27ae60;">${this.userCoinBalance - Math.ceil(breakdown.total)} HKC</span>
                                </div>
                            </div>
                        `}

                        <div style="background: #e3f2fd; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                            <div style="display: flex; align-items: flex-start; gap: 10px;">
                                <i class="fas fa-info-circle" style="color: #1976d2; margin-top: 3px;"></i>
                                <div style="font-size: 0.85rem; color: #1565c0;">
                                    <strong>About HK Coins:</strong>
                                    <p style="margin: 5px 0 0;">1 HK Coin = $1 USD. Buy coins to pay for services without a credit card!</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-outline" onclick="CariComProsPayments.closePaymentModal()" style="flex: 1; padding: 15px; border: 2px solid #ddd; background: white; border-radius: 10px; cursor: pointer;">
                            Cancel
                        </button>
                        <button class="btn btn-primary" id="pay-button" data-job-id="${jobData.jobId}" data-contractor-id="${quoteData.contractorId}" data-amount="${quoteData.amount}" onclick="CariComProsPayments.submitPayment('${jobData.jobId}', '${quoteData.contractorId}', ${quoteData.amount})" style="flex: 2; background: linear-gradient(45deg, #ffd700, #ffed4e); color: #1a1a2e; border: none; padding: 15px; border-radius: 10px; font-weight: bold; cursor: pointer;">
                            <i class="fas fa-credit-card"></i> Pay ${this.formatCurrency(breakdown.total)}
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add styles
        const style = document.createElement('style');
        style.id = 'payment-modal-styles';
        style.textContent = `
            .payment-tab.active {
                border-color: #ffd700 !important;
                background: #fffef0 !important;
            }
            .payment-tab:hover {
                border-color: #ffd700;
            }
        `;
        document.head.appendChild(style);

        // Initialize card form
        setTimeout(() => {
            this.createCardForm('card-container');
        }, 100);
    },

    /**
     * Select payment method (card or coins)
     */
    selectPaymentMethod(method) {
        this.selectedPaymentMethod = method;

        // Update tabs
        document.querySelectorAll('.payment-tab').forEach(tab => {
            tab.classList.remove('active');
            tab.style.borderColor = '#ddd';
            tab.style.background = 'white';
        });
        const activeTab = document.getElementById(`tab-${method}`);
        if (activeTab) {
            activeTab.classList.add('active');
            activeTab.style.borderColor = '#ffd700';
            activeTab.style.background = '#fffef0';
        }

        // Show/hide sections
        const cardSection = document.getElementById('card-payment-section');
        const coinsSection = document.getElementById('coins-payment-section');
        const payButton = document.getElementById('pay-button');

        if (method === 'card') {
            if (cardSection) cardSection.style.display = 'block';
            if (coinsSection) coinsSection.style.display = 'none';
            if (payButton) {
                const amount = parseFloat(payButton.dataset.amount) || 0;
                payButton.innerHTML = `<i class="fas fa-credit-card"></i> Pay ${this.formatCurrency(amount)}`;
                payButton.onclick = () => this.submitPayment(payButton.dataset.jobId, payButton.dataset.contractorId, amount);
                payButton.disabled = false;
                payButton.style.opacity = '1';
            }
        } else if (method === 'coins') {
            if (cardSection) cardSection.style.display = 'none';
            if (coinsSection) coinsSection.style.display = 'block';
            if (payButton) {
                const amount = parseFloat(payButton.dataset.amount) || 0;
                const canPay = this.userCoinBalance >= amount;
                payButton.innerHTML = `<i class="fas fa-coins"></i> Pay ${Math.ceil(amount)} HKC`;
                payButton.onclick = () => this.payWithCoins(payButton.dataset.jobId, payButton.dataset.contractorId, Math.ceil(amount));
                payButton.disabled = !canPay;
                payButton.style.opacity = canPay ? '1' : '0.5';
            }
        }
    },

    /**
     * Submit payment
     */
    async submitPayment(jobId, contractorId, amount) {
        const payButton = document.getElementById('pay-button');
        const errorDiv = document.getElementById('card-errors');

        try {
            payButton.disabled = true;
            payButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

            const result = await this.processPayment({
                amount: amount,
                jobId: jobId,
                contractorId: contractorId,
                customerId: CariComProsAPI.getUserId()
            });

            if (result.success) {
                this.closePaymentModal();
                this.showPaymentSuccess(result);
            }
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            payButton.disabled = false;
            payButton.innerHTML = `<i class="fas fa-credit-card"></i> Pay ${this.formatCurrency(amount)}`;
        }
    },

    /**
     * Show payment success modal
     */
    showPaymentSuccess(result) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'paymentSuccessModal';
        modal.innerHTML = `
            <div class="modal-content" style="background: white; border-radius: 15px; max-width: 400px; width: 90%; margin: auto; position: relative; top: 50%; transform: translateY(-50%); text-align: center; padding: 40px;">
                <div style="width: 80px; height: 80px; background: #e8f5e9; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <i class="fas fa-check" style="font-size: 40px; color: #27ae60;"></i>
                </div>
                <h2 style="color: #1a1a2e; margin: 0 0 10px;">Payment Successful!</h2>
                <p style="color: #666; margin: 0 0 20px;">Your payment has been processed successfully.</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 20px;">
                    <div style="font-size: 0.9em; color: #888;">Transaction ID</div>
                    <div style="font-weight: bold; color: #1a1a2e;">${result.transactionId || 'N/A'}</div>
                </div>
                <button class="btn btn-primary" onclick="document.getElementById('paymentSuccessModal').remove(); location.reload();" style="width: 100%; background: linear-gradient(45deg, #ffd700, #ffed4e); color: #1a1a2e; border: none; padding: 15px; border-radius: 10px; font-weight: bold; cursor: pointer;">
                    Done
                </button>
            </div>
        `;
        document.body.appendChild(modal);
    },

    /**
     * Close payment modal
     */
    closePaymentModal() {
        const modal = document.getElementById('paymentModal');
        if (modal) modal.remove();
    }
};

// Contractor Payout Settings
const ContractorPayouts = {
    /**
     * Create payout settings modal
     * @param {Object} currentSettings - Current payout settings
     */
    createPayoutSettingsModal(currentSettings = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'payoutSettingsModal';
        modal.innerHTML = `
            <div class="modal-content" style="background: white; border-radius: 15px; max-width: 550px; width: 90%; margin: auto; position: relative; top: 50%; transform: translateY(-50%); max-height: 90vh; overflow-y: auto;">
                <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); color: white; padding: 25px; border-radius: 15px 15px 0 0;">
                    <h2 style="margin: 0; color: #ffd700;">Payout Settings</h2>
                    <p style="margin: 10px 0 0; opacity: 0.9;">Choose how you want to receive payments</p>
                </div>

                <div style="padding: 25px;">
                    <!-- Payout Method Selection -->
                    <div class="payout-methods">
                        <label class="payout-option ${currentSettings.method === 'square' ? 'selected' : ''}" style="display: block; padding: 20px; border: 2px solid #ddd; border-radius: 10px; margin-bottom: 15px; cursor: pointer; transition: all 0.3s;">
                            <input type="radio" name="payoutMethod" value="square" ${currentSettings.method === 'square' ? 'checked' : ''} onchange="ContractorPayouts.selectMethod('square')" style="display: none;">
                            <div style="display: flex; align-items: center;">
                                <div style="width: 50px; height: 50px; background: #000; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                                    <span style="color: white; font-weight: bold;">□</span>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-weight: bold; color: #1a1a2e;">Square</div>
                                    <div style="color: #666; font-size: 0.9em;">Instant deposits to your Square account</div>
                                </div>
                                <i class="fas fa-check-circle" style="color: #27ae60; font-size: 1.5em; display: ${currentSettings.method === 'square' ? 'block' : 'none'};"></i>
                            </div>
                        </label>

                        <label class="payout-option ${currentSettings.method === 'paypal' ? 'selected' : ''}" style="display: block; padding: 20px; border: 2px solid #ddd; border-radius: 10px; margin-bottom: 15px; cursor: pointer; transition: all 0.3s;">
                            <input type="radio" name="payoutMethod" value="paypal" ${currentSettings.method === 'paypal' ? 'checked' : ''} onchange="ContractorPayouts.selectMethod('paypal')" style="display: none;">
                            <div style="display: flex; align-items: center;">
                                <div style="width: 50px; height: 50px; background: #003087; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                                    <span style="color: white; font-weight: bold; font-style: italic;">P</span>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-weight: bold; color: #1a1a2e;">PayPal</div>
                                    <div style="color: #666; font-size: 0.9em;">Transfer to your PayPal account</div>
                                </div>
                                <i class="fas fa-check-circle" style="color: #27ae60; font-size: 1.5em; display: ${currentSettings.method === 'paypal' ? 'block' : 'none'};"></i>
                            </div>
                        </label>

                        <label class="payout-option ${currentSettings.method === 'bank' ? 'selected' : ''}" style="display: block; padding: 20px; border: 2px solid #ddd; border-radius: 10px; margin-bottom: 15px; cursor: pointer; transition: all 0.3s;">
                            <input type="radio" name="payoutMethod" value="bank" ${currentSettings.method === 'bank' ? 'checked' : ''} onchange="ContractorPayouts.selectMethod('bank')" style="display: none;">
                            <div style="display: flex; align-items: center;">
                                <div style="width: 50px; height: 50px; background: #27ae60; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                                    <i class="fas fa-university" style="color: white; font-size: 1.2em;"></i>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-weight: bold; color: #1a1a2e;">Bank Transfer</div>
                                    <div style="color: #666; font-size: 0.9em;">Direct deposit to your bank account</div>
                                </div>
                                <i class="fas fa-check-circle" style="color: #27ae60; font-size: 1.5em; display: ${currentSettings.method === 'bank' ? 'block' : 'none'};"></i>
                            </div>
                        </label>
                    </div>

                    <!-- Method-specific fields -->
                    <div id="payout-details" style="margin-top: 20px;">
                        ${this.getMethodFields(currentSettings.method || 'square', currentSettings)}
                    </div>

                    <!-- Fee Notice -->
                    <div style="background: #fff3e0; padding: 15px; border-radius: 10px; margin: 20px 0;">
                        <div style="display: flex; align-items: center;">
                            <i class="fas fa-info-circle" style="color: #ff9800; margin-right: 10px;"></i>
                            <span style="color: #e65100; font-size: 0.9em;">
                                Hidden Kingz charges a 10% platform fee on all transactions. You receive 90% of each payment.
                            </span>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div style="display: flex; gap: 10px;">
                        <button class="btn btn-outline" onclick="ContractorPayouts.closeModal()" style="flex: 1; padding: 15px; border-radius: 10px; cursor: pointer;">
                            Cancel
                        </button>
                        <button class="btn btn-primary" onclick="ContractorPayouts.saveSettings()" style="flex: 2; background: linear-gradient(45deg, #ffd700, #ffed4e); color: #1a1a2e; border: none; padding: 15px; border-radius: 10px; font-weight: bold; cursor: pointer;">
                            <i class="fas fa-save"></i> Save Settings
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add styles for selected state
        const style = document.createElement('style');
        style.textContent = `
            .payout-option.selected {
                border-color: #ffd700 !important;
                background: #fffef0;
            }
            .payout-option:hover {
                border-color: #ffd700;
            }
        `;
        document.head.appendChild(style);
    },

    /**
     * Get method-specific form fields
     */
    getMethodFields(method, settings = {}) {
        switch (method) {
            case 'square':
                return `
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #1a1a2e;">Square Email</label>
                        <input type="email" id="square-email" value="${settings.squareEmail || ''}" placeholder="your@email.com" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1em;">
                        <small style="color: #666; margin-top: 5px; display: block;">The email associated with your Square account</small>
                    </div>
                `;
            case 'paypal':
                return `
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #1a1a2e;">PayPal Email</label>
                        <input type="email" id="paypal-email" value="${settings.paypalEmail || ''}" placeholder="your@email.com" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1em;">
                        <small style="color: #666; margin-top: 5px; display: block;">The email associated with your PayPal account</small>
                    </div>
                `;
            case 'bank':
                return `
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #1a1a2e;">Bank Name</label>
                        <input type="text" id="bank-name" value="${settings.bankName || ''}" placeholder="e.g., First Caribbean Bank" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1em;">
                    </div>
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #1a1a2e;">Account Holder Name</label>
                        <input type="text" id="account-holder" value="${settings.accountHolder || ''}" placeholder="Full name on account" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1em;">
                    </div>
                    <div class="form-group" style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #1a1a2e;">Account Number</label>
                        <input type="text" id="account-number" value="${settings.accountNumber || ''}" placeholder="Account number" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1em;">
                    </div>
                    <div class="form-group">
                        <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #1a1a2e;">Routing/Transit Number</label>
                        <input type="text" id="routing-number" value="${settings.routingNumber || ''}" placeholder="Routing number" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1em;">
                    </div>
                `;
            default:
                return '';
        }
    },

    /**
     * Handle method selection
     */
    selectMethod(method) {
        // Update visual state
        document.querySelectorAll('.payout-option').forEach(opt => {
            opt.classList.remove('selected');
            opt.querySelector('.fa-check-circle').style.display = 'none';
        });

        const selected = document.querySelector(`input[value="${method}"]`).parentElement.parentElement;
        selected.classList.add('selected');
        selected.querySelector('.fa-check-circle').style.display = 'block';

        // Update form fields
        const detailsDiv = document.getElementById('payout-details');
        detailsDiv.innerHTML = this.getMethodFields(method);
    },

    /**
     * Save payout settings
     */
    async saveSettings() {
        const method = document.querySelector('input[name="payoutMethod"]:checked')?.value;

        if (!method) {
            CariComProsAPI.showToast('Please select a payout method', 'error');
            return;
        }

        let payoutData = { method };

        // Gather method-specific data
        switch (method) {
            case 'square':
                payoutData.squareEmail = document.getElementById('square-email')?.value;
                if (!payoutData.squareEmail) {
                    CariComProsAPI.showToast('Please enter your Square email', 'error');
                    return;
                }
                break;
            case 'paypal':
                payoutData.paypalEmail = document.getElementById('paypal-email')?.value;
                if (!payoutData.paypalEmail) {
                    CariComProsAPI.showToast('Please enter your PayPal email', 'error');
                    return;
                }
                break;
            case 'bank':
                payoutData.bankName = document.getElementById('bank-name')?.value;
                payoutData.accountHolder = document.getElementById('account-holder')?.value;
                payoutData.accountNumber = document.getElementById('account-number')?.value;
                payoutData.routingNumber = document.getElementById('routing-number')?.value;

                if (!payoutData.bankName || !payoutData.accountHolder || !payoutData.accountNumber) {
                    CariComProsAPI.showToast('Please fill in all bank details', 'error');
                    return;
                }
                break;
        }

        CariComProsAPI.showLoading('Saving payout settings...');

        try {
            const result = await CariComProsAPI.request('updatePayoutSettings', 'POST', {
                contractorId: CariComProsAPI.getUserId(),
                ...payoutData
            });

            CariComProsAPI.hideLoading();

            if (result.success) {
                CariComProsAPI.showToast('Payout settings saved!', 'success');
                this.closeModal();
            } else {
                CariComProsAPI.showToast(result.error || 'Failed to save settings', 'error');
            }
        } catch (error) {
            CariComProsAPI.hideLoading();
            CariComProsAPI.showToast('Error saving settings', 'error');
        }
    },

    /**
     * Close modal
     */
    closeModal() {
        const modal = document.getElementById('payoutSettingsModal');
        if (modal) modal.remove();
    },

    /**
     * Open payout settings
     */
    async openSettings() {
        CariComProsAPI.showLoading('Loading payout settings...');

        try {
            const result = await CariComProsAPI.request('getPayoutSettings', 'GET', {
                contractorId: CariComProsAPI.getUserId()
            });

            CariComProsAPI.hideLoading();
            this.createPayoutSettingsModal(result.settings || {});
        } catch (error) {
            CariComProsAPI.hideLoading();
            this.createPayoutSettingsModal({});
        }
    }
};

// Export for use
window.CariComProsPayments = CariComProsPayments;
window.ContractorPayouts = ContractorPayouts;
