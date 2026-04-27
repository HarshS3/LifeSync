require('dotenv').config();
const mongoose = require('mongoose');
const URI = "mongodb+srv://harsh_shah:HarshS3@cluster0.tfzcvvo.mongodb.net/LifeSync?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  await mongoose.connect(URI);
  console.log("Connected to MongoDB.");
  const db = mongoose.connection.db;
  
  const cols = ['indbfoods', 'tarlafoods', 'mfpfoods'];
  for (const c of cols) {
      const col = db.collection(c);
      
      const res1 = await col.find({ "columns.value": /roti rotis/i }).toArray();
      const res2 = await col.find({ name: /roti rotis/i }).toArray();
      const res3 = await col.find({ displayName: /roti rotis/i }).toArray();
      
      console.log(`In ${c}: columns.value: ${res1.length}, name: ${res2.length}, displayName: ${res3.length}`);
      if (res1.length) console.log(res1[0].displayName || res1[0].name);
      if (res2.length) console.log(res2[0].name);
      if (res3.length) console.log(res3[0].displayName);
      
      if (res1.length || res2.length || res3.length) {
          await col.deleteMany({ "columns.value": /roti rotis/i });
          await col.deleteMany({ name: /roti rotis/i });
          await col.deleteMany({ displayName: /roti rotis/i });
          console.log(`Deleted from ${c}`);
      }
  }

  process.exit(0);
}
run();
