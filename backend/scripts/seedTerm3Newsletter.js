/**
 * Seed the official Term 3 2026 newsletter into the announcements
 * collection as a structured newsletter-type record. Idempotent —
 * deletes any existing copy of the same newsletter title first.
 *
 * Usage: node scripts/seedTerm3Newsletter.js   (run from backend/)
 */
const mongoose = require('mongoose');
require('dotenv').config();
const Announcement = require('../models/Announcement');

const newsletter = {
  type: 'newsletter',
  title: 'TERM THREE 2026 NEWSLETTER',
  text: 'TERM THREE 2026 NEWSLETTER — Official school newsletter dated 23rd October 2026. Click to view the full newsletter.',
  dateLabel: '23rd October 2026',
  audience: 'All Parents / Guardians & Students (Grades 7, 8, & 9)',
  author: 'Akiru Rebecca Lokeun',
  authorRole: 'H.O.I / B.O.M Secretary',
  createdBy: 'Akiru Rebecca Lokeun (H.O.I / B.O.M Secretary)',
  sections: [
    {
      heading: '',
      paragraphs: [
        'Dear parent/guardian,',
        'Receive greetings from A.I.C Lokichoggio Girls\u2019 Junior school. We thank God almighty for bringing us to a successful end of third term 3 2026. We also appreciate the confidence you have in us by entrusting us with your daughter(s) and your cooperation for the betterment of our school, may God bless you. Therefore, we wish you to note the following:'
      ]
    },
    {
      heading: '1. Closing and Opening',
      paragraphs: [
        'Our school has officially closed today the 23th October 2026. The school will officially open on Monday, 4th January 2027 at exactly 7:00 am. All students are expected to report on the same day and resume their classes without fail.'
      ]
    },
    {
      heading: '2. Assessments',
      paragraphs: [
        'Our learners are assessed continuously throughout learning process every term. Kindly we urge you to fully support this programme to run effectively. Therefore, every learner MUST come with one ream of printing papers on reporting date to enhance the production of the assessments. You are also reminded to provide your learners with three files for proper storage of the assessment papers and strictly follow up with your learner\u2019s progress record from the school.'
      ]
    },
    {
      heading: '3. Writing and learning materials',
      paragraphs: [
        'We appreciate our government through the ministry of education for having provided text books in school and we are anticipating for more. Besides, parents/guardians have the responsibility of ensuring that their learners have school uniform, exercise books and pens. It came to our attention that a good number of learners in grade 7, 8 and 9 lack these essential writing materials. Kindly, buy your daughter 15 A4 200 Pages exercise books, 2 black pens, 2 blue pens, 2 red pens and 1 HB pencil, sharpener and eraser to come with during reporting. For those in grade 8 & 9 must come with Mathematical tables, calculators (fx- 82 m/s), A4 graph book and A4 drawing book, kindly.'
      ]
    },
    {
      heading: '4. Set books',
      paragraphs: [
        'Grade seven and eight have literature and Fasihi set books to read and parents are to buy these books from KICD. Kindly note that grade 7, 8 and 9 Literature set books in junior school are as follows:'
      ],
      table: {
        headers: ['English Literature Books', 'Kiswahili Fasihi Books'],
        rows: [
          ['Daughter of Nature', 'Mshale wa matumaini'],
          ['Bridges without rivers', 'Hidaya ya kiswahili'],
          ['The hidden package', 'Wema hauozi'],
          ['Tobby\u2019s diary', 'Mji wa matarajio'],
          ['', 'Uteuzi wa chale']
        ]
      },
      note: 'NOTE: All learners MUST read these books in their respective level before transiting to another level. It is very important.'
    },
    {
      heading: '5. Discipline',
      paragraphs: [
        'Discipline is a collective responsibility. Parents/guardians, kindly create time with your daughter(s) and advice her to stay maintain high standards of discipline as this is expected to reflect in general performance as a learner. Please note that all students are expected to be in school daily without fail.'
      ]
    },
    {
      heading: '6. School uniform',
      paragraphs: [
        'The school appreciates all parents that have bought their children school uniforms. All parents/guardians are kindly requested to buy full school uniform to their daughters on reporting day. The uniform table required:'
      ],
      table: {
        headers: ['Item', 'Requirement'],
        rows: [
          ['Blouse', '2 white blouse'],
          ['Skirt', '2 red checked skirt'],
          ['Socks', '2 pairs of white socks with red strips'],
          ['Shoes', '1 pair of brown toughees'],
          ['Game skit', 'Red tracksuit with white strips & white T-shirt']
        ]
      }
    },
    {
      heading: '',
      paragraphs: [
        'Without much ado, we wish you a Happy December holiday.',
        'Thank you.',
        'Yours sincerely,'
      ]
    }
  ]
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.MONGODB_NAME || 'school' });

  const removed = await Announcement.deleteMany({ type: 'newsletter', title: newsletter.title });
  if (removed.deletedCount) console.log(`Removed ${removed.deletedCount} existing copy/copies`);

  const doc = await Announcement.create(newsletter);
  console.log(`Newsletter seeded: "${doc.title}" (id ${doc._id})`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error('Error:', err); process.exit(1); });
