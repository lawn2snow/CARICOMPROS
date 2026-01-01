/**
 * CaricomPros - Google Apps Script
 * Caribbean Service Marketplace Database
 *
 * This script manages the database for CaricomPros,
 * the Caribbean's trusted service marketplace.
 */

// ============================================
// QUICK SETUP - RUN THIS FIRST
// ============================================

/**
 * CARICOMPROS - Fresh setup function
 * DELETES all existing sheets and creates only what CaricomPros needs
 * Run this ONCE to set up a clean database
 */
function setupFreshDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // CaricomPros needs these sheets (Service Marketplace):
  const requiredSheets = {
    'Contractors': ['ID', 'Name', 'Email', 'Phone', 'Category', 'Location', 'Rating', 'Jobs', 'Earnings', 'Status', 'Verified', 'Joined', 'BusinessName', 'Experience', 'Bio', 'VerifiedAt', 'VerifiedBy', 'Password'],
    'Customers': ['CustomerID', 'Name', 'Email', 'Phone', 'Location', 'Status', 'Joined', 'TotalJobs', 'TotalSpent', 'Password'],
    'Jobs': ['JobID', 'CustomerID', 'CustomerName', 'CustomerEmail', 'CustomerPhone', 'Title', 'Description', 'Category', 'Location', 'Budget', 'Urgency', 'Status', 'CreatedAt', 'AssignedContractor', 'QuotesReceived', 'CompletedAt'],
    'Quotes': ['QuoteID', 'JobID', 'ContractorID', 'ContractorName', 'Amount', 'Message', 'Timeline', 'Status', 'CreatedAt'],
    'Payments': ['PaymentID', 'JobID', 'ContractorID', 'TotalAmount', 'PlatformFee', 'ContractorPayout', 'Status', 'CreatedAt', 'SquarePaymentID', 'CustomerID'],
    'Messages': ['MessageID', 'FromID', 'ToID', 'JobID', 'Message', 'Read', 'CreatedAt'],
    'Reviews': ['ReviewID', 'JobID', 'ContractorID', 'CustomerID', 'Rating', 'Comment', 'CreatedAt'],
    'PayoutSettings': ['ContractorID', 'Method', 'SquareEmail', 'PayPalEmail', 'BankName', 'AccountName', 'AccountNumber', 'RoutingNumber', 'UpdatedAt'],
    'Listings': ['ListingID', 'SellerID', 'SellerType', 'SellerName', 'SellerEmail', 'Title', 'Description', 'Price', 'Category', 'Condition', 'Location', 'Images', 'Status', 'CreatedAt', 'UpdatedAt', 'Views'],
    'Disputes': ['DisputeID', 'JobID', 'CustomerID', 'ContractorID', 'Type', 'Description', 'Status', 'Resolution', 'CreatedAt', 'ResolvedAt'],
    'Settings': ['Key', 'Value', 'UpdatedAt'],
    'CoinTransactions': ['TransactionID', 'UserID', 'UserType', 'Type', 'Amount', 'Balance', 'Description', 'CreatedAt']
  };

  // Step 1: Delete ALL existing sheets except Sheet1
  const allSheets = ss.getSheets();
  let deleted = [];

  for (const sheet of allSheets) {
    const name = sheet.getName();
    if (name !== 'Sheet1' && !requiredSheets[name]) {
      try {
        ss.deleteSheet(sheet);
        deleted.push(name);
      } catch (e) {
        Logger.log('Could not delete: ' + name);
      }
    }
  }

  // Step 2: Create required sheets
  let created = [];

  for (const [sheetName, headers] of Object.entries(requiredSheets)) {
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      created.push(sheetName);
    }

    // Clear and set headers
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Format header row - CaricomPros navy/gold theme
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#1a1a2e');
    headerRange.setFontColor('#ffd700');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // Delete Sheet1 if it exists and we have other sheets
  const sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(sheet1);
      deleted.push('Sheet1');
    } catch (e) {}
  }

  Logger.log('=== CARICOMPROS SETUP COMPLETE ===');
  Logger.log('Deleted sheets: ' + (deleted.length > 0 ? deleted.join(', ') : 'None'));
  Logger.log('Created sheets: ' + (created.length > 0 ? created.join(', ') : 'None'));
  Logger.log('');
  Logger.log('Required sheets for CaricomPros Marketplace:');
  Logger.log('- Contractors (service providers)');
  Logger.log('- Customers (people hiring)');
  Logger.log('- Jobs (service requests)');
  Logger.log('- Quotes (contractor bids)');
  Logger.log('- Payments (transactions)');
  Logger.log('- Messages (communication)');
  Logger.log('- Reviews (ratings)');
  Logger.log('- Listings (marketplace items)');
  Logger.log('- Disputes, Settings, PayoutSettings, CoinTransactions');
}

// Alias for backwards compatibility
function setupSheetsSimple() {
  setupFreshDatabase();
}

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  PLATFORM_NAME: 'CaricomPros',
  PLATFORM_FEE_PERCENT: 0.10,
  CONTRACTOR_PAYOUT_PERCENT: 0.90,
  THEME_PRIMARY: '#1a1a2e',
  THEME_ACCENT: '#ffd700'
};

// ============================================
// MENU SETUP
// ============================================

/**
 * Creates custom menu when spreadsheet opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('CaricomPros')
    .addItem('Setup All Sheets (Add Missing Columns)', 'setupAllSheets')
    .addItem('Add Password Columns Only', 'addPasswordColumns')
    .addSeparator()
    .addSubMenu(ui.createMenu('Generate IDs')
      .addItem('Generate Contractor ID', 'generateContractorId')
      .addItem('Generate Customer ID', 'generateCustomerId')
      .addItem('Generate Job ID', 'generateJobId')
      .addItem('Generate Quote ID', 'generateQuoteId')
      .addItem('Generate Payment ID', 'generatePaymentId')
      .addItem('Generate Message ID', 'generateMessageId')
      .addItem('Generate Review ID', 'generateReviewId'))
    .addSeparator()
    .addSubMenu(ui.createMenu('Reports')
      .addItem('Platform Statistics', 'showPlatformStats')
      .addItem('Contractor Performance', 'showContractorPerformance')
      .addItem('Revenue Report', 'showRevenueReport'))
    .addSeparator()
    .addSubMenu(ui.createMenu('Utilities')
      .addItem('Update Contractor Ratings', 'updateAllContractorRatings')
      .addItem('Validate Data Integrity', 'validateDataIntegrity')
      .addItem('Archive Completed Jobs', 'archiveCompletedJobs'))
    .addToUi();
}

// ============================================
// SHEET SETUP FUNCTIONS
// ============================================

/**
 * Sets up all required sheets with headers
 */
function setupAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  setupContractorsSheet(ss);
  setupCustomersSheet(ss);
  setupJobsSheet(ss);
  setupQuotesSheet(ss);
  setupPaymentsSheet(ss);
  setupMessagesSheet(ss);
  setupReviewsSheet(ss);

  SpreadsheetApp.getUi().alert('All sheets have been set up successfully!');
}

/**
 * Add Password column to existing sheets
 * Run this once to update existing Contractors and Customers sheets
 */
function addPasswordColumns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Add Password column to Contractors sheet
  const contractorsSheet = ss.getSheetByName('Contractors');
  if (contractorsSheet) {
    const headers = contractorsSheet.getRange(1, 1, 1, contractorsSheet.getLastColumn()).getValues()[0];
    if (headers.indexOf('Password') === -1) {
      const nextCol = contractorsSheet.getLastColumn() + 1;
      contractorsSheet.getRange(1, nextCol).setValue('Password');
      contractorsSheet.getRange(1, nextCol).setBackground('#1a1a2e').setFontColor('white').setFontWeight('bold');
      SpreadsheetApp.getUi().alert('Password column added to Contractors sheet at column ' + nextCol);
    } else {
      SpreadsheetApp.getUi().alert('Contractors sheet already has Password column');
    }
  }

  // Add Password column to Customers sheet
  const customersSheet = ss.getSheetByName('Customers');
  if (customersSheet) {
    const headers = customersSheet.getRange(1, 1, 1, customersSheet.getLastColumn()).getValues()[0];
    if (headers.indexOf('Password') === -1) {
      const nextCol = customersSheet.getLastColumn() + 1;
      customersSheet.getRange(1, nextCol).setValue('Password');
      customersSheet.getRange(1, nextCol).setBackground('#1a1a2e').setFontColor('white').setFontWeight('bold');
      SpreadsheetApp.getUi().alert('Password column added to Customers sheet at column ' + nextCol);
    } else {
      SpreadsheetApp.getUi().alert('Customers sheet already has Password column');
    }
  }
}

/**
 * Master setup function - creates/updates ALL sheets with proper structure
 * Run this to ensure all sheets have the correct columns
 */
function setupAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Define all sheet structures
  const sheetConfigs = {
    'Contractors': {
      headers: ['ID', 'Name', 'Email', 'Phone', 'Category', 'Location', 'Rating', 'Jobs', 'Earnings', 'Status', 'Verified', 'Joined', 'BusinessName', 'Experience', 'Bio', 'VerifiedAt', 'VerifiedBy', 'Password'],
      widths: {1: 180, 2: 150, 3: 200, 15: 300}
    },
    'Customers': {
      headers: ['CustomerID', 'Name', 'Email', 'Phone', 'Location', 'Status', 'Joined', 'TotalJobs', 'TotalSpent', 'Password'],
      widths: {1: 180, 3: 200}
    },
    'Jobs': {
      headers: ['JobID', 'CustomerID', 'CustomerName', 'CustomerEmail', 'CustomerPhone', 'Title', 'Description', 'Category', 'Location', 'Budget', 'Urgency', 'Status', 'CreatedAt', 'AssignedContractor', 'QuotesReceived', 'CompletedAt'],
      widths: {1: 180, 6: 200, 7: 300}
    },
    'Quotes': {
      headers: ['QuoteID', 'JobID', 'ContractorID', 'ContractorName', 'Amount', 'Message', 'Timeline', 'Status', 'CreatedAt'],
      widths: {1: 180, 6: 300}
    },
    'Payments': {
      headers: ['PaymentID', 'JobID', 'ContractorID', 'TotalAmount', 'PlatformFee', 'ContractorPayout', 'Status', 'CreatedAt', 'SquarePaymentID', 'CustomerID'],
      widths: {1: 180}
    },
    'Messages': {
      headers: ['MessageID', 'FromID', 'ToID', 'JobID', 'Message', 'Read', 'CreatedAt'],
      widths: {1: 180, 5: 400}
    },
    'Reviews': {
      headers: ['ReviewID', 'JobID', 'ContractorID', 'CustomerID', 'Rating', 'Comment', 'CreatedAt'],
      widths: {1: 180, 6: 400}
    },
    'PayoutSettings': {
      headers: ['ContractorID', 'Method', 'SquareEmail', 'PayPalEmail', 'BankName', 'AccountName', 'AccountNumber', 'RoutingNumber', 'UpdatedAt'],
      widths: {1: 180}
    }
  };

  let results = [];

  for (const [sheetName, config] of Object.entries(sheetConfigs)) {
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      // Create new sheet
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
      results.push(sheetName + ': Created with ' + config.headers.length + ' columns');
    } else {
      // Update existing sheet - add missing columns
      const existingHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
      let addedColumns = [];

      for (const header of config.headers) {
        if (existingHeaders.indexOf(header) === -1) {
          const nextCol = sheet.getLastColumn() + 1;
          sheet.getRange(1, nextCol).setValue(header);
          addedColumns.push(header);
        }
      }

      if (addedColumns.length > 0) {
        results.push(sheetName + ': Added columns - ' + addedColumns.join(', '));
      } else {
        results.push(sheetName + ': Already up to date');
      }
    }

    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
    headerRange.setBackground('#1a1a2e');
    headerRange.setFontColor('white');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);

    // Set column widths
    for (const [col, width] of Object.entries(config.widths)) {
      sheet.setColumnWidth(parseInt(col), width);
    }
  }

  SpreadsheetApp.getUi().alert('Sheet Setup Complete!\n\n' + results.join('\n'));
}

/**
 * Setup Contractors sheet
 */
function setupContractorsSheet(ss) {
  let sheet = ss.getSheetByName('Contractors');
  if (!sheet) {
    sheet = ss.insertSheet('Contractors');
  }

  const headers = [
    'ID', 'Name', 'Email', 'Phone', 'Category', 'Location',
    'Rating', 'Jobs', 'Earnings', 'Status', 'Verified', 'Joined',
    'BusinessName', 'Experience', 'Bio', 'VerifiedAt', 'VerifiedBy', 'Password'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);

  // Set column widths
  sheet.setColumnWidth(1, 180);  // ID
  sheet.setColumnWidth(2, 150);  // Name
  sheet.setColumnWidth(3, 200);  // Email
  sheet.setColumnWidth(15, 300); // Bio
}

/**
 * Setup Customers sheet
 */
function setupCustomersSheet(ss) {
  let sheet = ss.getSheetByName('Customers');
  if (!sheet) {
    sheet = ss.insertSheet('Customers');
  }

  const headers = [
    'CustomerID', 'Name', 'Email', 'Phone', 'Location',
    'Status', 'Joined', 'TotalJobs', 'TotalSpent', 'Password'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);

  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(3, 200);
}

/**
 * Setup Jobs sheet
 */
function setupJobsSheet(ss) {
  let sheet = ss.getSheetByName('Jobs');
  if (!sheet) {
    sheet = ss.insertSheet('Jobs');
  }

  const headers = [
    'JobID', 'CustomerID', 'CustomerName', 'CustomerEmail', 'CustomerPhone',
    'Title', 'Description', 'Category', 'Location', 'Budget', 'Urgency',
    'Status', 'CreatedAt', 'AssignedContractor', 'QuotesReceived', 'CompletedAt'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);

  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(6, 200);  // Title
  sheet.setColumnWidth(7, 300);  // Description

  // Add data validation for Status
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Open', 'In Progress', 'Completed', 'Cancelled'], true)
    .build();
  sheet.getRange('L2:L').setDataValidation(statusRule);

  // Add data validation for Urgency
  const urgencyRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Low', 'Medium', 'High', 'Emergency'], true)
    .build();
  sheet.getRange('K2:K').setDataValidation(urgencyRule);
}

/**
 * Setup Quotes sheet
 */
function setupQuotesSheet(ss) {
  let sheet = ss.getSheetByName('Quotes');
  if (!sheet) {
    sheet = ss.insertSheet('Quotes');
  }

  const headers = [
    'QuoteID', 'JobID', 'ContractorID', 'ContractorName',
    'Amount', 'Message', 'Timeline', 'Status', 'SubmittedAt'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);

  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(6, 300);  // Message

  // Add data validation for Status
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pending', 'Accepted', 'Rejected'], true)
    .build();
  sheet.getRange('H2:H').setDataValidation(statusRule);
}

/**
 * Setup Payments sheet
 */
function setupPaymentsSheet(ss) {
  let sheet = ss.getSheetByName('Payments');
  if (!sheet) {
    sheet = ss.insertSheet('Payments');
  }

  const headers = [
    'PaymentID', 'JobID', 'ContractorID', 'TotalAmount',
    'PlatformFee', 'ContractorPayout', 'Status', 'ProcessedAt'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);

  sheet.setColumnWidth(1, 180);

  // Format currency columns
  sheet.getRange('D2:F').setNumberFormat('$#,##0.00');

  // Add data validation for Status
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pending', 'Completed', 'Refunded'], true)
    .build();
  sheet.getRange('G2:G').setDataValidation(statusRule);
}

/**
 * Setup Messages sheet
 */
function setupMessagesSheet(ss) {
  let sheet = ss.getSheetByName('Messages');
  if (!sheet) {
    sheet = ss.insertSheet('Messages');
  }

  const headers = [
    'MessageID', 'FromID', 'ToID', 'JobID', 'Message', 'SentAt', 'Read'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);

  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(5, 400);  // Message
}

/**
 * Setup Reviews sheet
 */
function setupReviewsSheet(ss) {
  let sheet = ss.getSheetByName('Reviews');
  if (!sheet) {
    sheet = ss.insertSheet('Reviews');
  }

  const headers = [
    'ReviewID', 'JobID', 'ContractorID', 'CustomerID',
    'Rating', 'Comment', 'CreatedAt'
  ];

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  formatHeaderRow(sheet, headers.length);

  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(6, 400);  // Comment

  // Add data validation for Rating (1-5)
  const ratingRule = SpreadsheetApp.newDataValidation()
    .requireNumberBetween(1, 5)
    .build();
  sheet.getRange('E2:E').setDataValidation(ratingRule);
}

/**
 * Format header row with styling
 */
function formatHeaderRow(sheet, numColumns) {
  const headerRange = sheet.getRange(1, 1, 1, numColumns);
  headerRange.setBackground('#1a1a2e');
  headerRange.setFontColor('#ffd700');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

// ============================================
// ID GENERATION FUNCTIONS
// ============================================

/**
 * Generate unique ID with prefix and timestamp
 */
function generateUniqueId(prefix) {
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return prefix + timestamp + random;
}

function generateContractorId() {
  const id = generateUniqueId('CONT');
  copyToClipboardAlert(id);
  return id;
}

function generateCustomerId() {
  const id = generateUniqueId('CUST');
  copyToClipboardAlert(id);
  return id;
}

function generateJobId() {
  const id = generateUniqueId('JOB');
  copyToClipboardAlert(id);
  return id;
}

function generateQuoteId() {
  const id = generateUniqueId('QUOTE');
  copyToClipboardAlert(id);
  return id;
}

function generatePaymentId() {
  const id = generateUniqueId('PAY');
  copyToClipboardAlert(id);
  return id;
}

function generateMessageId() {
  const id = generateUniqueId('MSG');
  copyToClipboardAlert(id);
  return id;
}

function generateReviewId() {
  const id = generateUniqueId('REV');
  copyToClipboardAlert(id);
  return id;
}

function copyToClipboardAlert(id) {
  SpreadsheetApp.getUi().alert('Generated ID: ' + id + '\n\nCopy this ID to use in your data.');
}

// ============================================
// INPUT VALIDATION & SANITIZATION
// ============================================

/**
 * Sanitize string input to prevent XSS and injection
 */
function sanitizeString(str, maxLength = 1000) {
  if (!str) return '';
  return String(str)
    .trim()
    .substring(0, maxLength)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '');
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).trim());
}

/**
 * Validate that a value is a non-negative number
 */
function isValidPrice(price) {
  const num = parseFloat(price);
  return !isNaN(num) && num >= 0;
}

// ============================================
// BUSINESS LOGIC FUNCTIONS
// ============================================

/**
 * Calculate payment breakdown (10% platform fee)
 */
function calculatePayment(totalAmount) {
  const platformFee = totalAmount * CONFIG.PLATFORM_FEE_PERCENT;
  const contractorPayout = totalAmount * CONFIG.CONTRACTOR_PAYOUT_PERCENT;

  return {
    totalAmount: totalAmount,
    platformFee: Math.round(platformFee * 100) / 100,
    contractorPayout: Math.round(contractorPayout * 100) / 100
  };
}

/**
 * Update contractor rating based on reviews
 */
function updateContractorRating(contractorId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reviewsSheet = ss.getSheetByName('Reviews');
  const contractorsSheet = ss.getSheetByName('Contractors');

  if (!reviewsSheet || !contractorsSheet) return;

  const reviewsData = reviewsSheet.getDataRange().getValues();
  const contractorReviews = reviewsData.filter(row => row[2] === contractorId);

  if (contractorReviews.length === 0) return;

  const totalRating = contractorReviews.reduce((sum, row) => sum + (row[4] || 0), 0);
  const averageRating = Math.round((totalRating / contractorReviews.length) * 10) / 10;

  // Find and update contractor
  const contractorsData = contractorsSheet.getDataRange().getValues();
  for (let i = 1; i < contractorsData.length; i++) {
    if (contractorsData[i][0] === contractorId) {
      contractorsSheet.getRange(i + 1, 7).setValue(averageRating);  // Rating column
      break;
    }
  }

  return averageRating;
}

/**
 * Update all contractor ratings
 */
function updateAllContractorRatings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const contractorsSheet = ss.getSheetByName('Contractors');

  if (!contractorsSheet) {
    SpreadsheetApp.getUi().alert('Contractors sheet not found!');
    return;
  }

  const contractorsData = contractorsSheet.getDataRange().getValues();
  let updated = 0;

  for (let i = 1; i < contractorsData.length; i++) {
    const contractorId = contractorsData[i][0];
    if (contractorId) {
      updateContractorRating(contractorId);
      updated++;
    }
  }

  SpreadsheetApp.getUi().alert('Updated ratings for ' + updated + ' contractors.');
}

/**
 * Increment quotes received count for a job
 */
function incrementJobQuotes(jobId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const jobsSheet = ss.getSheetByName('Jobs');

  if (!jobsSheet) return;

  const jobsData = jobsSheet.getDataRange().getValues();
  for (let i = 1; i < jobsData.length; i++) {
    if (jobsData[i][0] === jobId) {
      const currentQuotes = jobsData[i][14] || 0;
      jobsSheet.getRange(i + 1, 15).setValue(currentQuotes + 1);
      break;
    }
  }
}

/**
 * Update customer total spent
 */
function updateCustomerSpent(customerId, amount) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const customersSheet = ss.getSheetByName('Customers');

  if (!customersSheet) return;

  const customersData = customersSheet.getDataRange().getValues();
  for (let i = 1; i < customersData.length; i++) {
    if (customersData[i][0] === customerId) {
      const currentSpent = customersData[i][8] || 0;
      customersSheet.getRange(i + 1, 9).setValue(currentSpent + amount);
      break;
    }
  }
}

/**
 * Update contractor earnings and job count
 */
function updateContractorStats(contractorId, earnings) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const contractorsSheet = ss.getSheetByName('Contractors');

  if (!contractorsSheet) return;

  const contractorsData = contractorsSheet.getDataRange().getValues();
  for (let i = 1; i < contractorsData.length; i++) {
    if (contractorsData[i][0] === contractorId) {
      const currentJobs = contractorsData[i][7] || 0;
      const currentEarnings = contractorsData[i][8] || 0;
      contractorsSheet.getRange(i + 1, 8).setValue(currentJobs + 1);  // Jobs column
      contractorsSheet.getRange(i + 1, 9).setValue(currentEarnings + earnings);  // Earnings column
      break;
    }
  }
}

// ============================================
// REPORTING FUNCTIONS
// ============================================

/**
 * Show platform statistics
 */
function showPlatformStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const contractors = getSheetRowCount(ss, 'Contractors');
  const customers = getSheetRowCount(ss, 'Customers');
  const jobs = getSheetRowCount(ss, 'Jobs');
  const completedJobs = countByStatus(ss, 'Jobs', 11, 'Completed');
  const openJobs = countByStatus(ss, 'Jobs', 11, 'Open');

  const paymentsSheet = ss.getSheetByName('Payments');
  let totalRevenue = 0;
  let platformFees = 0;

  if (paymentsSheet) {
    const paymentsData = paymentsSheet.getDataRange().getValues();
    for (let i = 1; i < paymentsData.length; i++) {
      if (paymentsData[i][6] === 'Completed') {
        totalRevenue += paymentsData[i][3] || 0;
        platformFees += paymentsData[i][4] || 0;
      }
    }
  }

  const stats = `
HIDDEN KINGZ PLATFORM STATISTICS
================================

USERS
- Total Contractors: ${contractors}
- Total Customers: ${customers}

JOBS
- Total Jobs Posted: ${jobs}
- Open Jobs: ${openJobs}
- Completed Jobs: ${completedJobs}

FINANCIALS
- Total Revenue: $${totalRevenue.toFixed(2)}
- Platform Fees Earned: $${platformFees.toFixed(2)}
- Contractor Payouts: $${(totalRevenue - platformFees).toFixed(2)}
  `;

  SpreadsheetApp.getUi().alert(stats);
}

/**
 * Show contractor performance report
 */
function showContractorPerformance() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const contractorsSheet = ss.getSheetByName('Contractors');

  if (!contractorsSheet) {
    SpreadsheetApp.getUi().alert('Contractors sheet not found!');
    return;
  }

  const data = contractorsSheet.getDataRange().getValues();
  const contractors = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      contractors.push({
        name: data[i][1],
        rating: data[i][6] || 0,
        jobs: data[i][7] || 0,
        earnings: data[i][8] || 0,
        verified: data[i][10]
      });
    }
  }

  // Sort by earnings
  contractors.sort((a, b) => b.earnings - a.earnings);

  let report = 'TOP CONTRACTORS BY EARNINGS\n============================\n\n';

  contractors.slice(0, 10).forEach((c, i) => {
    report += `${i + 1}. ${c.name}\n`;
    report += `   Rating: ${c.rating}/5 | Jobs: ${c.jobs} | Earnings: $${c.earnings.toFixed(2)}\n`;
    report += `   Status: ${c.verified}\n\n`;
  });

  SpreadsheetApp.getUi().alert(report);
}

/**
 * Show revenue report by category
 */
function showRevenueReport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const jobsSheet = ss.getSheetByName('Jobs');
  const paymentsSheet = ss.getSheetByName('Payments');

  if (!jobsSheet || !paymentsSheet) {
    SpreadsheetApp.getUi().alert('Required sheets not found!');
    return;
  }

  const jobsData = jobsSheet.getDataRange().getValues();
  const paymentsData = paymentsSheet.getDataRange().getValues();

  // Create job lookup
  const jobCategories = {};
  for (let i = 1; i < jobsData.length; i++) {
    jobCategories[jobsData[i][0]] = jobsData[i][7];  // JobID -> Category
  }

  // Calculate revenue by category
  const categoryRevenue = {};
  for (let i = 1; i < paymentsData.length; i++) {
    if (paymentsData[i][6] === 'Completed') {
      const jobId = paymentsData[i][1];
      const category = jobCategories[jobId] || 'Unknown';
      const fee = paymentsData[i][4] || 0;

      categoryRevenue[category] = (categoryRevenue[category] || 0) + fee;
    }
  }

  let report = 'REVENUE BY CATEGORY\n===================\n\n';

  Object.keys(categoryRevenue).sort((a, b) => categoryRevenue[b] - categoryRevenue[a]).forEach(category => {
    report += `${category}: $${categoryRevenue[category].toFixed(2)}\n`;
  });

  SpreadsheetApp.getUi().alert(report);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get row count for a sheet (excluding header)
 */
function getSheetRowCount(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return 0;
  return Math.max(0, sheet.getLastRow() - 1);
}

/**
 * Count rows by status value
 */
function countByStatus(ss, sheetName, statusColumn, statusValue) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return 0;

  const data = sheet.getDataRange().getValues();
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][statusColumn] === statusValue) {
      count++;
    }
  }

  return count;
}

/**
 * Validate data integrity across sheets
 */
function validateDataIntegrity() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const issues = [];

  // Check for orphan quotes (quotes without valid jobs)
  const jobsSheet = ss.getSheetByName('Jobs');
  const quotesSheet = ss.getSheetByName('Quotes');

  if (jobsSheet && quotesSheet) {
    const jobIds = new Set();
    const jobsData = jobsSheet.getDataRange().getValues();
    for (let i = 1; i < jobsData.length; i++) {
      if (jobsData[i][0]) jobIds.add(jobsData[i][0]);
    }

    const quotesData = quotesSheet.getDataRange().getValues();
    for (let i = 1; i < quotesData.length; i++) {
      if (quotesData[i][1] && !jobIds.has(quotesData[i][1])) {
        issues.push(`Quote ${quotesData[i][0]} references non-existent job ${quotesData[i][1]}`);
      }
    }
  }

  // Check for duplicate IDs
  const sheets = ['Contractors', 'Customers', 'Jobs', 'Quotes', 'Payments', 'Messages', 'Reviews'];
  sheets.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      const ids = new Set();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0]) {
          if (ids.has(data[i][0])) {
            issues.push(`Duplicate ID found in ${sheetName}: ${data[i][0]}`);
          }
          ids.add(data[i][0]);
        }
      }
    }
  });

  if (issues.length === 0) {
    SpreadsheetApp.getUi().alert('Data integrity check passed! No issues found.');
  } else {
    SpreadsheetApp.getUi().alert('Data Integrity Issues Found:\n\n' + issues.join('\n'));
  }
}

/**
 * Archive completed jobs older than 90 days
 */
function archiveCompletedJobs() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Archive Jobs',
    'This will move completed jobs older than 90 days to an Archive sheet. Continue?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const jobsSheet = ss.getSheetByName('Jobs');

  if (!jobsSheet) {
    ui.alert('Jobs sheet not found!');
    return;
  }

  // Create or get archive sheet
  let archiveSheet = ss.getSheetByName('Jobs_Archive');
  if (!archiveSheet) {
    archiveSheet = ss.insertSheet('Jobs_Archive');
    // Copy headers
    const headers = jobsSheet.getRange(1, 1, 1, jobsSheet.getLastColumn()).getValues();
    archiveSheet.getRange(1, 1, 1, headers[0].length).setValues(headers);
    formatHeaderRow(archiveSheet, headers[0].length);
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  const jobsData = jobsSheet.getDataRange().getValues();
  const rowsToArchive = [];
  const rowsToDelete = [];

  for (let i = jobsData.length - 1; i >= 1; i--) {
    if (jobsData[i][11] === 'Completed') {
      const completedAt = new Date(jobsData[i][15]);
      if (completedAt < cutoffDate) {
        rowsToArchive.push(jobsData[i]);
        rowsToDelete.push(i + 1);
      }
    }
  }

  if (rowsToArchive.length === 0) {
    ui.alert('No jobs to archive.');
    return;
  }

  // Add to archive
  archiveSheet.getRange(archiveSheet.getLastRow() + 1, 1, rowsToArchive.length, rowsToArchive[0].length)
    .setValues(rowsToArchive);

  // Delete from main sheet (in reverse order)
  rowsToDelete.forEach(row => {
    jobsSheet.deleteRow(row);
  });

  ui.alert(`Archived ${rowsToArchive.length} completed jobs.`);
}

// ============================================
// TRIGGER FUNCTIONS (for automation)
// ============================================

/**
 * On edit trigger for automatic updates
 */
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  const range = e.range;
  const row = range.getRow();
  const col = range.getColumn();

  // Auto-timestamp for new entries
  if (row > 1 && col === 1) {
    const value = range.getValue();

    // If ID column is filled and timestamp column is empty
    if (value && sheetName === 'Contractors' && !sheet.getRange(row, 12).getValue()) {
      sheet.getRange(row, 12).setValue(new Date());  // Joined
    }
    if (value && sheetName === 'Customers' && !sheet.getRange(row, 7).getValue()) {
      sheet.getRange(row, 7).setValue(new Date());  // Joined
    }
    if (value && sheetName === 'Jobs' && !sheet.getRange(row, 13).getValue()) {
      sheet.getRange(row, 13).setValue(new Date());  // CreatedAt
    }
  }

  // Auto-update when job status changes to Completed
  if (sheetName === 'Jobs' && col === 12 && row > 1) {
    const newStatus = range.getValue();
    if (newStatus === 'Completed' && !sheet.getRange(row, 16).getValue()) {
      sheet.getRange(row, 16).setValue(new Date());  // CompletedAt
    }
  }
}

// ============================================
// WEB APP FUNCTIONS (for API access)
// ============================================

/**
 * Handle GET requests
 * Also handles POST-like requests sent via GET to avoid CORS preflight
 */
function doGet(e) {
  const action = e.parameter.action;

  // Check if there's a payload parameter (POST data sent via GET to avoid CORS)
  let data = e.parameter;
  if (e.parameter.payload) {
    try {
      data = JSON.parse(e.parameter.payload);
    } catch (err) {
      data = e.parameter;
    }
  }

  switch(action) {
    // Debug action to check sheet structure
    case 'debug':
      return jsonResponse(debugSheets());

    // GET actions
    case 'getContractors':
      return jsonResponse(getContractors(e.parameter));
    case 'getJobs':
      return jsonResponse(getJobs(e.parameter));
    case 'getStats':
      return jsonResponse(getStats());
    case 'getCategoryStats':
      return jsonResponse(getCategoryStats());
    case 'getLiveStats':
      return jsonResponse(getLiveStats());
    case 'getCustomerQuotes':
      return jsonResponse(getCustomerQuotes(e.parameter));
    case 'getJobQuotes':
      return jsonResponse(getJobQuotes(e.parameter));
    case 'getPayoutSettings':
      return jsonResponse(getPayoutSettings(e.parameter));
    case 'getCoinBalance':
      return jsonResponse(getCoinBalance(e.parameter));

    // POST actions (sent via GET to avoid CORS)
    case 'createJob':
      return jsonResponse(createJob(data));
    case 'submitQuote':
      return jsonResponse(submitQuote(data));
    case 'registerContractor':
      return jsonResponse(registerContractor(data));
    case 'registerCustomer':
      return jsonResponse(registerCustomer(data));
    case 'processPayment':
      return jsonResponse(processPayment(data));
    case 'acceptQuote':
      return jsonResponse(acceptQuote(data));
    case 'declineQuote':
      return jsonResponse(declineQuote(data));
    case 'updatePayoutSettings':
      return jsonResponse(updatePayoutSettings(data));
    case 'completeJob':
      return jsonResponse(completeJob(data));
    case 'loginUser':
      return jsonResponse(loginUser(data));
    case 'googleAuth':
      return jsonResponse(googleAuth(data));
    case 'sendMessage':
      return jsonResponse(sendMessage(data));
    case 'submitReview':
      return jsonResponse(submitReview(data));
    case 'purchaseCoins':
      return jsonResponse(purchaseCoins(data));
    case 'payWithCoins':
      return jsonResponse(payWithCoins(data));

    // MARKETPLACE actions
    case 'getMarketplaceCategories':
      return jsonResponse(getMarketplaceCategories());
    case 'getListings':
      return jsonResponse(getListings(e.parameter));
    case 'getListing':
      return jsonResponse(getListing(e.parameter));
    case 'getMyListings':
      return jsonResponse(getMyListings(e.parameter));
    case 'getMarketplaceStats':
      return jsonResponse(getMarketplaceStats());
    case 'createListing':
      return jsonResponse(createListing(data));
    case 'updateListing':
      return jsonResponse(updateListing(data));
    case 'markListingAsSold':
      return jsonResponse(markListingAsSold(data));
    case 'deleteListing':
      return jsonResponse(deleteListing(data));
    case 'sendListingMessage':
      return jsonResponse(sendListingMessage(data));

    // ADMIN actions (GET)
    case 'getAdminStats':
      return jsonResponse(getAdminStats());
    case 'getAdminContractors':
      return jsonResponse(getAdminContractors(e.parameter));
    case 'getAdminCustomers':
      return jsonResponse(getAdminCustomers(e.parameter));
    case 'getAdminJobs':
      return jsonResponse(getAdminJobs(e.parameter));
    case 'getAdminPayments':
      return jsonResponse(getAdminPayments(e.parameter));
    case 'getVerificationQueue':
      return jsonResponse(getVerificationQueue());
    case 'getPendingPayouts':
      return jsonResponse(getPendingPayouts());
    case 'getDisputes':
      return jsonResponse(getDisputes(e.parameter));
    case 'getAdminSettings':
      return jsonResponse(getAdminSettings());

    default:
      return jsonResponse({error: 'Invalid action', receivedAction: action});
  }
}

/**
 * Handle POST requests
 */
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;

  switch(action) {
    case 'createJob':
      return jsonResponse(createJob(data));
    case 'submitQuote':
      return jsonResponse(submitQuote(data));
    case 'registerContractor':
      return jsonResponse(registerContractor(data));
    case 'registerCustomer':
      return jsonResponse(registerCustomer(data));
    case 'processPayment':
      return jsonResponse(processPayment(data));
    case 'acceptQuote':
      return jsonResponse(acceptQuote(data));
    case 'declineQuote':
      return jsonResponse(declineQuote(data));
    case 'updatePayoutSettings':
      return jsonResponse(updatePayoutSettings(data));
    case 'completeJob':
      return jsonResponse(completeJob(data));
    case 'loginUser':
      return jsonResponse(loginUser(data));
    case 'googleAuth':
      return jsonResponse(googleAuth(data));

    // MARKETPLACE actions
    case 'createListing':
      return jsonResponse(createListing(data));
    case 'updateListing':
      return jsonResponse(updateListing(data));
    case 'markListingAsSold':
      return jsonResponse(markListingAsSold(data));
    case 'deleteListing':
      return jsonResponse(deleteListing(data));
    case 'adminDeleteListing':
      return jsonResponse(adminDeleteListing(data));
    case 'sendListingMessage':
      return jsonResponse(sendListingMessage(data));

    // ADMIN actions (POST)
    case 'approveContractor':
      return jsonResponse(approveContractor(data));
    case 'rejectContractor':
      return jsonResponse(rejectContractor(data));
    case 'suspendContractor':
      return jsonResponse(suspendContractor(data));
    case 'suspendCustomer':
      return jsonResponse(suspendCustomer(data));
    case 'processPayout':
      return jsonResponse(processPayout(data));
    case 'createDispute':
      return jsonResponse(createDispute(data));
    case 'updateDispute':
      return jsonResponse(updateDispute(data));
    case 'saveAdminSettings':
      return jsonResponse(saveAdminSettings(data));

    default:
      return jsonResponse({error: 'Invalid action'});
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Debug function to check sheet structure
 */
function debugSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const result = {
    spreadsheetName: ss.getName(),
    sheets: {}
  };

  const sheetNames = ['Contractors', 'Customers', 'Jobs', 'Quotes', 'Messages', 'Reviews'];

  sheetNames.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet) {
      const data = sheet.getDataRange().getValues();
      result.sheets[name] = {
        exists: true,
        headers: data[0] || [],
        rowCount: data.length - 1,
        sampleData: data.length > 1 ? data[1] : []
      };
    } else {
      result.sheets[name] = { exists: false };
    }
  });

  return { success: true, debug: result };
}

/**
 * Get contractors with optional filters
 */
function getContractors(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Contractors');

  if (!sheet) return {success: false, error: 'Contractors sheet not found'};

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const contractors = [];

  // Helper for case-insensitive partial match
  function matchesFilter(value, filter) {
    if (!filter) return true;
    if (!value) return false;
    const valLower = String(value).toLowerCase();
    const filterLower = String(filter).toLowerCase();
    return valLower === filterLower || valLower.includes(filterLower) || filterLower.includes(valLower);
  }

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Skip empty rows
    if (!row[0] && !row[1]) continue;

    const contractor = {};
    headers.forEach((header, index) => {
      contractor[header] = row[index];
    });

    // Map common column variations to standardized names
    contractor.ID = contractor.ID || contractor.ContractorID || contractor.id || row[0];
    contractor.Name = contractor.Name || contractor.FullName || contractor.name || '';
    contractor.Category = contractor.Category || contractor.ServiceCategory || contractor.category || '';
    contractor.Location = contractor.Location || contractor.Island || contractor.location || '';
    contractor.Rating = contractor.Rating || contractor.AvgRating || 0;
    contractor.JobsCompleted = contractor.JobsCompleted || contractor.Jobs || contractor.CompletedJobs || 0;
    contractor.Verified = contractor.Verified || '';
    contractor.Experience = contractor.Experience || '';
    contractor.Bio = contractor.Bio || '';
    contractor.BusinessName = contractor.BusinessName || '';
    contractor.Services = contractor.Services || contractor.Category || '';

    // Apply filters with partial matching
    let include = true;
    if (params.category && !matchesFilter(contractor.Category, params.category)) include = false;
    if (params.location && !matchesFilter(contractor.Location, params.location)) include = false;
    if (params.verified === 'true' && contractor.Verified !== 'Verified') include = false;
    if (params.search) {
      const search = params.search.toLowerCase();
      const searchMatch =
        (contractor.Name && contractor.Name.toLowerCase().includes(search)) ||
        (contractor.Category && contractor.Category.toLowerCase().includes(search)) ||
        (contractor.BusinessName && contractor.BusinessName.toLowerCase().includes(search)) ||
        (contractor.Services && contractor.Services.toLowerCase().includes(search));
      if (!searchMatch) include = false;
    }

    if (include) contractors.push(contractor);
  }

  return {success: true, contractors: contractors, count: contractors.length};
}

/**
 * Get jobs with optional filters
 */
function getJobs(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Jobs');

  if (!sheet) return {success: false, error: 'Sheet not found'};

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const jobs = [];

  for (let i = 1; i < data.length; i++) {
    const job = {};
    headers.forEach((header, index) => {
      job[header] = data[i][index];
    });

    // Apply filters
    let include = true;
    if (params.status && job.Status !== params.status) include = false;
    if (params.category && job.Category !== params.category) include = false;
    if (params.location && job.Location !== params.location) include = false;

    if (include) jobs.push(job);
  }

  return {success: true, jobs: jobs};
}

/**
 * Get platform statistics
 */
function getStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  return {
    success: true,
    stats: {
      totalContractors: getSheetRowCount(ss, 'Contractors'),
      totalCustomers: getSheetRowCount(ss, 'Customers'),
      totalJobs: getSheetRowCount(ss, 'Jobs'),
      openJobs: countByStatus(ss, 'Jobs', 11, 'Open'),
      completedJobs: countByStatus(ss, 'Jobs', 11, 'Completed')
    }
  };
}

/**
 * Get live category statistics for homepage
 * Returns contractor counts by category
 */
function getCategoryStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Contractors');

  if (!sheet) return {success: false, error: 'Sheet not found'};

  const data = sheet.getDataRange().getValues();
  const categoryIndex = data[0].indexOf('Category');
  const statusIndex = data[0].indexOf('Status');
  const verifiedIndex = data[0].indexOf('Verified');

  const categoryCounts = {};
  const verifiedCounts = {};

  for (let i = 1; i < data.length; i++) {
    const category = data[i][categoryIndex];
    const status = data[i][statusIndex];
    const verified = data[i][verifiedIndex];

    if (category && status === 'Active') {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      if (verified === 'Verified') {
        verifiedCounts[category] = (verifiedCounts[category] || 0) + 1;
      }
    }
  }

  return {
    success: true,
    categories: categoryCounts,
    verifiedByCategory: verifiedCounts,
    totalContractors: data.length - 1,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Get all live statistics for real-time dashboard
 */
function getLiveStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get contractor stats by category
  const contractorsSheet = ss.getSheetByName('Contractors');
  const jobsSheet = ss.getSheetByName('Jobs');
  const customersSheet = ss.getSheetByName('Customers');

  const categoryStats = {};
  const locationStats = {};

  if (contractorsSheet) {
    const contractorData = contractorsSheet.getDataRange().getValues();
    const catIndex = contractorData[0].indexOf('Category');
    const locIndex = contractorData[0].indexOf('Location');
    const statusIndex = contractorData[0].indexOf('Status');
    const verifiedIndex = contractorData[0].indexOf('Verified');
    const ratingIndex = contractorData[0].indexOf('Rating');

    for (let i = 1; i < contractorData.length; i++) {
      const category = contractorData[i][catIndex];
      const location = contractorData[i][locIndex];
      const status = contractorData[i][statusIndex];
      const verified = contractorData[i][verifiedIndex];

      if (status === 'Active') {
        if (!categoryStats[category]) {
          categoryStats[category] = { total: 0, verified: 0, avgRating: 0, ratings: [] };
        }
        categoryStats[category].total++;
        if (verified === 'Verified') categoryStats[category].verified++;
        if (contractorData[i][ratingIndex]) {
          categoryStats[category].ratings.push(parseFloat(contractorData[i][ratingIndex]) || 0);
        }

        locationStats[location] = (locationStats[location] || 0) + 1;
      }
    }

    // Calculate average ratings
    for (const cat in categoryStats) {
      const ratings = categoryStats[cat].ratings;
      if (ratings.length > 0) {
        categoryStats[cat].avgRating = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
      }
      delete categoryStats[cat].ratings;
    }
  }

  // Get job stats
  let openJobs = 0, completedJobs = 0, totalJobValue = 0;
  if (jobsSheet) {
    const jobData = jobsSheet.getDataRange().getValues();
    const statusIdx = jobData[0].indexOf('Status');
    const budgetIdx = jobData[0].indexOf('Budget');

    for (let i = 1; i < jobData.length; i++) {
      if (jobData[i][statusIdx] === 'Open') openJobs++;
      if (jobData[i][statusIdx] === 'Completed') {
        completedJobs++;
        totalJobValue += parseFloat(jobData[i][budgetIdx]) || 0;
      }
    }
  }

  return {
    success: true,
    contractors: {
      total: contractorsSheet ? contractorsSheet.getLastRow() - 1 : 0,
      byCategory: categoryStats,
      byLocation: locationStats
    },
    customers: {
      total: customersSheet ? customersSheet.getLastRow() - 1 : 0
    },
    jobs: {
      total: jobsSheet ? jobsSheet.getLastRow() - 1 : 0,
      open: openJobs,
      completed: completedJobs,
      totalValue: totalJobValue.toFixed(2)
    },
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Create a new job
 */
function createJob(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Jobs');

  if (!sheet) return {success: false, error: 'Sheet not found'};

  const jobId = generateUniqueId('JOB');
  const now = new Date();

  sheet.appendRow([
    jobId,
    data.customerId,
    data.customerName,
    data.customerEmail,
    data.customerPhone,
    data.title,
    data.description,
    data.category,
    data.location,
    data.budget,
    data.urgency || 'Medium',
    'Open',
    now,
    '',
    0,
    ''
  ]);

  return {success: true, jobId: jobId, message: 'Job created successfully'};
}

/**
 * Submit a quote
 */
function submitQuote(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Quotes');

  if (!sheet) return {success: false, error: 'Sheet not found'};

  const quoteId = generateUniqueId('QUOTE');
  const now = new Date();

  sheet.appendRow([
    quoteId,
    data.jobId,
    data.contractorId,
    data.contractorName,
    data.amount,
    data.message,
    data.timeline,
    'Pending',
    now
  ]);

  // Increment job quotes count
  incrementJobQuotes(data.jobId);

  return {success: true, quoteId: quoteId, message: 'Quote submitted successfully'};
}

/**
 * Register a new contractor
 */
function registerContractor(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Contractors');

  if (!sheet) return {success: false, error: 'Sheet not found'};

  // Validate required fields
  if (!data.name || !data.email || !data.category) {
    return {success: false, error: 'Name, email, and category are required'};
  }

  // Validate email format
  if (!isValidEmail(data.email)) {
    return {success: false, error: 'Please enter a valid email address'};
  }

  // Check for duplicate email
  const existingData = sheet.getDataRange().getValues();
  const emailIdx = existingData[0].indexOf('Email');
  for (let i = 1; i < existingData.length; i++) {
    if (String(existingData[i][emailIdx]).toLowerCase().trim() === data.email.toLowerCase().trim()) {
      return {success: false, error: 'An account with this email already exists'};
    }
  }

  const contractorId = generateUniqueId('CONT');
  const now = new Date();

  sheet.appendRow([
    contractorId,
    sanitizeString(data.name, 100),
    data.email.toLowerCase().trim(),
    data.phone || '',
    data.category,
    data.location || '',
    0,  // Rating
    0,  // Jobs
    0,  // Earnings
    'Active',
    'Pending',
    now,
    sanitizeString(data.businessName || '', 150),
    data.experience || '',
    sanitizeString(data.bio || '', 2000),
    '',  // VerifiedAt
    '',  // VerifiedBy
    data.password || ''  // Password
  ]);

  return {success: true, contractorId: contractorId, message: 'Contractor registered successfully'};
}

/**
 * Register a new customer
 */
function registerCustomer(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Customers');

  if (!sheet) return {success: false, error: 'Sheet not found'};

  // Validate required fields
  if (!data.name || !data.email) {
    return {success: false, error: 'Name and email are required'};
  }

  // Validate email format
  if (!isValidEmail(data.email)) {
    return {success: false, error: 'Please enter a valid email address'};
  }

  // Check for duplicate email
  const existingData = sheet.getDataRange().getValues();
  const emailIdx = existingData[0].indexOf('Email');
  for (let i = 1; i < existingData.length; i++) {
    if (String(existingData[i][emailIdx]).toLowerCase().trim() === data.email.toLowerCase().trim()) {
      return {success: false, error: 'An account with this email already exists'};
    }
  }

  const customerId = generateUniqueId('CUST');
  const now = new Date();

  sheet.appendRow([
    customerId,
    sanitizeString(data.name, 100),
    data.email.toLowerCase().trim(),
    data.phone || '',
    data.location || '',
    'Active',
    now,
    0,  // TotalJobs
    0,  // TotalSpent
    data.password || ''  // Password
  ]);

  return {success: true, customerId: customerId, message: 'Customer registered successfully'};
}

// ============================================
// USER AUTHENTICATION
// ============================================

/**
 * Login user by email and password
 * Checks both Contractors and Customers sheets
 */
function loginUser(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const email = (data.email || '').toLowerCase().trim();
  const password = data.password || '';

  if (!email) {
    return { success: false, error: 'Email is required' };
  }

  // Check Contractors sheet first
  const contractorsSheet = ss.getSheetByName('Contractors');
  if (contractorsSheet) {
    const contractorsData = contractorsSheet.getDataRange().getValues();
    const headers = contractorsData[0];
    const passwordIdx = headers.indexOf('Password');

    for (let i = 1; i < contractorsData.length; i++) {
      const rowEmail = (contractorsData[i][headers.indexOf('Email')] || '').toLowerCase().trim();
      if (rowEmail === email) {
        // Check password if it exists in the sheet
        const storedPassword = passwordIdx >= 0 ? (contractorsData[i][passwordIdx] || '') : '';
        if (storedPassword && password !== storedPassword) {
          return { success: false, error: 'Incorrect password' };
        }

        // Found contractor
        const user = {
          id: contractorsData[i][headers.indexOf('ID')],
          name: contractorsData[i][headers.indexOf('Name')],
          email: rowEmail,
          phone: contractorsData[i][headers.indexOf('Phone')],
          category: contractorsData[i][headers.indexOf('Category')],
          location: contractorsData[i][headers.indexOf('Location')],
          rating: contractorsData[i][headers.indexOf('Rating')] || 0,
          businessName: contractorsData[i][headers.indexOf('BusinessName')] || '',
          verified: contractorsData[i][headers.indexOf('Verified')] || 'Pending',
          type: 'contractor'
        };

        return {
          success: true,
          user: user,
          message: 'Login successful'
        };
      }
    }
  }

  // Check Customers sheet
  const customersSheet = ss.getSheetByName('Customers');
  if (customersSheet) {
    const customersData = customersSheet.getDataRange().getValues();
    const headers = customersData[0];
    const passwordIdx = headers.indexOf('Password');

    for (let i = 1; i < customersData.length; i++) {
      const rowEmail = (customersData[i][headers.indexOf('Email')] || '').toLowerCase().trim();
      if (rowEmail === email) {
        // Check password if it exists in the sheet
        const storedPassword = passwordIdx >= 0 ? (customersData[i][passwordIdx] || '') : '';
        if (storedPassword && password !== storedPassword) {
          return { success: false, error: 'Incorrect password' };
        }

        // Found customer
        const user = {
          id: customersData[i][headers.indexOf('CustomerID')],
          name: customersData[i][headers.indexOf('Name')],
          email: rowEmail,
          phone: customersData[i][headers.indexOf('Phone')],
          location: customersData[i][headers.indexOf('Location')],
          type: 'customer'
        };

        return {
          success: true,
          user: user,
          message: 'Login successful'
        };
      }
    }
  }

  // User not found
  return {
    success: false,
    error: 'No account found with this email. Please sign up first.'
  };
}

/**
 * Google Authentication - Login or Register with Google
 * Creates new account if user doesn't exist
 */
function googleAuth(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const email = (data.email || '').toLowerCase().trim();
  const name = data.name || '';
  const googleId = data.googleId || '';
  const userType = data.userType || 'customer';

  if (!email) {
    return { success: false, error: 'Email is required' };
  }

  // Check if user already exists (try login first)
  // Check Contractors sheet
  const contractorsSheet = ss.getSheetByName('Contractors');
  if (contractorsSheet) {
    const contractorsData = contractorsSheet.getDataRange().getValues();
    const headers = contractorsData[0];

    for (let i = 1; i < contractorsData.length; i++) {
      const rowEmail = (contractorsData[i][headers.indexOf('Email')] || '').toLowerCase().trim();
      if (rowEmail === email) {
        // Found existing contractor
        return {
          success: true,
          user: {
            id: contractorsData[i][headers.indexOf('ID')],
            name: contractorsData[i][headers.indexOf('Name')],
            email: rowEmail,
            phone: contractorsData[i][headers.indexOf('Phone')],
            category: contractorsData[i][headers.indexOf('Category')],
            location: contractorsData[i][headers.indexOf('Location')],
            rating: contractorsData[i][headers.indexOf('Rating')] || 0,
            businessName: contractorsData[i][headers.indexOf('BusinessName')] || '',
            verified: contractorsData[i][headers.indexOf('Verified')] || 'Pending',
            type: 'contractor'
          },
          message: 'Login successful'
        };
      }
    }
  }

  // Check Customers sheet
  const customersSheet = ss.getSheetByName('Customers');
  if (customersSheet) {
    const customersData = customersSheet.getDataRange().getValues();
    const headers = customersData[0];

    for (let i = 1; i < customersData.length; i++) {
      const rowEmail = (customersData[i][headers.indexOf('Email')] || '').toLowerCase().trim();
      if (rowEmail === email) {
        // Found existing customer
        return {
          success: true,
          user: {
            id: customersData[i][headers.indexOf('CustomerID')],
            name: customersData[i][headers.indexOf('Name')],
            email: rowEmail,
            phone: customersData[i][headers.indexOf('Phone')],
            location: customersData[i][headers.indexOf('Location')],
            type: 'customer'
          },
          message: 'Login successful'
        };
      }
    }
  }

  // User not found - create new account based on userType
  const now = new Date();

  if (userType === 'contractor') {
    // Create new contractor
    const contractorId = generateUniqueId('PRO');
    const sheet = ss.getSheetByName('Contractors');

    if (!sheet) {
      return { success: false, error: 'Contractors sheet not found' };
    }

    sheet.appendRow([
      contractorId,
      name,
      email,
      '',                    // Phone
      'General',             // Category
      '',                    // BusinessName
      '',                    // Location
      '',                    // Description
      '',                    // Skills
      5.0,                   // Rating
      0,                     // ReviewCount
      0,                     // CompletedJobs
      'active',              // Status
      'Pending',             // Verified
      '',                    // ProfileImage
      '',                    // Portfolio
      now,                   // JoinDate
      '',                    // Password (not needed for Google auth)
      googleId               // GoogleID
    ]);

    return {
      success: true,
      user: {
        id: contractorId,
        name: name,
        email: email,
        phone: '',
        category: 'General',
        location: '',
        rating: 5.0,
        businessName: '',
        verified: 'Pending',
        type: 'contractor'
      },
      message: 'Account created successfully'
    };
  } else {
    // Create new customer
    const customerId = generateUniqueId('CUST');
    const sheet = ss.getSheetByName('Customers');

    if (!sheet) {
      return { success: false, error: 'Customers sheet not found' };
    }

    sheet.appendRow([
      customerId,
      name,
      email,
      '',                    // Phone
      '',                    // Location
      'Active',              // Status
      now,                   // JoinDate
      0,                     // TotalJobs
      0,                     // TotalSpent
      '',                    // Password (not needed for Google auth)
      googleId               // GoogleID
    ]);

    return {
      success: true,
      user: {
        id: customerId,
        name: name,
        email: email,
        phone: '',
        location: '',
        type: 'customer'
      },
      message: 'Account created successfully'
    };
  }
}

// ============================================
// PAYMENT PROCESSING FUNCTIONS
// ============================================

/**
 * Setup Payout Settings sheet if it doesn't exist
 */
function setupPayoutSettingsSheet(ss) {
  let sheet = ss.getSheetByName('PayoutSettings');
  if (!sheet) {
    sheet = ss.insertSheet('PayoutSettings');
  }

  const headers = [
    'ContractorID', 'Method', 'SquareEmail', 'PayPalEmail',
    'BankName', 'AccountName', 'AccountNumber', 'RoutingNumber',
    'UpdatedAt'
  ];

  // Check if headers exist
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeaderRow(sheet, headers.length);
  }

  return sheet;
}

/**
 * Process a payment for a completed job
 * Called when customer pays for a job
 */
function processPayment(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const paymentsSheet = ss.getSheetByName('Payments');
  const jobsSheet = ss.getSheetByName('Jobs');
  const quotesSheet = ss.getSheetByName('Quotes');

  if (!paymentsSheet) return {success: false, error: 'Payments sheet not found'};

  const paymentId = generateUniqueId('PAY');
  const now = new Date();

  // Calculate payment breakdown
  const totalAmount = parseFloat(data.amount) || 0;
  const payment = calculatePayment(totalAmount);

  // Record payment
  paymentsSheet.appendRow([
    paymentId,
    data.jobId,
    data.contractorId,
    payment.totalAmount,
    payment.platformFee,
    payment.contractorPayout,
    data.squarePaymentId ? 'Completed' : 'Pending',
    now,
    data.squarePaymentId || '',  // Square payment reference
    data.customerId || ''
  ]);

  // Update job status
  if (jobsSheet) {
    const jobsData = jobsSheet.getDataRange().getValues();
    for (let i = 1; i < jobsData.length; i++) {
      if (jobsData[i][0] === data.jobId) {
        jobsSheet.getRange(i + 1, 12).setValue('In Progress');  // Status column
        jobsSheet.getRange(i + 1, 14).setValue(data.contractorId);  // AssignedContractor
        break;
      }
    }
  }

  // Update quote status to Accepted
  if (quotesSheet && data.quoteId) {
    const quotesData = quotesSheet.getDataRange().getValues();
    for (let i = 1; i < quotesData.length; i++) {
      if (quotesData[i][0] === data.quoteId) {
        quotesSheet.getRange(i + 1, 8).setValue('Accepted');  // Status column
        break;
      }
    }
  }

  // Update customer total spent
  if (data.customerId) {
    updateCustomerSpent(data.customerId, totalAmount);
  }

  return {
    success: true,
    paymentId: paymentId,
    breakdown: payment,
    message: 'Payment processed successfully'
  };
}

/**
 * Get quotes for a specific customer
 */
function getCustomerQuotes(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const quotesSheet = ss.getSheetByName('Quotes');
  const jobsSheet = ss.getSheetByName('Jobs');

  if (!quotesSheet || !jobsSheet) return {success: false, error: 'Sheet not found'};

  // Get customer's jobs first
  const jobsData = jobsSheet.getDataRange().getValues();
  const jobHeaders = jobsData[0];
  const customerJobs = {};

  for (let i = 1; i < jobsData.length; i++) {
    if (jobsData[i][1] === params.customerId) {  // CustomerID column
      const job = {};
      jobHeaders.forEach((header, idx) => {
        job[header] = jobsData[i][idx];
      });
      customerJobs[jobsData[i][0]] = job;  // JobID as key
    }
  }

  // Get quotes for those jobs
  const quotesData = quotesSheet.getDataRange().getValues();
  const quoteHeaders = quotesData[0];
  const quotes = [];

  for (let i = 1; i < quotesData.length; i++) {
    const jobId = quotesData[i][1];  // JobID column
    if (customerJobs[jobId]) {
      const quote = {};
      quoteHeaders.forEach((header, idx) => {
        quote[header] = quotesData[i][idx];
      });
      quote.JobTitle = customerJobs[jobId].Title;
      quote.JobCategory = customerJobs[jobId].Category;
      quotes.push(quote);
    }
  }

  return {success: true, quotes: quotes};
}

/**
 * Get quotes for a specific job
 */
function getJobQuotes(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const quotesSheet = ss.getSheetByName('Quotes');

  if (!quotesSheet) return {success: false, error: 'Sheet not found'};

  const data = quotesSheet.getDataRange().getValues();
  const headers = data[0];
  const quotes = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === params.jobId) {  // JobID column
      const quote = {};
      headers.forEach((header, idx) => {
        quote[header] = data[i][idx];
      });
      quotes.push(quote);
    }
  }

  return {success: true, quotes: quotes};
}

/**
 * Decline a quote
 */
function declineQuote(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const quotesSheet = ss.getSheetByName('Quotes');

  if (!quotesSheet) return {success: false, error: 'Sheet not found'};

  const quotesData = quotesSheet.getDataRange().getValues();

  for (let i = 1; i < quotesData.length; i++) {
    if (quotesData[i][0] === data.quoteId) {
      quotesSheet.getRange(i + 1, 8).setValue('Rejected');  // Status column
      return {success: true, message: 'Quote declined'};
    }
  }

  return {success: false, error: 'Quote not found'};
}

/**
 * Accept a quote (without payment - just status update)
 */
function acceptQuote(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const quotesSheet = ss.getSheetByName('Quotes');
  const jobsSheet = ss.getSheetByName('Jobs');

  if (!quotesSheet || !jobsSheet) return {success: false, error: 'Sheet not found'};

  // Update quote status
  const quotesData = quotesSheet.getDataRange().getValues();
  let quoteDetails = null;

  for (let i = 1; i < quotesData.length; i++) {
    if (quotesData[i][0] === data.quoteId) {
      quotesSheet.getRange(i + 1, 8).setValue('Accepted');
      quoteDetails = {
        jobId: quotesData[i][1],
        contractorId: quotesData[i][2],
        amount: quotesData[i][4]
      };
      break;
    }
  }

  if (!quoteDetails) return {success: false, error: 'Quote not found'};

  // Update job status and assign contractor
  const jobsData = jobsSheet.getDataRange().getValues();
  for (let i = 1; i < jobsData.length; i++) {
    if (jobsData[i][0] === quoteDetails.jobId) {
      jobsSheet.getRange(i + 1, 12).setValue('In Progress');
      jobsSheet.getRange(i + 1, 14).setValue(quoteDetails.contractorId);
      break;
    }
  }

  // Reject other quotes for this job
  for (let i = 1; i < quotesData.length; i++) {
    if (quotesData[i][1] === quoteDetails.jobId && quotesData[i][0] !== data.quoteId) {
      quotesSheet.getRange(i + 1, 8).setValue('Rejected');
    }
  }

  return {success: true, message: 'Quote accepted', quoteDetails: quoteDetails};
}

/**
 * Save contractor payout settings
 */
function updatePayoutSettings(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = setupPayoutSettingsSheet(ss);

  const now = new Date();
  const sheetData = sheet.getDataRange().getValues();

  // Check if contractor already has settings
  let existingRow = -1;
  for (let i = 1; i < sheetData.length; i++) {
    if (sheetData[i][0] === data.contractorId) {
      existingRow = i + 1;
      break;
    }
  }

  const rowData = [
    data.contractorId,
    data.method,
    data.squareEmail || '',
    data.paypalEmail || '',
    data.bankName || '',
    data.accountName || '',
    data.accountNumber || '',
    data.routingNumber || '',
    now
  ];

  if (existingRow > 0) {
    // Update existing row
    sheet.getRange(existingRow, 1, 1, rowData.length).setValues([rowData]);
  } else {
    // Add new row
    sheet.appendRow(rowData);
  }

  return {success: true, message: 'Payout settings saved successfully'};
}

/**
 * Get contractor payout settings
 */
function getPayoutSettings(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('PayoutSettings');

  if (!sheet) {
    return {success: true, settings: null};
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === params.contractorId) {
      const settings = {};
      headers.forEach((header, idx) => {
        // Convert header names to camelCase
        const key = header.charAt(0).toLowerCase() + header.slice(1);
        settings[key] = data[i][idx];
      });
      return {success: true, settings: settings};
    }
  }

  return {success: true, settings: null};
}

/**
 * Complete a job and initiate payout
 */
function completeJob(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const jobsSheet = ss.getSheetByName('Jobs');
  const paymentsSheet = ss.getSheetByName('Payments');

  if (!jobsSheet) return {success: false, error: 'Jobs sheet not found'};

  const now = new Date();
  const jobsData = jobsSheet.getDataRange().getValues();

  for (let i = 1; i < jobsData.length; i++) {
    if (jobsData[i][0] === data.jobId) {
      // Update job status to Completed
      jobsSheet.getRange(i + 1, 12).setValue('Completed');  // Status
      jobsSheet.getRange(i + 1, 16).setValue(now);  // CompletedAt

      // Update contractor stats
      updateContractorStats(data.contractorId, data.amount * CONFIG.CONTRACTOR_PAYOUT_PERCENT);

      // Update payment status if exists
      if (paymentsSheet) {
        const paymentsData = paymentsSheet.getDataRange().getValues();
        for (let j = 1; j < paymentsData.length; j++) {
          if (paymentsData[j][1] === data.jobId) {
            paymentsSheet.getRange(j + 1, 7).setValue('Completed');  // Status
            break;
          }
        }
      }

      return {success: true, message: 'Job completed successfully'};
    }
  }

  return {success: false, error: 'Job not found'};
}

// ============================================
// HK COINS FUNCTIONS
// ============================================

/**
 * Get customer's HK Coin balance
 */
function getCoinBalance(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Customers');

  if (!sheet) return {success: false, error: 'Customers sheet not found'};

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const balanceIdx = headers.indexOf('HKCoins');

  // If HKCoins column doesn't exist, create it
  if (balanceIdx === -1) {
    const nextCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, nextCol).setValue('HKCoins');
    sheet.getRange(1, nextCol).setBackground('#ffd700').setFontColor('#1a1a2e').setFontWeight('bold');
    // Initialize all customers with 0 coins
    for (let i = 2; i <= data.length; i++) {
      sheet.getRange(i, nextCol).setValue(0);
    }
    return {success: true, balance: 0};
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === params.customerId) {
      return {success: true, balance: data[i][balanceIdx] || 0};
    }
  }

  return {success: false, error: 'Customer not found', balance: 0};
}

/**
 * Purchase HK Coins
 * Records the purchase and adds coins to customer's balance
 */
function purchaseCoins(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const customersSheet = ss.getSheetByName('Customers');

  if (!customersSheet) return {success: false, error: 'Customers sheet not found'};

  const customersData = customersSheet.getDataRange().getValues();
  const headers = customersData[0];
  let balanceIdx = headers.indexOf('HKCoins');

  // If HKCoins column doesn't exist, create it
  if (balanceIdx === -1) {
    const nextCol = customersSheet.getLastColumn() + 1;
    customersSheet.getRange(1, nextCol).setValue('HKCoins');
    customersSheet.getRange(1, nextCol).setBackground('#ffd700').setFontColor('#1a1a2e').setFontWeight('bold');
    balanceIdx = nextCol - 1;
    // Initialize all customers with 0 coins
    for (let i = 2; i <= customersData.length; i++) {
      customersSheet.getRange(i, nextCol).setValue(0);
    }
  }

  // Find customer and update balance
  for (let i = 1; i < customersData.length; i++) {
    if (customersData[i][0] === data.customerId) {
      const currentBalance = customersData[i][balanceIdx] || 0;
      const newBalance = currentBalance + (data.coins || 0) + (data.bonus || 0);
      customersSheet.getRange(i + 1, balanceIdx + 1).setValue(newBalance);

      // Record the transaction
      recordCoinTransaction(data.customerId, 'purchase', data.coins + data.bonus, data.amount / 100);

      return {
        success: true,
        newBalance: newBalance,
        message: 'Coins purchased successfully'
      };
    }
  }

  return {success: false, error: 'Customer not found'};
}

/**
 * Pay for a job using HK Coins
 */
function payWithCoins(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const customersSheet = ss.getSheetByName('Customers');
  const paymentsSheet = ss.getSheetByName('Payments');
  const jobsSheet = ss.getSheetByName('Jobs');

  if (!customersSheet) return {success: false, error: 'Customers sheet not found'};

  const customersData = customersSheet.getDataRange().getValues();
  const headers = customersData[0];
  const balanceIdx = headers.indexOf('HKCoins');

  if (balanceIdx === -1) {
    return {success: false, error: 'HK Coins not enabled for this account'};
  }

  // Find customer and check balance
  for (let i = 1; i < customersData.length; i++) {
    if (customersData[i][0] === data.customerId) {
      const currentBalance = customersData[i][balanceIdx] || 0;
      const amount = data.amount || 0;

      if (currentBalance < amount) {
        return {success: false, error: 'Insufficient coin balance'};
      }

      // Deduct coins
      const newBalance = currentBalance - amount;
      customersSheet.getRange(i + 1, balanceIdx + 1).setValue(newBalance);

      // Record the transaction
      recordCoinTransaction(data.customerId, 'payment', -amount, amount);

      // Record the payment
      if (paymentsSheet) {
        const paymentId = generateUniqueId('PAY');
        const now = new Date();
        const payment = calculatePayment(amount);

        paymentsSheet.appendRow([
          paymentId,
          data.jobId,
          data.contractorId,
          payment.totalAmount,
          payment.platformFee,
          payment.contractorPayout,
          'Completed',
          now,
          'COIN-' + paymentId,  // Reference as coin payment
          data.customerId
        ]);

        // Update job status
        if (jobsSheet) {
          const jobsData = jobsSheet.getDataRange().getValues();
          for (let j = 1; j < jobsData.length; j++) {
            if (jobsData[j][0] === data.jobId) {
              jobsSheet.getRange(j + 1, 12).setValue('In Progress');
              jobsSheet.getRange(j + 1, 14).setValue(data.contractorId);
              break;
            }
          }
        }

        return {
          success: true,
          newBalance: newBalance,
          transactionId: paymentId,
          message: 'Payment successful'
        };
      }

      return {
        success: true,
        newBalance: newBalance,
        message: 'Coins deducted successfully'
      };
    }
  }

  return {success: false, error: 'Customer not found'};
}

/**
 * Record coin transaction for audit trail
 */
function recordCoinTransaction(customerId, type, coins, usdValue) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('CoinTransactions');

  if (!sheet) {
    sheet = ss.insertSheet('CoinTransactions');
    sheet.getRange(1, 1, 1, 6).setValues([['TransactionID', 'CustomerID', 'Type', 'Coins', 'USDValue', 'Timestamp']]);
    sheet.getRange(1, 1, 1, 6).setBackground('#ffd700').setFontColor('#1a1a2e').setFontWeight('bold');
  }

  const transactionId = generateUniqueId('COIN');
  sheet.appendRow([
    transactionId,
    customerId,
    type,
    coins,
    usdValue,
    new Date()
  ]);

  return transactionId;
}

// ============================================
// MARKETPLACE LISTINGS FUNCTIONS
// ============================================

/**
 * Setup Listings sheet for marketplace
 */
function setupListingsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Listings');

  if (!sheet) {
    sheet = ss.insertSheet('Listings');
  }

  const headers = [
    'ListingID', 'SellerID', 'SellerType', 'SellerName', 'SellerEmail',
    'Title', 'Description', 'Price', 'Category', 'Condition',
    'Location', 'Images', 'Status', 'CreatedAt', 'UpdatedAt', 'Views'
  ];

  // Check if headers exist
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    formatHeaderRow(sheet, headers.length);

    // Set column widths
    sheet.setColumnWidth(1, 150);  // ListingID
    sheet.setColumnWidth(6, 200);  // Title
    sheet.setColumnWidth(7, 300);  // Description
    sheet.setColumnWidth(12, 500); // Images
  }

  return sheet;
}

/**
 * Seed demo listings for testing - RUN THIS MANUALLY FROM SCRIPT EDITOR
 */
function seedDemoListings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Listings');

  if (!sheet) {
    sheet = setupListingsSheet();
  }

  const now = new Date();

  // Demo listings data
  const demoListings = [
    {
      title: 'iPhone 14 Pro Max - Excellent Condition',
      description: 'Selling my iPhone 14 Pro Max 256GB in Deep Purple. Excellent condition, always kept in case with screen protector. Includes original box, charger, and 2 cases. Battery health at 96%. No scratches or dents. Upgrading to iPhone 15.',
      price: 2500,
      category: 'Electronics & Phones',
      condition: 'Like New',
      location: 'Antigua & Barbuda',
      sellerName: 'Marcus Johnson',
      sellerEmail: 'demo1@hiddenkingz.com'
    },
    {
      title: '2019 Toyota Corolla - Low Mileage',
      description: 'Well-maintained 2019 Toyota Corolla LE with only 35,000 miles. Regular service history, new tires, AC blows cold. Clean title, no accidents. Perfect for daily commute. Serious buyers only.',
      price: 45000,
      category: 'Vehicles & Parts',
      condition: 'Good',
      location: 'Jamaica',
      sellerName: 'David Williams',
      sellerEmail: 'demo2@hiddenkingz.com'
    },
    {
      title: 'Samsung 65" 4K Smart TV',
      description: 'Samsung 65 inch Crystal UHD 4K Smart TV. Model UN65TU8000. Bought last year, selling due to relocation. Perfect picture quality, smart features work great. Comes with remote and wall mount bracket.',
      price: 1800,
      category: 'Electronics & Phones',
      condition: 'Good',
      location: 'Trinidad & Tobago',
      sellerName: 'Keisha Brown',
      sellerEmail: 'demo3@hiddenkingz.com'
    },
    {
      title: 'Leather Sofa Set - 3 Piece',
      description: 'Beautiful brown leather sofa set including 3-seater, 2-seater, and single chair. Real leather, very comfortable. Minor wear on armrests but overall great condition. Must pick up.',
      price: 3500,
      category: 'Furniture & Home',
      condition: 'Good',
      location: 'Barbados',
      sellerName: 'Angela Davis',
      sellerEmail: 'demo4@hiddenkingz.com'
    },
    {
      title: 'PlayStation 5 + 5 Games Bundle',
      description: 'PS5 Disc Edition with 2 controllers and 5 games: FIFA 24, Spider-Man 2, God of War Ragnarok, Call of Duty MW3, and GTA V. Everything works perfectly. Includes all original cables.',
      price: 2200,
      category: 'Electronics & Phones',
      condition: 'Like New',
      location: 'St. Lucia',
      sellerName: 'Ryan Thomas',
      sellerEmail: 'demo5@hiddenkingz.com'
    },
    {
      title: 'Baby Crib with Mattress - Like New',
      description: 'Graco convertible crib in white finish with premium mattress. Used for only 6 months. Converts to toddler bed and daybed. No stains or damage. Smoke-free home.',
      price: 800,
      category: 'Baby & Kids',
      condition: 'Like New',
      location: 'Antigua & Barbuda',
      sellerName: 'Tanya Smith',
      sellerEmail: 'demo6@hiddenkingz.com'
    },
    {
      title: 'Mountain Bike - Giant Talon 2',
      description: '2022 Giant Talon 2 mountain bike, size Large. 27.5 inch wheels, hydraulic disc brakes. Great for trails and commuting. Recently serviced with new brake pads.',
      price: 1500,
      category: 'Sports & Outdoors',
      condition: 'Good',
      location: 'Dominican Republic',
      sellerName: 'Carlos Rodriguez',
      sellerEmail: 'demo7@hiddenkingz.com'
    },
    {
      title: 'Designer Handbag - Michael Kors',
      description: 'Authentic Michael Kors Jet Set tote bag in brown signature print. Gently used, no damage. Comes with dust bag. Perfect for work or everyday use.',
      price: 450,
      category: 'Clothing & Accessories',
      condition: 'Like New',
      location: 'Bahamas',
      sellerName: 'Nicole Clarke',
      sellerEmail: 'demo8@hiddenkingz.com'
    },
    {
      title: 'Lawn Mower - Honda Self-Propelled',
      description: 'Honda HRX217 self-propelled lawn mower. Powerful engine, mulching capability. Starts on first pull every time. Blade recently sharpened. Great for medium to large yards.',
      price: 900,
      category: 'Garden & Tools',
      condition: 'Good',
      location: 'Grenada',
      sellerName: 'Patrick Joseph',
      sellerEmail: 'demo9@hiddenkingz.com'
    },
    {
      title: 'FREE - Moving Boxes & Packing Supplies',
      description: 'Giving away about 30 moving boxes of various sizes, bubble wrap, and packing paper. Just finished moving. Must take everything. Pick up only.',
      price: 0,
      category: 'Free Stuff',
      condition: 'Good',
      location: 'St. Kitts & Nevis',
      sellerName: 'Jennifer Lewis',
      sellerEmail: 'demo10@hiddenkingz.com'
    },
    {
      title: 'MacBook Pro 16" M2 Pro',
      description: 'Apple MacBook Pro 16 inch with M2 Pro chip, 16GB RAM, 512GB SSD. Space Gray. AppleCare+ until 2025. Includes original charger and laptop sleeve. Perfect for professionals.',
      price: 6500,
      category: 'Electronics & Phones',
      condition: 'Like New',
      location: 'Puerto Rico',
      sellerName: 'Michael Torres',
      sellerEmail: 'demo11@hiddenkingz.com'
    },
    {
      title: 'Dining Table Set - 6 Chairs',
      description: 'Solid wood dining table with 6 matching chairs. Seats 6-8 people comfortably. Some minor surface scratches on table but chairs are in excellent condition.',
      price: 2000,
      category: 'Furniture & Home',
      condition: 'Good',
      location: 'Trinidad & Tobago',
      sellerName: 'Sharon Baptiste',
      sellerEmail: 'demo12@hiddenkingz.com'
    },
    {
      title: 'Air Jordan 1 Retro High OG - Size 10',
      description: 'Brand new Air Jordan 1 Retro High OG "Chicago" colorway. Size 10 US mens. DS (deadstock), never worn. Comes with original box and extra laces.',
      price: 750,
      category: 'Clothing & Accessories',
      condition: 'New',
      location: 'Jamaica',
      sellerName: 'Andre Campbell',
      sellerEmail: 'demo13@hiddenkingz.com'
    },
    {
      title: 'Honda Generator 3000W',
      description: 'Honda EU3000iS inverter generator. Super quiet operation, 3000 watts. Perfect for hurricane season or camping. Only 50 hours of use. Starts easily.',
      price: 2800,
      category: 'Garden & Tools',
      condition: 'Like New',
      location: 'US Virgin Islands',
      sellerName: 'Robert James',
      sellerEmail: 'demo14@hiddenkingz.com'
    },
    {
      title: 'Kids Bicycle - 20 inch',
      description: 'Boys 20 inch bicycle, blue color. Training wheels included but removable. Great starter bike for kids ages 5-8. Minor scratches but works perfectly.',
      price: 150,
      category: 'Baby & Kids',
      condition: 'Good',
      location: 'Cayman Islands',
      sellerName: 'Lisa Morgan',
      sellerEmail: 'demo15@hiddenkingz.com'
    }
  ];

  // Add each demo listing
  let addedCount = 0;

  for (const listing of demoListings) {
    const listingId = 'LST-DEMO-' + Utilities.getUuid().substring(0, 8).toUpperCase();

    const newRow = [
      listingId,
      'DEMO-SELLER-' + (addedCount + 1),  // SellerID
      'customer',                          // SellerType
      listing.sellerName,                  // SellerName
      listing.sellerEmail,                 // SellerEmail
      listing.title,                       // Title
      listing.description,                 // Description
      listing.price,                       // Price
      listing.category,                    // Category
      listing.condition,                   // Condition
      listing.location,                    // Location
      '[]',                               // Images (empty for demo)
      'active',                           // Status
      now,                                // CreatedAt
      now,                                // UpdatedAt
      Math.floor(Math.random() * 100) + 10 // Random Views
    ];

    sheet.appendRow(newRow);
    addedCount++;
  }

  Logger.log('Successfully added ' + addedCount + ' demo listings!');
  return { success: true, message: 'Added ' + addedCount + ' demo listings' };
}

/**
 * Clear all demo listings - RUN THIS TO REMOVE TEST DATA
 */
function clearDemoListings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Listings');

  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, message: 'No listings to clear' };
  }

  const data = sheet.getDataRange().getValues();
  const rowsToDelete = [];

  // Find demo listings (those with DEMO in ID or seller email)
  for (let i = data.length - 1; i >= 1; i--) {
    const listingId = data[i][0];
    const sellerEmail = data[i][4];
    if (listingId.includes('DEMO') || (sellerEmail && sellerEmail.includes('@hiddenkingz.com'))) {
      rowsToDelete.push(i + 1); // +1 for 1-based indexing
    }
  }

  // Delete rows from bottom to top
  for (const row of rowsToDelete) {
    sheet.deleteRow(row);
  }

  Logger.log('Cleared ' + rowsToDelete.length + ' demo listings');
  return { success: true, message: 'Cleared ' + rowsToDelete.length + ' demo listings' };
}

/**
 * Get marketplace categories with listing counts
 */
function getMarketplaceCategories() {
  const categories = [
    { name: 'Electronics & Phones', icon: 'fa-laptop' },
    { name: 'Vehicles & Parts', icon: 'fa-car' },
    { name: 'Furniture & Home', icon: 'fa-couch' },
    { name: 'Clothing & Accessories', icon: 'fa-tshirt' },
    { name: 'Sports & Outdoors', icon: 'fa-futbol' },
    { name: 'Baby & Kids', icon: 'fa-baby' },
    { name: 'Garden & Tools', icon: 'fa-tools' },
    { name: 'Free Stuff', icon: 'fa-gift' }
  ];

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Listings');

  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, categories: categories.map(c => ({ ...c, count: 0 })) };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const catCol = headers.indexOf('Category');
  const statusCol = headers.indexOf('Status');

  const counts = {};
  categories.forEach(cat => counts[cat.name] = 0);

  for (let i = 1; i < data.length; i++) {
    if (data[i][statusCol] === 'active') {
      const cat = data[i][catCol];
      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
    }
  }

  return {
    success: true,
    categories: categories.map(cat => ({
      ...cat,
      count: counts[cat.name] || 0
    }))
  };
}

/**
 * Get all listings with optional filters
 */
function getListings(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Listings');

  // Auto-create sheet if it doesn't exist
  if (!sheet) {
    sheet = setupListingsSheet();
    return { success: true, listings: [], count: 0 };
  }

  if (sheet.getLastRow() <= 1) {
    return { success: true, listings: [], count: 0 };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  let listings = [];

  // Convert rows to objects
  for (let i = 1; i < data.length; i++) {
    const listing = {};
    headers.forEach((header, index) => {
      listing[header] = data[i][index];
    });

    // Only include active listings
    if (listing.Status !== 'active') continue;

    // Parse images JSON
    try {
      listing.Images = JSON.parse(listing.Images || '[]');
    } catch (e) {
      listing.Images = [];
    }

    listings.push(listing);
  }

  // Apply filters
  if (params.category && params.category !== 'all') {
    listings = listings.filter(l => l.Category === params.category);
  }

  if (params.condition && params.condition !== 'all') {
    listings = listings.filter(l => l.Condition === params.condition);
  }

  if (params.location && params.location !== 'all') {
    listings = listings.filter(l => l.Location && l.Location.toLowerCase().includes(params.location.toLowerCase()));
  }

  if (params.minPrice !== undefined && params.minPrice !== '') {
    const min = parseFloat(params.minPrice);
    listings = listings.filter(l => l.Price >= min);
  }

  if (params.maxPrice !== undefined && params.maxPrice !== '') {
    const max = parseFloat(params.maxPrice);
    listings = listings.filter(l => l.Price <= max);
  }

  if (params.search) {
    const search = params.search.toLowerCase();
    listings = listings.filter(l =>
      (l.Title && l.Title.toLowerCase().includes(search)) ||
      (l.Description && l.Description.toLowerCase().includes(search))
    );
  }

  // Sort by newest first (default)
  listings.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));

  return {
    success: true,
    listings: listings,
    count: listings.length
  };
}

/**
 * Get a single listing by ID
 */
function getListing(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Listings');

  if (!sheet) {
    return { success: false, error: 'Listings sheet not found' };
  }

  const listingId = params.listingId;
  if (!listingId) {
    return { success: false, error: 'Listing ID required' };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === listingId) {
      const listing = {};
      headers.forEach((header, index) => {
        listing[header] = data[i][index];
      });

      // Parse images
      try {
        listing.Images = JSON.parse(listing.Images || '[]');
      } catch (e) {
        listing.Images = [];
      }

      // Increment view count
      const viewsCol = headers.indexOf('Views');
      const currentViews = data[i][viewsCol] || 0;
      sheet.getRange(i + 1, viewsCol + 1).setValue(currentViews + 1);
      listing.Views = currentViews + 1;

      return { success: true, listing: listing };
    }
  }

  return { success: false, error: 'Listing not found' };
}

/**
 * Get listings for a specific seller
 */
function getMyListings(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Listings');

  if (!sheet) {
    return { success: true, listings: [] };
  }

  const sellerId = params.sellerId;
  if (!sellerId) {
    return { success: false, error: 'Seller ID required' };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const listings = [];

  // Get column indices dynamically
  const sellerIdCol = headers.indexOf('SellerID');
  const statusCol = headers.indexOf('Status');

  for (let i = 1; i < data.length; i++) {
    if (data[i][sellerIdCol] === sellerId && data[i][statusCol] !== 'deleted') {
      const listing = {};
      headers.forEach((header, index) => {
        listing[header] = data[i][index];
      });

      try {
        listing.Images = JSON.parse(listing.Images || '[]');
      } catch (e) {
        listing.Images = [];
      }

      listings.push(listing);
    }
  }

  // Sort by newest first
  listings.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));

  return { success: true, listings: listings };
}

/**
 * Create a new listing
 */
function createListing(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Listings');

    // Auto-create sheet if needed
    if (!sheet) {
      sheet = setupListingsSheet();
    }

    // Validate required fields
    if (!data.title || data.price === undefined || !data.category) {
      return { success: false, error: 'Missing required fields (title, price, category)' };
    }

    // Validate title length
    if (String(data.title).trim().length < 3) {
      return { success: false, error: 'Title must be at least 3 characters' };
    }

    // Validate price
    if (!isValidPrice(data.price)) {
      return { success: false, error: 'Please enter a valid price' };
    }

    // Validate seller info
    if (!data.sellerId) {
      return { success: false, error: 'Seller ID is required' };
    }

    // Generate unique listing ID
    const listingId = generateUniqueId('LST');
    const now = new Date();

    // Process images - limit to 5
    let images = data.images || [];
    if (images.length > 5) {
      images = images.slice(0, 5);
    }

    const newRow = [
      listingId,
      data.sellerId,
      data.sellerType || 'customer',
      sanitizeString(data.sellerName || '', 100),
      data.sellerEmail || '',
      sanitizeString(data.title, 100),
      sanitizeString(data.description || '', 2000),
      parseFloat(data.price) || 0,
      data.category,
      data.condition || 'Good',
      data.location || '',
      JSON.stringify(images),
      'active',
      now,
      now,
      0  // views
    ];

    sheet.appendRow(newRow);

    return {
      success: true,
      listingId: listingId,
      message: 'Listing created successfully!'
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Update an existing listing
 */
function updateListing(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Listings');

    if (!sheet) {
      return { success: false, error: 'Listings sheet not found' };
    }

    const listingId = data.listingId;
    const userId = data.userId;

    if (!listingId) {
      return { success: false, error: 'Listing ID required' };
    }

    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    // Validate price if provided
    if (data.price !== undefined && !isValidPrice(data.price)) {
      return { success: false, error: 'Please enter a valid price' };
    }

    const sheetData = sheet.getDataRange().getValues();
    const headers = sheetData[0];

    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][0] === listingId) {
        // Check ownership
        const sellerIdCol = headers.indexOf('SellerID');
        if (sheetData[i][sellerIdCol] !== userId) {
          return { success: false, error: 'Unauthorized: You can only edit your own listings' };
        }

        // Update fields with sanitization
        const updateFields = {
          'Title': data.title ? sanitizeString(data.title, 100) : undefined,
          'Description': data.description !== undefined ? sanitizeString(data.description, 2000) : undefined,
          'Price': data.price !== undefined ? parseFloat(data.price) : undefined,
          'Category': data.category,
          'Condition': data.condition,
          'Location': data.location,
          'Status': data.status,
          'Images': data.images ? JSON.stringify(data.images) : undefined
        };

        for (const [field, value] of Object.entries(updateFields)) {
          if (value !== undefined) {
            const colIndex = headers.indexOf(field);
            if (colIndex !== -1) {
              sheet.getRange(i + 1, colIndex + 1).setValue(value);
            }
          }
        }

        // Update timestamp
        const updatedAtCol = headers.indexOf('UpdatedAt');
        sheet.getRange(i + 1, updatedAtCol + 1).setValue(new Date());

        return { success: true, message: 'Listing updated successfully' };
      }
    }

    return { success: false, error: 'Listing not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Admin delete listing (bypasses ownership check)
 */
function adminDeleteListing(data) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('Listings');

    if (!sheet) {
      return { success: false, error: 'Listings sheet not found' };
    }

    const listingId = data.listingId;
    if (!listingId) {
      return { success: false, error: 'Listing ID required' };
    }

    const sheetData = sheet.getDataRange().getValues();
    const headers = sheetData[0];
    const statusCol = headers.indexOf('Status');
    const updatedAtCol = headers.indexOf('UpdatedAt');

    for (let i = 1; i < sheetData.length; i++) {
      if (sheetData[i][0] === listingId) {
        // Admin can delete any listing
        sheet.getRange(i + 1, statusCol + 1).setValue('deleted');
        sheet.getRange(i + 1, updatedAtCol + 1).setValue(new Date());

        return { success: true, message: 'Listing removed by admin' };
      }
    }

    return { success: false, error: 'Listing not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Mark a listing as sold
 */
function markListingAsSold(data) {
  data.status = 'sold';
  return updateListing(data);
}

/**
 * Delete (soft delete) a listing
 */
function deleteListing(data) {
  data.status = 'deleted';
  return updateListing(data);
}

/**
 * Send message to seller about a listing
 */
function sendListingMessage(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get listing info
  const listingsSheet = ss.getSheetByName('Listings');
  if (!listingsSheet) {
    return { success: false, error: 'Listings not found' };
  }

  const listingsData = listingsSheet.getDataRange().getValues();
  const listingsHeaders = listingsData[0];
  let listing = null;

  for (let i = 1; i < listingsData.length; i++) {
    if (listingsData[i][0] === data.listingId) {
      listing = {};
      listingsHeaders.forEach((header, index) => {
        listing[header] = listingsData[i][index];
      });
      break;
    }
  }

  if (!listing) {
    return { success: false, error: 'Listing not found' };
  }

  // Create message using existing messages system
  const messagesSheet = ss.getSheetByName('Messages');
  if (!messagesSheet) {
    return { success: false, error: 'Messages sheet not found' };
  }

  const messageId = generateUniqueId('MSG');
  const now = new Date();

  // Format message with listing context
  const messageText = `[Marketplace Inquiry - ${listing.Title}]\n\n${data.message}`;

  messagesSheet.appendRow([
    messageId,
    data.fromId,
    listing.SellerID,
    data.listingId,  // Use listing ID as reference
    messageText,
    'false',
    now
  ]);

  return {
    success: true,
    messageId: messageId,
    message: 'Message sent to seller!'
  };
}

/**
 * Get marketplace statistics
 */
function getMarketplaceStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Listings');

  if (!sheet || sheet.getLastRow() <= 1) {
    return {
      success: true,
      stats: {
        totalListings: 0,
        activeListings: 0,
        soldListings: 0,
        totalViews: 0
      }
    };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const statusCol = headers.indexOf('Status');
  const viewsCol = headers.indexOf('Views');

  let active = 0, sold = 0, views = 0;

  for (let i = 1; i < data.length; i++) {
    const status = data[i][statusCol];
    if (status === 'active') active++;
    else if (status === 'sold') sold++;
    views += (data[i][viewsCol] || 0);
  }

  return {
    success: true,
    stats: {
      totalListings: data.length - 1,
      activeListings: active,
      soldListings: sold,
      totalViews: views
    }
  };
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Get all contractors for admin management
 */
function getAdminContractors(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Contractors');

  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, contractors: [] };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const contractors = [];

  const statusFilter = params?.status || '';
  const verificationFilter = params?.verification || '';

  for (let i = 1; i < data.length; i++) {
    const contractor = {};
    headers.forEach((header, index) => {
      contractor[header] = data[i][index];
    });

    // Apply filters
    if (statusFilter && contractor.Status !== statusFilter) continue;
    if (verificationFilter && contractor.VerificationStatus !== verificationFilter) continue;

    // Remove sensitive data
    delete contractor.Password;

    contractors.push(contractor);
  }

  return { success: true, contractors: contractors };
}

/**
 * Get verification queue - contractors pending verification
 */
function getVerificationQueue() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Contractors');

  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, queue: [], counts: { pending: 0, approved: 0, rejected: 0 } };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const queue = [];
  let pending = 0, approved = 0, rejected = 0;

  const verificationCol = headers.indexOf('VerificationStatus');
  const createdCol = headers.indexOf('CreatedAt');

  for (let i = 1; i < data.length; i++) {
    const status = data[i][verificationCol] || 'Pending';

    if (status === 'Pending') pending++;
    else if (status === 'Verified') approved++;
    else if (status === 'Rejected') rejected++;

    // Add pending contractors to queue
    if (status === 'Pending') {
      const contractor = {};
      headers.forEach((header, index) => {
        contractor[header] = data[i][index];
      });
      contractor.rowIndex = i + 1;
      delete contractor.Password;
      queue.push(contractor);
    }
  }

  // Sort by creation date (newest first)
  queue.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));

  return {
    success: true,
    queue: queue,
    counts: { pending, approved, rejected }
  };
}

/**
 * Approve contractor verification
 */
function approveContractor(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Contractors');

  if (!sheet) return { success: false, error: 'Contractors sheet not found' };

  const contractorId = data.contractorId;
  if (!contractorId) return { success: false, error: 'Contractor ID required' };

  const sheetData = sheet.getDataRange().getValues();
  const headers = sheetData[0];
  const idCol = headers.indexOf('ContractorID');
  const verificationCol = headers.indexOf('VerificationStatus');
  const verifiedAtCol = headers.indexOf('VerifiedAt');
  const verifiedByCol = headers.indexOf('VerifiedBy');

  for (let i = 1; i < sheetData.length; i++) {
    if (sheetData[i][idCol] === contractorId) {
      sheet.getRange(i + 1, verificationCol + 1).setValue('Verified');
      sheet.getRange(i + 1, verifiedAtCol + 1).setValue(new Date());
      sheet.getRange(i + 1, verifiedByCol + 1).setValue(data.adminId || 'Admin');

      return { success: true, message: 'Contractor approved successfully' };
    }
  }

  return { success: false, error: 'Contractor not found' };
}

/**
 * Reject contractor verification
 */
function rejectContractor(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Contractors');

  if (!sheet) return { success: false, error: 'Contractors sheet not found' };

  const contractorId = data.contractorId;
  if (!contractorId) return { success: false, error: 'Contractor ID required' };

  const sheetData = sheet.getDataRange().getValues();
  const headers = sheetData[0];
  const idCol = headers.indexOf('ContractorID');
  const verificationCol = headers.indexOf('VerificationStatus');
  const statusCol = headers.indexOf('Status');

  for (let i = 1; i < sheetData.length; i++) {
    if (sheetData[i][idCol] === contractorId) {
      sheet.getRange(i + 1, verificationCol + 1).setValue('Rejected');
      sheet.getRange(i + 1, statusCol + 1).setValue('Inactive');

      return { success: true, message: 'Contractor rejected' };
    }
  }

  return { success: false, error: 'Contractor not found' };
}

/**
 * Suspend a contractor
 */
function suspendContractor(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Contractors');

  if (!sheet) return { success: false, error: 'Sheet not found' };

  const contractorId = data.contractorId;
  if (!contractorId) return { success: false, error: 'Contractor ID required' };

  const sheetData = sheet.getDataRange().getValues();
  const headers = sheetData[0];
  const idCol = headers.indexOf('ContractorID');
  const statusCol = headers.indexOf('Status');

  for (let i = 1; i < sheetData.length; i++) {
    if (sheetData[i][idCol] === contractorId) {
      const currentStatus = sheetData[i][statusCol];
      const newStatus = currentStatus === 'Suspended' ? 'Active' : 'Suspended';
      sheet.getRange(i + 1, statusCol + 1).setValue(newStatus);

      return { success: true, message: `Contractor ${newStatus.toLowerCase()}`, status: newStatus };
    }
  }

  return { success: false, error: 'Contractor not found' };
}

/**
 * Get all customers for admin management
 */
function getAdminCustomers(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Customers');

  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, customers: [] };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const customers = [];

  for (let i = 1; i < data.length; i++) {
    const customer = {};
    headers.forEach((header, index) => {
      customer[header] = data[i][index];
    });
    delete customer.Password;
    customers.push(customer);
  }

  return { success: true, customers: customers };
}

/**
 * Suspend a customer
 */
function suspendCustomer(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Customers');

  if (!sheet) return { success: false, error: 'Sheet not found' };

  const customerId = data.customerId;
  if (!customerId) return { success: false, error: 'Customer ID required' };

  const sheetData = sheet.getDataRange().getValues();
  const headers = sheetData[0];
  const idCol = headers.indexOf('CustomerID');
  const statusCol = headers.indexOf('Status');

  for (let i = 1; i < sheetData.length; i++) {
    if (sheetData[i][idCol] === customerId) {
      const currentStatus = sheetData[i][statusCol];
      const newStatus = currentStatus === 'Suspended' ? 'Active' : 'Suspended';
      sheet.getRange(i + 1, statusCol + 1).setValue(newStatus);

      return { success: true, message: `Customer ${newStatus.toLowerCase()}`, status: newStatus };
    }
  }

  return { success: false, error: 'Customer not found' };
}

/**
 * Get all jobs for admin management
 */
function getAdminJobs(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Jobs');

  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, jobs: [] };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const jobs = [];

  const statusFilter = params?.status || '';

  for (let i = 1; i < data.length; i++) {
    const job = {};
    headers.forEach((header, index) => {
      job[header] = data[i][index];
    });

    if (statusFilter && job.Status !== statusFilter) continue;

    jobs.push(job);
  }

  // Sort by date (newest first)
  jobs.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));

  return { success: true, jobs: jobs };
}

/**
 * Get payment/transaction history for admin
 */
function getAdminPayments(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Payments');

  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, payments: [], totals: { revenue: 0, platformFees: 0, pending: 0 } };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const payments = [];
  let totalRevenue = 0, totalFees = 0, pendingAmount = 0;

  const statusFilter = params?.status || '';

  for (let i = 1; i < data.length; i++) {
    const payment = {};
    headers.forEach((header, index) => {
      payment[header] = data[i][index];
    });

    if (statusFilter && payment.Status !== statusFilter) continue;

    // Calculate totals
    const amount = parseFloat(payment.Amount) || 0;
    const fee = parseFloat(payment.PlatformFee) || (amount * 0.10);

    if (payment.Status === 'Completed') {
      totalRevenue += amount;
      totalFees += fee;
    } else if (payment.Status === 'Pending' || payment.Status === 'Escrow') {
      pendingAmount += amount;
    }

    payments.push(payment);
  }

  // Sort by date (newest first)
  payments.sort((a, b) => new Date(b.CreatedAt || b.Date) - new Date(a.CreatedAt || a.Date));

  return {
    success: true,
    payments: payments,
    totals: {
      revenue: totalRevenue,
      platformFees: totalFees,
      pending: pendingAmount
    }
  };
}

/**
 * Get pending payouts for contractors
 */
function getPendingPayouts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const contractorsSheet = ss.getSheetByName('Contractors');
  const paymentsSheet = ss.getSheetByName('Payments');
  const payoutSettingsSheet = ss.getSheetByName('PayoutSettings');

  if (!contractorsSheet || contractorsSheet.getLastRow() <= 1) {
    return { success: true, payouts: [] };
  }

  const contractorsData = contractorsSheet.getDataRange().getValues();
  const contractorsHeaders = contractorsData[0];

  // Get payment history
  let paymentsByContractor = {};
  if (paymentsSheet && paymentsSheet.getLastRow() > 1) {
    const paymentsData = paymentsSheet.getDataRange().getValues();
    const paymentsHeaders = paymentsData[0];
    const contractorIdCol = paymentsHeaders.indexOf('ContractorID');
    const amountCol = paymentsHeaders.indexOf('ContractorPayout') !== -1
      ? paymentsHeaders.indexOf('ContractorPayout')
      : paymentsHeaders.indexOf('Amount');
    const statusCol = paymentsHeaders.indexOf('Status');

    for (let i = 1; i < paymentsData.length; i++) {
      const cid = paymentsData[i][contractorIdCol];
      const status = paymentsData[i][statusCol];
      const amount = parseFloat(paymentsData[i][amountCol]) || 0;

      if (!paymentsByContractor[cid]) {
        paymentsByContractor[cid] = { available: 0, pending: 0 };
      }

      if (status === 'Completed') {
        paymentsByContractor[cid].available += amount * 0.9; // 90% to contractor
      } else if (status === 'Escrow' || status === 'Pending') {
        paymentsByContractor[cid].pending += amount * 0.9;
      }
    }
  }

  // Get payout settings
  let payoutSettings = {};
  if (payoutSettingsSheet && payoutSettingsSheet.getLastRow() > 1) {
    const settingsData = payoutSettingsSheet.getDataRange().getValues();
    const settingsHeaders = settingsData[0];

    for (let i = 1; i < settingsData.length; i++) {
      const setting = {};
      settingsHeaders.forEach((header, index) => {
        setting[header] = settingsData[i][index];
      });
      payoutSettings[setting.ContractorID] = setting;
    }
  }

  const payouts = [];
  const idCol = contractorsHeaders.indexOf('ContractorID');
  const nameCol = contractorsHeaders.indexOf('Name');
  const emailCol = contractorsHeaders.indexOf('Email');
  const earningsCol = contractorsHeaders.indexOf('Earnings');

  for (let i = 1; i < contractorsData.length; i++) {
    const cid = contractorsData[i][idCol];
    const balances = paymentsByContractor[cid] || { available: 0, pending: 0 };
    const settings = payoutSettings[cid] || {};

    // Only include contractors with balance
    if (balances.available > 0 || balances.pending > 0) {
      payouts.push({
        ContractorID: cid,
        Name: contractorsData[i][nameCol],
        Email: contractorsData[i][emailCol],
        AvailableBalance: balances.available,
        PendingBalance: balances.pending,
        PayoutMethod: settings.PayoutMethod || 'PayPal',
        PayoutEmail: settings.PaypalEmail || settings.Email || contractorsData[i][emailCol],
        LastPayout: settings.LastPayoutDate || null
      });
    }
  }

  return { success: true, payouts: payouts };
}

/**
 * Process a payout to contractor
 */
function processPayout(data) {
  // This would integrate with PayPal/Stripe in production
  // For now, we'll log the payout request

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let payoutsSheet = ss.getSheetByName('Payouts');

  // Create Payouts sheet if it doesn't exist
  if (!payoutsSheet) {
    payoutsSheet = ss.insertSheet('Payouts');
    payoutsSheet.getRange(1, 1, 1, 8).setValues([[
      'PayoutID', 'ContractorID', 'Amount', 'Method', 'Email', 'Status', 'RequestedAt', 'ProcessedAt'
    ]]);
    payoutsSheet.getRange(1, 1, 1, 8).setBackground('#1a1a2e').setFontColor('white').setFontWeight('bold');
  }

  const payoutId = generateUniqueId('PAY');
  const now = new Date();

  payoutsSheet.appendRow([
    payoutId,
    data.contractorId,
    data.amount,
    data.method || 'PayPal',
    data.email,
    'Pending',
    now,
    ''
  ]);

  // Update payout settings with last payout date
  const settingsSheet = ss.getSheetByName('PayoutSettings');
  if (settingsSheet && settingsSheet.getLastRow() > 1) {
    const settingsData = settingsSheet.getDataRange().getValues();
    const headers = settingsData[0];
    const idCol = headers.indexOf('ContractorID');
    const lastPayoutCol = headers.indexOf('LastPayoutDate');

    for (let i = 1; i < settingsData.length; i++) {
      if (settingsData[i][idCol] === data.contractorId) {
        settingsSheet.getRange(i + 1, lastPayoutCol + 1).setValue(now);
        break;
      }
    }
  }

  return {
    success: true,
    payoutId: payoutId,
    message: 'Payout request submitted. Processing may take 1-3 business days.'
  };
}

/**
 * Setup Disputes sheet
 */
function setupDisputesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Disputes');

  if (!sheet) {
    sheet = ss.insertSheet('Disputes');
    sheet.getRange(1, 1, 1, 12).setValues([[
      'DisputeID', 'JobID', 'CustomerID', 'ContractorID', 'CustomerName', 'ContractorName',
      'Type', 'Description', 'Priority', 'Status', 'Resolution', 'CreatedAt'
    ]]);
    sheet.getRange(1, 1, 1, 12).setBackground('#1a1a2e').setFontColor('white').setFontWeight('bold');
  }

  return sheet;
}

/**
 * Get disputes for admin
 */
function getDisputes(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Disputes');

  if (!sheet) {
    sheet = setupDisputesSheet();
    return { success: true, disputes: [], counts: { open: 0, inReview: 0, resolved: 0 } };
  }

  if (sheet.getLastRow() <= 1) {
    return { success: true, disputes: [], counts: { open: 0, inReview: 0, resolved: 0 } };
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const disputes = [];
  let open = 0, inReview = 0, resolved = 0;

  const statusFilter = params?.status || '';

  for (let i = 1; i < data.length; i++) {
    const dispute = {};
    headers.forEach((header, index) => {
      dispute[header] = data[i][index];
    });

    // Count statuses
    if (dispute.Status === 'Open') open++;
    else if (dispute.Status === 'In Review') inReview++;
    else if (dispute.Status === 'Resolved') resolved++;

    if (statusFilter && dispute.Status !== statusFilter) continue;

    disputes.push(dispute);
  }

  // Sort by date (newest first)
  disputes.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));

  return {
    success: true,
    disputes: disputes,
    counts: { open, inReview, resolved }
  };
}

/**
 * Create a new dispute
 */
function createDispute(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Disputes');

  if (!sheet) {
    sheet = setupDisputesSheet();
  }

  const disputeId = generateUniqueId('DSP');
  const now = new Date();

  sheet.appendRow([
    disputeId,
    data.jobId || '',
    data.customerId || '',
    data.contractorId || '',
    data.customerName || '',
    data.contractorName || '',
    data.type || 'General',
    sanitizeString(data.description || '', 2000),
    data.priority || 'Medium',
    'Open',
    '',
    now
  ]);

  return { success: true, disputeId: disputeId, message: 'Dispute created' };
}

/**
 * Update dispute status
 */
function updateDispute(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Disputes');

  if (!sheet) return { success: false, error: 'Disputes sheet not found' };

  const disputeId = data.disputeId;
  if (!disputeId) return { success: false, error: 'Dispute ID required' };

  const sheetData = sheet.getDataRange().getValues();
  const headers = sheetData[0];

  for (let i = 1; i < sheetData.length; i++) {
    if (sheetData[i][0] === disputeId) {
      if (data.status) {
        const statusCol = headers.indexOf('Status');
        sheet.getRange(i + 1, statusCol + 1).setValue(data.status);
      }
      if (data.resolution) {
        const resolutionCol = headers.indexOf('Resolution');
        sheet.getRange(i + 1, resolutionCol + 1).setValue(sanitizeString(data.resolution, 2000));
      }
      if (data.priority) {
        const priorityCol = headers.indexOf('Priority');
        sheet.getRange(i + 1, priorityCol + 1).setValue(data.priority);
      }

      return { success: true, message: 'Dispute updated' };
    }
  }

  return { success: false, error: 'Dispute not found' };
}

/**
 * Get admin dashboard statistics
 */
function getAdminStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Get contractor stats
  const contractorsSheet = ss.getSheetByName('Contractors');
  let totalContractors = 0, verifiedContractors = 0, pendingVerification = 0;
  if (contractorsSheet && contractorsSheet.getLastRow() > 1) {
    const data = contractorsSheet.getDataRange().getValues();
    const headers = data[0];
    const verificationCol = headers.indexOf('VerificationStatus');

    for (let i = 1; i < data.length; i++) {
      totalContractors++;
      const status = data[i][verificationCol] || 'Pending';
      if (status === 'Verified') verifiedContractors++;
      else if (status === 'Pending') pendingVerification++;
    }
  }

  // Get customer stats
  const customersSheet = ss.getSheetByName('Customers');
  let totalCustomers = 0;
  if (customersSheet && customersSheet.getLastRow() > 1) {
    totalCustomers = customersSheet.getLastRow() - 1;
  }

  // Get job stats
  const jobsSheet = ss.getSheetByName('Jobs');
  let totalJobs = 0, completedJobs = 0, activeJobs = 0;
  if (jobsSheet && jobsSheet.getLastRow() > 1) {
    const data = jobsSheet.getDataRange().getValues();
    const headers = data[0];
    const statusCol = headers.indexOf('Status');

    for (let i = 1; i < data.length; i++) {
      totalJobs++;
      const status = data[i][statusCol];
      if (status === 'Completed') completedJobs++;
      else if (status === 'In Progress' || status === 'Open') activeJobs++;
    }
  }

  // Get payment stats
  const paymentsSheet = ss.getSheetByName('Payments');
  let totalRevenue = 0, platformFees = 0;
  if (paymentsSheet && paymentsSheet.getLastRow() > 1) {
    const data = paymentsSheet.getDataRange().getValues();
    const headers = data[0];
    const amountCol = headers.indexOf('Amount');
    const statusCol = headers.indexOf('Status');

    for (let i = 1; i < data.length; i++) {
      if (data[i][statusCol] === 'Completed') {
        const amount = parseFloat(data[i][amountCol]) || 0;
        totalRevenue += amount;
        platformFees += amount * 0.10;
      }
    }
  }

  // Get dispute stats
  const disputesSheet = ss.getSheetByName('Disputes');
  let openDisputes = 0;
  if (disputesSheet && disputesSheet.getLastRow() > 1) {
    const data = disputesSheet.getDataRange().getValues();
    const headers = data[0];
    const statusCol = headers.indexOf('Status');

    for (let i = 1; i < data.length; i++) {
      if (data[i][statusCol] === 'Open' || data[i][statusCol] === 'In Review') {
        openDisputes++;
      }
    }
  }

  // Get marketplace stats
  const listingsSheet = ss.getSheetByName('Listings');
  let activeListings = 0;
  if (listingsSheet && listingsSheet.getLastRow() > 1) {
    const data = listingsSheet.getDataRange().getValues();
    const headers = data[0];
    const statusCol = headers.indexOf('Status');

    for (let i = 1; i < data.length; i++) {
      if (data[i][statusCol] === 'active') activeListings++;
    }
  }

  return {
    success: true,
    stats: {
      contractors: {
        total: totalContractors,
        verified: verifiedContractors,
        pending: pendingVerification
      },
      customers: {
        total: totalCustomers
      },
      jobs: {
        total: totalJobs,
        completed: completedJobs,
        active: activeJobs
      },
      revenue: {
        total: totalRevenue,
        platformFees: platformFees
      },
      disputes: {
        open: openDisputes
      },
      marketplace: {
        activeListings: activeListings
      }
    }
  };
}

/**
 * Save platform settings
 */
function saveAdminSettings(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Settings');

  if (!sheet) {
    sheet = ss.insertSheet('Settings');
    sheet.getRange(1, 1, 1, 3).setValues([['Key', 'Value', 'UpdatedAt']]);
    sheet.getRange(1, 1, 1, 3).setBackground('#1a1a2e').setFontColor('white').setFontWeight('bold');
  }

  const now = new Date();
  const settings = data.settings || {};

  // Update or insert each setting
  const existingData = sheet.getDataRange().getValues();

  for (const [key, value] of Object.entries(settings)) {
    let found = false;
    for (let i = 1; i < existingData.length; i++) {
      if (existingData[i][0] === key) {
        sheet.getRange(i + 1, 2).setValue(value);
        sheet.getRange(i + 1, 3).setValue(now);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([key, value, now]);
    }
  }

  return { success: true, message: 'Settings saved' };
}

/**
 * Get platform settings
 */
function getAdminSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Settings');

  const defaultSettings = {
    platformFee: 10,
    minimumPayout: 50,
    escrowHoldDays: 3,
    requireIdVerification: true,
    requireBackgroundCheck: true,
    requireInsurance: false
  };

  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, settings: defaultSettings };
  }

  const data = sheet.getDataRange().getValues();
  const settings = { ...defaultSettings };

  for (let i = 1; i < data.length; i++) {
    const key = data[i][0];
    let value = data[i][1];

    // Convert string booleans
    if (value === 'true') value = true;
    else if (value === 'false') value = false;

    settings[key] = value;
  }

  return { success: true, settings: settings };
}
