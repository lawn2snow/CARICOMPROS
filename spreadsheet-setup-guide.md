# Hidden Kingz - Master Spreadsheet Setup Guide

Use spreadsheet: `17mZaSGUY_XvE_ipiI1IgsvTm7xIpr0KRbYzMK7bKyyc` as the master database.

## Required Sheets (Tabs)

Create the following sheets in your Google Spreadsheet:

### 1. Contractors Sheet
| Column | Description |
|--------|-------------|
| ID | CONT + timestamp (auto-generated) |
| Name | Contractor full name |
| Email | Contact email |
| Phone | Contact phone |
| Category | Service category |
| Location | Caribbean island |
| Rating | Average rating (0-5) |
| Jobs | Total jobs completed |
| Earnings | Total earnings |
| Status | Active/Inactive |
| Verified | Verified/Pending |
| Joined | Date joined |
| BusinessName | Business name |
| Experience | Years of experience |
| Bio | Profile bio |
| VerifiedAt | Verification timestamp |
| VerifiedBy | Admin who verified |

### 2. Customers Sheet
| Column | Description |
|--------|-------------|
| CustomerID | CUST + timestamp |
| Name | Customer name |
| Email | Contact email |
| Phone | Contact phone |
| Location | Caribbean island |
| Status | Active/Inactive |
| Joined | Date joined |
| TotalJobs | Jobs posted |
| TotalSpent | Total amount spent |

### 3. Jobs Sheet
| Column | Description |
|--------|-------------|
| JobID | JOB + timestamp |
| CustomerID | Reference to customer |
| CustomerName | Customer name |
| CustomerEmail | Customer email |
| CustomerPhone | Customer phone |
| Title | Job title |
| Description | Job description |
| Category | Service category |
| Location | Job location |
| Budget | Customer budget |
| Urgency | Low/Medium/High/Emergency |
| Status | Open/In Progress/Completed/Cancelled |
| CreatedAt | Creation timestamp |
| AssignedContractor | Contractor ID |
| QuotesReceived | Number of quotes |
| CompletedAt | Completion timestamp |

### 4. Quotes Sheet
| Column | Description |
|--------|-------------|
| QuoteID | QUOTE + timestamp |
| JobID | Reference to job |
| ContractorID | Reference to contractor |
| ContractorName | Contractor name |
| Amount | Quote amount |
| Message | Quote message |
| Timeline | Estimated timeline |
| Status | Pending/Accepted/Rejected |
| SubmittedAt | Submission timestamp |

### 5. Payments Sheet
| Column | Description |
|--------|-------------|
| PaymentID | PAY + timestamp |
| JobID | Reference to job |
| ContractorID | Reference to contractor |
| TotalAmount | Full job amount |
| PlatformFee | 10% platform fee |
| ContractorPayout | 90% to contractor |
| Status | Pending/Completed/Refunded |
| ProcessedAt | Processing timestamp |

### 6. Messages Sheet
| Column | Description |
|--------|-------------|
| MessageID | MSG + timestamp |
| FromID | Sender ID |
| ToID | Recipient ID |
| JobID | Related job (optional) |
| Message | Message content |
| SentAt | Send timestamp |
| Read | true/false |

### 7. Reviews Sheet
| Column | Description |
|--------|-------------|
| ReviewID | REV + timestamp |
| JobID | Reference to job |
| ContractorID | Reference to contractor |
| CustomerID | Reference to customer |
| Rating | 1-5 stars |
| Comment | Review text |
| CreatedAt | Creation timestamp |

## n8n Workflow API Endpoints

After importing the workflow, these endpoints will be available:

### Customer Endpoints
- `POST /hiddenkingz/customer/register` - Register new customer
- `POST /hiddenkingz/job/create` - Create new job posting

### Contractor Endpoints
- `POST /hiddenkingz/contractor/register` - Register new contractor
- `POST /hiddenkingz/quote/submit` - Submit quote on job
- `GET /hiddenkingz/jobs` - Get available jobs

### Job Flow Endpoints
- `POST /hiddenkingz/quote/accept` - Accept a quote
- `POST /hiddenkingz/job/complete` - Mark job as complete

### Communication Endpoints
- `POST /hiddenkingz/message/send` - Send message
- `POST /hiddenkingz/review/submit` - Submit review

### Admin Endpoints
- `POST /hiddenkingz/admin/verify-contractor` - Verify contractor
- `GET /hiddenkingz/contractors` - Get all contractors
- `GET /hiddenkingz/admin/stats` - Get platform statistics

## Setup Steps

1. Open your Google Spreadsheet
2. Create all 7 sheets with the column headers listed above
3. In n8n, import `n8n-workflow-hiddenkingz.json`
4. Set up Google Sheets OAuth2 credentials
5. Set up SMTP credentials for email notifications
6. Update the spreadsheet ID in all Google Sheets nodes
7. Activate the workflow

## Business Logic

- **Platform Fee**: 10% of each completed job
- **Contractor Payout**: 90% of job amount
- **Verification**: Contractors start as "Pending", admin verifies
- **Job Flow**: Open -> In Progress -> Completed
- **Quote Flow**: Pending -> Accepted/Rejected
