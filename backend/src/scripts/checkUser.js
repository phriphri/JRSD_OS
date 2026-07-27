const { pool } = require('../config/db');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

async function check() {
  const [rows] = await pool.execute('SELECT * FROM users');
  console.log(rows);
  process.exit(0);
}
check().catch(err => {
  console.error(err);
  process.exit(1);
});
