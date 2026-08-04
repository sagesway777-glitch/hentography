// db_check.js - verify admin user exists and password hash matches
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  console.log('=== PHASE 2: DATABASE CHECK ===\n');
  
  try {
    // Check admin user
    const result = await pool.query(
      'SELECT id, email, role, status, "createdAt" FROM users WHERE email = $1',
      ['sampadchowdhury777@gmail.com']
    );
    
    if (result.rows.length === 0) {
      console.log('FAIL: Admin user does NOT exist in database');
      console.log('Action required: Run prisma db seed');
    } else {
      const user = result.rows[0];
      console.log('Admin user EXISTS:');
      console.log(`  ID:     ${user.id}`);
      console.log(`  Email:  ${user.email}`);
      console.log(`  Role:   ${user.role}`);
      console.log(`  Status: ${user.status}`);
      console.log(`  Created: ${user.createdAt}`);
      
      // Check password hash
      const pwResult = await pool.query('SELECT password FROM users WHERE email = $1', ['sampadchowdhury777@gmail.com']);
      const storedHash = pwResult.rows[0].password;
      const testPassword = 'wb24q0929';
      
      if (!storedHash) {
        console.log('\nFAIL: User has no password (may be Clerk-only user)');
      } else {
        const matches = await bcrypt.compare(testPassword, storedHash);
        console.log(`\nPassword hash check: ${matches ? 'PASS - password matches' : 'FAIL - password does NOT match'}`);
      }
    }
    
    // Count all users
    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    console.log(`\nTotal users in DB: ${countResult.rows[0].count}`);
    
    // Count all admin users
    const adminResult = await pool.query("SELECT email, role FROM users WHERE role IN ('ADMIN', 'MODERATOR')");
    console.log(`Admin/Moderator users:`);
    adminResult.rows.forEach(r => console.log(`  - ${r.email} [${r.role}]`));
    
  } catch (e) {
    console.error('DB Error:', e.message);
  } finally {
    await pool.end();
  }
}

main();
