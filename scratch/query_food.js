const mongoose = require('mongoose');
require('dotenv').config({ path: '../server/.env' });

const IndbFood = require('../server/models/IndbFood');

async function findFood() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const food = await IndbFood.findOne({
      displayName: /Ravi Cluster Beans/i
    });

    if (food) {
      console.log(JSON.stringify(food, null, 2));
    } else {
      console.log('Food not found');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findFood();
