import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Challenge, Quiz, Alert, Groundwater } from './models.js';

export async function seed() {
  await Promise.all([User, Challenge, Quiz, Alert, Groundwater].map((m) => m.deleteMany({})));

  await User.create({ name: 'Admin', email: 'admin@aqua.dev', password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10), role: 'admin' });

  await Challenge.insertMany([
    { title: 'Fix a leaking tap', description: 'Repair or report a dripping tap. Upload a photo of the fix.', points: 20, type: 'daily' },
    { title: 'Bucket bath day', description: 'Use a bucket instead of a shower today.', points: 10, type: 'daily' },
    { title: 'Reuse greywater', description: 'Water plants with RO reject or washing water.', points: 15, type: 'daily' },
    { title: 'Turn off while brushing', description: 'Tap off while brushing, morning and night.', points: 5, type: 'daily' },
    { title: 'Rainwater check', description: 'Inspect or clean your rainwater harvesting pit and roof pipes.', points: 40, type: 'weekly' },
    { title: 'Meter reading log', description: 'Photo of your water meter, compared with last week.', points: 30, type: 'weekly' },
  ]);

  await Quiz.insertMany([
    { question: 'Where does groundwater live?', options: ['Underground rivers only', 'Gaps in soil and rock (aquifers)', 'Deep lakes under cities'], answer: 1, explain: 'Groundwater fills tiny spaces in soil and rock called aquifers.' },
    { question: 'Myth or fact: heavy rain always recharges groundwater.', options: ['Fact', 'Myth - paved ground sends it to drains'], answer: 1, explain: 'Concrete and fast runoff stop much rain from soaking in. Harvesting pits help.' },
    { question: 'What does a RISING "depth to water" number mean?', options: ['Water table is falling', 'Water table is rising', 'More rain fell'], answer: 0, explain: 'Depth is measured down from the ground. Deeper means the water table has dropped.' },
    { question: 'Best habit to cut tap wastage?', options: ['Fix leaks quickly', 'Run the tap longer to flush', 'Wash cars daily'], answer: 0, explain: 'A tap dripping once per second wastes thousands of litres a year.' },
    { question: 'What is rainwater harvesting?', options: ['Selling rain', 'Collecting rain and guiding it underground or into tanks', 'Boiling rain'], answer: 1, explain: 'It captures rain so it can recharge aquifers or be stored for use.' },
  ]);

  // SAMPLE DATA - replace with real CGWB / India-WRIS readings before demo or submission.
  const d = [['Tiruvallur',3,0,9.1,.4],['Chennai',4,0,6.8,-.2],['Vellore',2,0,14.2,1.1],['Kancheepuram',3,1,8.3,.3],
    ['Salem',1,2,16.5,1.8],['Villupuram',3,2,10.4,.6],['Cuddalore',4,2,5.2,-.4],['Coimbatore',0,3,12.7,.9],
    ['Erode',1,3,11.9,.7],['Trichy',2,3,7.4,.1],['Thanjavur',3,3,3.9,-.5],['Dindigul',1,4,18.3,2.2],
    ['Madurai',2,4,13.6,1.2],['Sivaganga',3,4,15.1,1.5],['Tirunelveli',2,5,9.8,.2],['Thoothukudi',3,5,6.1,-.1],['Kanyakumari',2,6,4.4,-.3]];
  await Groundwater.insertMany(d.map(([district, x, y, depth, change]) => ({ district, x, y, depth, change })));

  await Alert.insertMany([
    { message: 'Dindigul and Salem: water table falling fast. Cut non-essential use.', district: 'Dindigul', severity: 'critical' },
    { message: 'New weekly quest live: Rainwater check.', severity: 'info' },
  ]);
  console.log('Seeded. Admin login: admin@aqua.dev / ' + (process.env.ADMIN_PASSWORD ? '(your ADMIN_PASSWORD)' : 'admin123'));
}

if (process.argv[1]?.endsWith('seed.js')) {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aquaquest');
  await seed();
  process.exit(0);
}
