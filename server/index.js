require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/revenue', require('./routes/revenue'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/mileage', require('./routes/mileage'));
app.use('/api/todos', require('./routes/todos'));
app.use('/api/adspend', require('./routes/adspend'));

// Serve built React dashboard in production
const clientDist = path.join(__dirname, '../client/dist');
app.use('/dashboard', express.static(clientDist));
app.get('/dashboard/*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Relive server running on http://localhost:${PORT}`));
