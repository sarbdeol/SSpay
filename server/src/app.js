require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/merchant', require('./routes/merchant'));
app.use('/api/submerchant', require('./routes/submerchant'));
app.use('/api/agent', require('./routes/agent'));
app.use('/api/operator', require('./routes/operator'));
app.use('/api/collector', require('./routes/collector'));
app.use('/api/expense-manager', require('./routes/expenseManager'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/config', require('./routes/config'));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/build')));
  app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../../client/build/index.html')));
}

app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 SS PAY Server running on port ${PORT}`));
module.exports = app;
