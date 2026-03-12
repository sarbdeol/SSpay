# SS PAY — Database Schema Overview
## Database: PostgreSQL | ORM: Prisma

---

## Role Hierarchy & Relationships

```
SUPER_ADMIN
  └── creates → ADMIN
                   ├── creates → MERCHANT ──→ creates → SUB_MERCHANT
                   ├── creates → AGENT ──→ creates → OPERATOR (config)
                   │                              └── OPERATOR USER (login)
                   └── creates → COLLECTOR
```

---

## All Tables (21 Total)

### 1. users
> Single login table for ALL roles
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | Auto increment |
| name | VARCHAR | Display name |
| username | VARCHAR UNIQUE | Login username |
| password | VARCHAR | bcrypt hashed |
| role | ENUM | SUPER_ADMIN, ADMIN, MERCHANT, SUB_MERCHANT, AGENT, OPERATOR, COLLECTOR |
| isActive | BOOLEAN | Default true |
| adminId | FK → admins | Set if role=ADMIN |
| merchantId | FK → merchants | Set if role=MERCHANT |
| subMerchantId | FK → sub_merchants | Set if role=SUB_MERCHANT |
| agentId | FK → agents | Set if role=AGENT |
| operatorId | FK → operators | Set if role=OPERATOR (multiple users per operator) |
| collectorId | FK → collectors | Set if role=COLLECTOR |
| createdBy | FK → users | Who created this user |

---

### 2. admins
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| name | VARCHAR | |
| isActive | BOOLEAN | |

---

### 3. merchants
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| name | VARCHAR | |
| description | TEXT | Optional |
| maxPaymentLimit | DECIMAL(15,2) | e.g., 500000 |
| usedLimit | DECIMAL(15,2) | Tracks usage, default 0 |
| commissionChargePercent | DECIMAL(5,2) | e.g., 4, 0.8, 2.6 |
| isActive | BOOLEAN | |
| adminId | FK → admins | Created by which admin |

**Available Limit** = maxPaymentLimit - usedLimit (calculated field)

---

### 4. merchant_agents (Many-to-Many)
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| merchantId | FK → merchants | |
| agentId | FK → agents | |
| assignedAt | DATETIME | |

---

### 5. sub_merchants
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| name | VARCHAR | |
| description | TEXT | Optional |
| isActive | BOOLEAN | |
| merchantId | FK → merchants | Belongs to which merchant |

---

### 6. agents
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| name | VARCHAR | |
| description | TEXT | Optional |
| commissionChargePercent | DECIMAL(5,2) | |
| isActive | BOOLEAN | |
| adminId | FK → admins | Created by which admin |

---

### 7. operators (Config entity — NOT a login)
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| name | VARCHAR | |
| maxTransactionAmount | DECIMAL(15,2) | e.g., 100000 |
| minTransactionAmount | DECIMAL(15,2) | e.g., 100 |
| commissionChargePercent | DECIMAL(5,2) | |
| description | TEXT | Optional |
| transactionPicked | INT | Count of currently picked txns |
| isActive | BOOLEAN | |
| agentId | FK → agents | Created by which agent |

**Note:** Operator Users (login accounts) are in the `users` table with role=OPERATOR and operatorId linking here. Multiple users can share one operator config.

---

### 8. collectors
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| name | VARCHAR | |
| description | TEXT | Optional |
| isActive | BOOLEAN | |
| adminId | FK → admins | Created by which admin |

---

### 9. transactions ⭐ (Core Table)
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| amount | DECIMAL(15,2) | |
| transactionType | ENUM | UPI, BANK_ACCOUNT |
| status | ENUM | PENDING, PICKED, CLEARED, REJECTED, EXPIRED |
| upiId | VARCHAR | If type=UPI |
| bankName | VARCHAR | If type=BANK_ACCOUNT |
| ifscCode | VARCHAR | If type=BANK_ACCOUNT |
| accountNumber | VARCHAR | If type=BANK_ACCOUNT |
| accountHolderName | VARCHAR | If type=BANK_ACCOUNT |
| utrNumber | VARCHAR | Filled by operator after payment |
| notes | TEXT | Optional |
| operatorPickTime | DATETIME | When operator picked it |
| transactionClearTime | DATETIME | When cleared/rejected |
| merchantCommission | DECIMAL(15,2) | Calculated |
| agentCommission | DECIMAL(15,2) | Calculated |
| operatorCommission | DECIMAL(15,2) | Calculated |
| adminCommission | DECIMAL(15,2) | Calculated |
| merchantId | FK → merchants | |
| subMerchantId | FK → sub_merchants | Optional |
| agentId | FK → agents | Assigned when picked |
| operatorId | FK → operators | Who picked it |

**Transaction Flow:**
1. Merchant/SubMerchant creates → status=PENDING
2. Operator picks → status=PICKED, operatorPickTime set
3. Operator pays & submits UTR → status=CLEARED, utrNumber set
4. Or rejected → status=REJECTED
5. Or timeout → status=EXPIRED

---

### 10. rate_configs
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| usdtTodayRate | DECIMAL(10,4) | |
| aedTodayRate | DECIMAL(10,4) | |
| currency | VARCHAR | AED, USD |
| merchantId | FK → merchants | Rate for this merchant |
| agentId | FK → agents | Or rate for this agent |
| adminId | FK → admins | Set by which admin |

---

### 11. settlements (Merchant → Collector)
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| amount | DECIMAL(15,2) | |
| remark | TEXT | |
| status | ENUM | PENDING, APPROVED, REJECTED |
| merchantId | FK → merchants | |
| collectorId | FK → collectors | |
| agentId | FK → agents | Optional |

---

### 12. collections (Admin → Merchant)
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| amount | DECIMAL(15,2) | |
| description | TEXT | |
| status | ENUM | PENDING, APPROVED, REJECTED |
| merchantId | FK → merchants | |

---

### 13. expenses (Collector expenses)
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| category | ENUM | HOUSE_RENT, CAR, DRIVER_SALARY, COOK_SALARY, STAFF_SALARY, MISC_EXPENSE, ADMIN_WITHDRAWAL |
| amount | DECIMAL(15,2) | |
| description | TEXT | |
| collectorId | FK → collectors | |

---

### 14. requests (Collector requests)
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| amount | DECIMAL(15,2) | |
| description | TEXT | |
| status | ENUM | PENDING, APPROVED, REJECTED |
| collectorId | FK → collectors | |

---

### 15. ledger (Financial ledger)
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| entryType | VARCHAR | CREDIT, DEBIT |
| amount | DECIMAL(15,2) | |
| description | TEXT | |
| balanceAfter | DECIMAL(15,2) | Running balance |
| subMerchantId | FK → sub_merchants | Optional |
| collectorId | FK → collectors | Optional |
| transactionId | INT | Optional link to transaction |

---

### 16. cash_entries (Admin cash management)
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| entryType | VARCHAR | CASH_IN, CASH_OUT |
| amount | DECIMAL(15,2) | |
| description | TEXT | |
| adminId | FK → admins | |

---

### 17. blocked_ifscs
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| ifscCode | VARCHAR UNIQUE | |
| reason | TEXT | |
| adminId | FK → admins | |

---

### 18. beneficiary_accounts (Admin managed)
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| accountNumber | VARCHAR | |
| ifscCode | VARCHAR | |
| accountHolderName | VARCHAR | |
| bankName | VARCHAR | |
| upiId | VARCHAR | |
| isActive | BOOLEAN | |

---

### 19. merchant_beneficiaries
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| accountNumber | VARCHAR | |
| ifscCode | VARCHAR | |
| accountHolderName | VARCHAR | |
| bankName | VARCHAR | |
| upiId | VARCHAR | |
| isActive | BOOLEAN | |
| merchantId | FK → merchants | |

---

### 20. transfer_requests
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| amount | DECIMAL(15,2) | |
| description | TEXT | |
| status | ENUM | PENDING, APPROVED, REJECTED |

---

### 21. daily_reports (Cached reports)
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| reportDate | DATE | |
| role | ENUM | Which role's report |
| totalPayOut | DECIMAL(15,2) | |
| totalCommission | DECIMAL(15,2) | |
| amountByCurrency | JSON | { "AED": 1000 } |
| userId | INT | Whose report |

---

## Dashboard Cards Mapping

| Role | Card | Source |
|------|------|--------|
| **Admin** | Total RTGS | SUM(transactions.amount) WHERE cleared |
| **Admin** | Total Pending | COUNT(transactions) WHERE pending |
| **Admin** | Available Details | Merchant limits summary |
| **Admin** | Total Admin Commission | SUM(transactions.adminCommission) |
| **Admin** | Total Recoverable AED | Calculated from rate_configs |
| **Merchant** | Total Commission Amount | SUM(transactions.merchantCommission) |
| **Merchant** | Total Pay Out Amount | SUM(transactions.amount) WHERE cleared |
| **Merchant** | Total Pay Out Transactions | COUNT(transactions) WHERE cleared |
| **Merchant** | Available/Used/Max Limit | From merchants table directly |
| **Agent** | Total Agent Commission | SUM(transactions.agentCommission) |
| **Agent** | Total Pay Out Transactions | COUNT via agent's operators |
| **Agent** | Total Pay Out Amount | SUM via agent's operators |
| **Agent** | Pay Out by Operator | Grouped by operatorId |
| **Operator** | Total Transfer Amount | SUM(transactions.amount) WHERE cleared & operatorId |
| **Operator** | Total Pending | COUNT WHERE picked & operatorId |
| **Operator** | Available Details | Operator limits |
| **Operator** | Total Payment Lunga | Outstanding amount |
| **Collector** | Total Merchant Se Lena | SUM owed by merchants |
| **Collector** | Total Agent Ko Dena | SUM owed to agents |
| **Collector** | Total Admin Ko Dena | SUM owed to admin |
