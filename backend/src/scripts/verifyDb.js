require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../config/db');

async function verify() {
  const [rows] = await pool.execute('SHOW TABLES');
  console.log('Tables dans jrsd_os:');
  rows.forEach(r => console.log('  -', Object.values(r)[0]));

  const [cols] = await pool.execute("SHOW COLUMNS FROM users WHERE Field = 'role'");
  console.log('\nENUM role:', cols[0].Type);

  process.exit(0);
}

verify();
