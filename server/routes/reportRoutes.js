const express = require('express');
const jwt = require('jsonwebtoken');

const { generateMonthlyReport, toCsv, isValidMonth } = require('../services/reports/monthlyReport');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'lifesync-secret-key-change-in-production';

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

function defaultMonthYYYYMM(now = new Date()) {
  // Default to previous month.
  const d = new Date(now);
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}`;
}

router.get('/monthly', auth, async (req, res) => {
  try {
    const month = String(req.query.month || '').trim() || defaultMonthYYYYMM(new Date());
    const format = String(req.query.format || 'json').trim().toLowerCase();

    if (!isValidMonth(month)) {
      return res.status(400).json({ error: 'Invalid month; expected YYYY-MM' });
    }

    const report = await generateMonthlyReport({ userId: req.userId, month });

    const filenameBase = `lifesync-monthly-report-${month}`;

    if (format === 'csv') {
      const csv = toCsv({ month, days: report.days });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.csv"`);
      return res.send(csv);
    }

    // default json
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.json"`);
    return res.json(report);
  } catch (err) {
    console.error('monthly report failed:', err);
    res.status(err?.status || 500).json({ error: err?.message || 'Failed to generate monthly report' });
  }
});

module.exports = router;
