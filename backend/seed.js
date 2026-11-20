require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('./db');

(async () => {
  try {
    const email = 'admin@example.com';
    const passwordHash = await bcrypt.hash('Admin@123', 12);

    const [users] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (users.length > 0) {
      await db.execute(
        'UPDATE users SET role = ?, password_hash = ? WHERE email = ?',
        ['ADMIN', passwordHash, email]
      );

      console.log('Existing account updated to ADMIN');
    } else {
      await db.execute(
        `INSERT INTO users
        (name, email, address, password_hash, role)
        VALUES (?, ?, ?, ?, ?)`,
        [
          'Default System Administrator',
          email,
          'Admin office',
          passwordHash,
          'ADMIN'
        ]
      );

      console.log('Admin account created');
    }

    console.log('Email: admin@example.com');
    console.log('Password: Admin@123');

  } catch (error) {
    console.error(error.message);
  } finally {
    await db.end();
  }
})();