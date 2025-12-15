require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');
  
  // Update Harsh Shah's diet to jain
  const result = await User.findOneAndUpdate(
    { email: 'harshdshah333@gmail.com' },
    { 
      dietType: 'jain',
      avoidFoods: ['onion', 'garlic', 'potato', 'carrot', 'radish', 'beetroot', 'eggs', 'meat', 'fish']
    },
    { new: true }
  );
  
  console.log('\nUpdated user:', result.name);
  console.log('Diet Type:', result.dietType);
  console.log('Avoid Foods:', result.avoidFoods.join(', '));
  
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(console.error);
