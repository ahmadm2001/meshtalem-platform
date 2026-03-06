import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

config({ path: path.join(__dirname, '../../.env') });

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'meshtalem_db',
    entities: [path.join(__dirname, '../**/*.entity{.ts,.js}')],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('Database connected');

  const adminHash = await bcrypt.hash('Admin@2024', 10);
  const vendorHash = await bcrypt.hash('Vendor@2024', 10);

  // Update admin password
  await dataSource.query(
    `UPDATE users SET password = $1 WHERE email = 'admin@meshtalem.com'`,
    [adminHash]
  );
  console.log('Admin password updated');

  // Update vendor password
  await dataSource.query(
    `UPDATE users SET password = $1 WHERE email = 'vendor@test.com'`,
    [vendorHash]
  );
  console.log('Vendor password updated');

  // Check if admin exists, if not create it
  const adminExists = await dataSource.query(
    `SELECT id FROM users WHERE email = 'admin@meshtalem.com'`
  );
  
  if (adminExists.length === 0) {
    await dataSource.query(
      `INSERT INTO users (id, email, password, "fullName", phone, role, status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), 'admin@meshtalem.com', $1, 'مدير النظام', '0500000000', 'admin', 'active', NOW(), NOW())`,
      [adminHash]
    );
    console.log('Admin user created');
  }

  await dataSource.destroy();
  console.log('Seed completed successfully!');
  console.log('\nCredentials:');
  console.log('Admin: admin@meshtalem.com / Admin@2024');
  console.log('Vendor: vendor@test.com / Vendor@2024');
}

seed().catch(console.error);
