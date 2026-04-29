const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  name: String,
  biologicalProfile: {
    age: Number,
    height: Number
  }
});
const Test = mongoose.model('Test', testSchema);

async function run() {
  await mongoose.connect('mongodb://localhost:27017/test-lifesync-mongoose');
  
  let doc = new Test({ name: 'Bob', biologicalProfile: { age: 20, height: 180 } });
  await doc.save();
  
  // try Object.assign
  Object.assign(doc, { biologicalProfile: { age: 25 } });
  await doc.save();
  
  let fetched = await Test.findById(doc._id);
  console.log('After Object.assign:', fetched.biologicalProfile);
  // Expected: { age: 25 } but height is lost? or maybe not even saved?
  
  // What happens if we do user.set?
  doc.set({ biologicalProfile: { age: 30 } });
  await doc.save();
  
  fetched = await Test.findById(doc._id);
  console.log('After doc.set:', fetched.biologicalProfile);

  await mongoose.disconnect();
}
run();
