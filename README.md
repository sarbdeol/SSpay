# INDU PAY - Payment Processing Platform

> Multi-role payment processing system with real-time transaction tracking, commission management, and settlement handling.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Node.js + Express.js |
| **Frontend** | React.js + Tailwind CSS |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Auth** | JWT + bcrypt |
| **Reports** | PDFKit (PDF) + ExcelJS (Excel) |

---

## Quick Start (Development)

### 1. Prerequisites
- Node.js v18+
- PostgreSQL 14+
- npm or yarn

### 2. Clone & Install
```bash
git clone <repo-url>
cd indupay

# Install root dependencies
npm install

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
cd ..
```

### 3. Setup Database
```bash
# Create PostgreSQL database
createdb indupay

# Copy environment file
cp server/.env.example server/.env

# Edit server/.env with your database credentials:
# DATABASE_URL="postgresql://username:password@localhost:5432/indupay?schema=public"
# JWT_SECRET="your-secret-key-here"

# Run migrations
cd server
npx prisma migrate dev --name init

# Seed sample data
npm run db:seed
```

### 4. Start Development
```bash
# From root directory - starts both server and client
npm run dev
```

- **Client**: http://localhost:3000
- **Server**: http://localhost:5000
- **Prisma Studio**: `cd server && npm run db:studio` → http://localhost:5555

### 5. Login Credentials (Seed Data)
| Role | Username | Password |
|------|----------|----------|
| Super Admin | superadmin | admin123 |
| Admin | rohit | admin123 |
| Merchant | firojbhai | merchant123 |
| Agent | roysa | agent123 |
| Operator | yovi | operator123 |
| Collector | collector1 | collector123 |

---

## Production Deployment

### Option A: VPS / EC2

```bash
# 1. Build React
cd client && npm run build && cd ..

# 2. Set production env
export NODE_ENV=production

# 3. Start with PM2
npm install -g pm2
cd server
pm2 start src/app.js --name indupay

# 4. Setup Nginx reverse proxy
# See nginx.conf example below
```

### Option B: Docker (Coming Soon)

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Project Structure

```
indupay/
├── client/                    # React Frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/        # Reusable: StatCard, DataTable, FormInput, Modal, Button
│   │   │   └── layout/        # DashboardLayout (Sidebar + Header)
│   │   ├── context/
│   │   │   └── AuthContext.js  # Auth state management
│   │   ├── pages/
│   │   │   ├── auth/          # Login
│   │   │   ├── superadmin/    # Dashboard, Admins CRUD
│   │   │   ├── admin/         # Dashboard, Merchants/Agents/Collectors CRUD, Transactions, Config
│   │   │   ├── merchant/      # Dashboard, Transactions, Submerchants, Settlements
│   │   │   ├── submerchant/   # Dashboard, Ledger, Transactions (with upload/export)
│   │   │   ├── agent/         # Dashboard, Operators, Operator Users, Transactions
│   │   │   ├── operator/      # Dashboard, Pick/Clear/Reject Transactions
│   │   │   └── collector/     # Dashboard, Expenses, Requests, Ledger
│   │   ├── utils/
│   │   │   └── api.js         # Axios instance with interceptors
│   │   ├── App.js             # Main routing
│   │   └── index.js           # Entry point
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                    # Express Backend
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema (21 tables)
│   │   └── seed.js            # Seed data
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js    # Prisma client singleton
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT auth + role check
│   │   ├── routes/
│   │   │   ├── auth.js        # Login, logout, impersonate
│   │   │   ├── superadmin.js  # Admin CRUD
│   │   │   ├── admin.js       # Merchant/Agent/Collector CRUD, Transactions, Collections
│   │   │   ├── merchant.js    # Dashboard, Transactions, Submerchants, Settlements
│   │   │   ├── submerchant.js # Dashboard, Ledger, Transactions, Excel upload
│   │   │   ├── agent.js       # Operators, Operator Users, Transactions
│   │   │   ├── operator.js    # Pick, Clear, Reject transactions
│   │   │   ├── collector.js   # Expenses, Requests, Ledger
│   │   │   ├── config.js      # Rate configuration
│   │   │   └── reports.js     # Daily report, PDF, Excel export
│   │   └── app.js             # Server entry point
│   ├── .env.example
│   └── package.json
│
├── DATABASE_SCHEMA.md         # Complete schema documentation
├── package.json               # Root package (concurrently)
└── README.md                  # This file
```

---

## Role Hierarchy

```
SUPER_ADMIN
  └── ADMIN
       ├── MERCHANT → SUB_MERCHANT
       ├── AGENT → OPERATOR (config) → OPERATOR USER (login)
       └── COLLECTOR
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| POST | /api/auth/logout | Logout |
| GET | /api/auth/me | Current user |
| POST | /api/auth/impersonate/:id | Login as another user (Super Admin only) |

### Super Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/superadmin/dashboard | Dashboard stats |
| GET/POST | /api/superadmin/admins | List/Create admins |
| PUT/DELETE | /api/superadmin/admins/:id | Update/Delete admin |
| GET | /api/superadmin/users | All users |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/dashboard | Dashboard |
| GET/POST | /api/admin/merchants | Merchant CRUD |
| GET/POST | /api/admin/agents | Agent CRUD |
| GET/POST | /api/admin/collectors | Collector CRUD |
| GET | /api/admin/transactions | All transactions |
| GET/POST | /api/admin/collections | Collections |
| GET/POST/DELETE | /api/admin/blocked-ifsc | Blocked IFSC |
| GET/POST | /api/admin/beneficiary-accounts | Beneficiary accounts |
| GET/POST | /api/admin/cash-entries | Cash entries |

### Merchant
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/merchant/dashboard | Dashboard with limits |
| GET/POST | /api/merchant/transactions | Transactions (UPI/Bank) |
| GET/POST | /api/merchant/submerchants | Sub-merchant CRUD |
| GET/POST | /api/merchant/settlements | Settlements to collector |

### Sub-Merchant
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/submerchant/dashboard | Dashboard |
| GET/POST | /api/submerchant/transactions | Transactions |
| POST | /api/submerchant/transactions/upload | Excel bulk upload |
| GET | /api/submerchant/transactions/example | Download example Excel |
| GET | /api/submerchant/ledger | Ledger entries |

### Agent
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/agent/dashboard | Dashboard |
| GET/POST/PUT/DELETE | /api/agent/operators | Operator config CRUD |
| GET/POST/PUT/DELETE | /api/agent/operator-users | Operator user CRUD |
| GET | /api/agent/transactions | Transactions |

### Operator
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/operator/dashboard | Dashboard |
| GET | /api/operator/transactions | Own transactions |
| GET | /api/operator/pending-transactions | Available to pick |
| POST | /api/operator/transactions/:id/pick | Pick transaction |
| POST | /api/operator/transactions/:id/clear | Submit UTR & clear |
| POST | /api/operator/transactions/:id/reject | Reject |

### Collector
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/collector/dashboard | Dashboard |
| GET/POST | /api/collector/expenses | Expenses CRUD |
| GET/POST | /api/collector/requests | Requests |
| GET | /api/collector/ledger | Ledger |

### Reports & Config
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/reports/daily | Daily report data |
| GET | /api/reports/daily/pdf | PDF download (opens preview) |
| GET | /api/reports/export/transactions | Excel export |
| GET | /api/reports/receipt/:id | Transaction receipt PDF |
| GET/POST | /api/config/rates | AED/USDT rate config |

---

## Transaction Flow

1. **Merchant/SubMerchant** creates transaction (UPI or Bank) → Status: `PENDING`
2. **Operator** picks available transaction → Status: `PICKED`, operator assigned
3. **Operator** makes payment, submits UTR → Status: `CLEARED`, commissions calculated
4. OR **Operator** rejects → Status: `REJECTED`, merchant limit restored
5. Timeout → Status: `EXPIRED`

## Commission Calculation (on clear)
- `merchantCommission = amount × merchant.commissionChargePercent%`
- `agentCommission = amount × agent.commissionChargePercent%`
- `operatorCommission = amount × operator.commissionChargePercent%`
- `adminCommission = merchantCommission - agentCommission`

---

## Future Enhancements
- [ ] Docker deployment
- [ ] WebSocket for real-time transaction updates
- [ ] SMS/Email notifications
- [ ] Detailed audit logs
- [ ] Multi-currency support (AED/USD/INR)
- [ ] P2P settlement module
- [ ] USDT wallet integration

---

## Troubleshooting

**Database connection fails**: Check your DATABASE_URL in .env matches your PostgreSQL setup.

**Prisma migration issues**: Run `npx prisma migrate reset` to reset and re-run migrations.

**Port already in use**: Kill existing processes: `lsof -ti:5000 | xargs kill -9`

**CORS errors**: Ensure CLIENT_URL in .env matches your frontend URL.

---

Built with ❤️ for INDU PAY
