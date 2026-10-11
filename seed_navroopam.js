import mongoose from 'mongoose';

async function seedNavroopam() {
  await mongoose.connect('mongodb+srv://hitianinsideofficialdev_db_user:3IjaKpzoYExJFgtH@hitianevent.1ezszvb.mongodb.net/hitianevent?retryWrites=true&w=majority&appName=HitianEvent');

  const navroopamId = new mongoose.Types.ObjectId('6aca70825588e8009b8e8e83');

  const eventData = {
    _id: navroopamId,
    title: 'NAVROOPAM v7.0',
    description: 'The premier Socio-Cultural Festive Celebration of Durga Puja by HITian Inside! Celebrating Maa Durga’s divine arrival and youth expressions through Puja Photography, Puja Vlog (Reel Making), Creative Writing, and Artwork (Painting & Digital Art).\n\n1. What is NAVROOPAM?\nNAVROOPAM v7.0 is the grand Durga Puja socio-cultural celebration organized by HITian Inside (Tabloid, Media & Literary Club, HIT Haldia). It showcases student creativity, devotion, artistic culture, and festive emotions.\n\n2. Competition Domains:\n- PUJA PHOTOGRAPHY: Sculpting Ma Shakti, Drishtipat, Pandalverse, Saishab\n- PUJA VLOG (REELS): Pandalchemy, Agomoni, Utsavnama, Pujo Diaries (Drive MP4 Link)\n- CREATIVE WRITING: The Trishul Within, The Ashes of Mahishasura, The Third Eye, Maa Durga: Bengal’s Beloved Daughter (English, Hindi, Bengali)\n- ARTWORK: Antarshakti, Avirbhava, Shakti Beyond the Idol, Navashakti\n\n3. Registration & Pass Verification:\nSymbolic fee of ₹9.00 INR per domain entry (commemorating the 9 divine days of Navratri / Durga Puja). Instant verified digital ticket pass with high-res verification QR code issued upon registration.',
    date: 'October 10 – 24, 2026',
    startDate: '2026-10-10',
    endDate: '2026-10-24',
    location: 'Online Submission & Digital Exhibition',
    organizer: 'HITian Inside (Tabloid, Media & Literary Club)',
    status: 'UPCOMING',
    mode: 'ONLINE',
    theme: 'DEFAULT',
    isFlagship: true,
    bannerUrl: '/navroopam_banner.png',
    coverUrl: '/navroopam_banner.png',
    hasAttendance: false,
    requireFileUpload: true,
    isHidden: false,
    highlights: [
      {
        icon: 'Camera',
        title: 'PHOTOGRAPHY',
        description: 'Puja Photography\nSculpting Ma Shakti • Drishtipat • Pandalverse • Saishab (Under 4 MB)'
      },
      {
        icon: 'Film',
        title: 'PUJA VLOG',
        description: 'Reel & Video Vlog\nPandalchemy • Agomoni • Utsavnama • Pujo Diaries (Google Drive MP4 Link)'
      },
      {
        icon: 'BookOpen',
        title: 'CREATIVE WRITING',
        description: 'The Trishul Within • The Ashes of Mahishasura • The Third Eye • Maa Durga: Bengal’s Beloved Daughter (ENG/HIN/BEN)'
      },
      {
        icon: 'Palette',
        title: 'ARTWORK',
        description: 'Painting & Digital Art\nAntarshakti • Avirbhava • Shakti Beyond the Idol • Navashakti (Under 4 MB)'
      }
    ],
    customFields: [],
    createdAt: new Date().toISOString()
  };

  const existing = await mongoose.connection.db.collection('events').findOne({ _id: navroopamId });
  if (existing) {
    await mongoose.connection.db.collection('events').updateOne({ _id: navroopamId }, { $set: eventData });
    console.log('Updated existing NAVROOPAM v7.0 record in MongoDB Atlas.');
  } else {
    await mongoose.connection.db.collection('events').insertOne(eventData);
    console.log('Inserted NAVROOPAM v7.0 record with ID 6aca70825588e8009b8e8e83.');
  }

  const all = await mongoose.connection.db.collection('events').find({}).toArray();
  console.log('Current Events in DB:', all.map(e => ({ id: e._id, title: e.title, isHidden: e.isHidden, status: e.status })));
  process.exit(0);
}

seedNavroopam().catch(e => { console.error(e); process.exit(1); });
