require('dotenv').config();

const path = require('path');
const mongoose = require('mongoose');
const {
  DEFAULT_SOURCE_FILE_PATH,
  importIndbXlsxToMongo,
} = require('../services/nutritionSources/indbMongo');

async function main() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/lifesync';
  const filePath = process.env.INDB_SOURCE_PATH
    ? path.resolve(process.cwd(), process.env.INDB_SOURCE_PATH)
    : DEFAULT_SOURCE_FILE_PATH;
  const force = String(process.env.INDB_FORCE_REIMPORT || '0').trim() === '1';

  await mongoose.connect(MONGO_URI);

  const result = await importIndbXlsxToMongo({ filePath, forceReimport: force });
  console.log('[import_indb_xlsx] result:', JSON.stringify(result, null, 2));
}

if (require.main === module) {
  main()
    .catch((err) => {
      console.error('[import_indb_xlsx] failed:', err?.message || err);
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
