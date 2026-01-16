/*
  Dev helper: generate a monthly report JSON using the same logic as the download endpoint.

  Usage:
    $env:MONGO_URI="..."  # optional
    $env:REPORT_EMAIL="test@gmail.com"  # optional
    $env:REPORT_MONTH="2025-12"        # optional
    node .\server\scripts\dev_generate_monthly_report.js
*/

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../models/User');
const { generateMonthlyReport } = require('../services/reports/monthlyReport');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync';
const EMAIL = process.env.REPORT_EMAIL || 'test@gmail.com';
const MONTH = process.env.REPORT_MONTH || '2025-12';

async function main() {
  await mongoose.connect(MONGO_URI);
  const user = await User.findOne({ email: EMAIL });
  if (!user) throw new Error(`User not found: ${EMAIL}`);

  const report = await generateMonthlyReport({ userId: user._id, month: MONTH });
  console.log(JSON.stringify({ month: report.month, totals: report.totals, sampleDay: report.days?.[0] }, null, 2));
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('dev_generate_monthly_report failed:', err);
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        await mongoose.disconnect();
      } catch {
        // ignore
      }
    });
}
