import mongoose from 'mongoose';

async function main() {
  try {
    await mongoose.connect('mongodb+srv://hitianinsideofficialdev_db_user:3IjaKpzoYExJFgtH@hitianevent.1ezszvb.mongodb.net/hitianevent?retryWrites=true&w=majority&appName=HitianEvent');
    const events = await mongoose.connection.db.collection('events').find({}).toArray();
    console.log('Total DB events:', events.length);
    console.log(JSON.stringify(events, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
