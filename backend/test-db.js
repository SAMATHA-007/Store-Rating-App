
const db = require('./db');

async function testConnection() {
    try {
        const connection = await db.getConnection();

        console.log('MySQL Connected Successfully!');

        const [tables] = await connection.query('SHOW TABLES');
        console.log('Database tables:', tables);

        connection.release();
    } catch (error) {
        console.error('Database Connection Failed:', error.message);
    } finally {
        await db.end();
    }
}

testConnection();
