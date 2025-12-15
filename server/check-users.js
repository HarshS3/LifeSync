require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');
  
  const users = await User.find({}).select('name email dietType avoidFoods allergies conditions');
  
  users.forEach(u => {
    console.log('\n--- User:', u.name, '---');
    console.log('Email:', u.email);
    console.log('Diet Type:', u.dietType || 'NOT SET');
    console.log('Avoid Foods:', u.avoidFoods?.length ? u.avoidFoods.join(', ') : 'NOT SET');
    console.log('Allergies:', u.allergies?.length ? u.allergies.join(', ') : 'NOT SET');
  });
  
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(console.error);
