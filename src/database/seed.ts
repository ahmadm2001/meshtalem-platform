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
  } else {
    await dataSource.query(
      `UPDATE users SET password = $1 WHERE email = 'admin@meshtalem.com'`,
      [adminHash]
    );
    console.log('Admin password updated');
  }

  // Check if vendor exists, if not create it
  const vendorExists = await dataSource.query(
    `SELECT id FROM users WHERE email = 'vendor@test.com'`
  );

  if (vendorExists.length === 0) {
    const vendorId = await dataSource.query(
      `INSERT INTO users (id, email, password, "fullName", phone, role, status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), 'vendor@test.com', $1, 'بائع تجريبي', '0500000001', 'vendor', 'active', NOW(), NOW())
       RETURNING id`,
      [vendorHash]
    );
    // Create vendor store
    await dataSource.query(
      `INSERT INTO vendors (id, "userId", "storeName", "storeNameAr", category, status, "createdAt", "updatedAt")
       VALUES (gen_random_uuid(), $1, 'متجر تجريبي', 'متجر تجريبي', 'إلكترونيات', 'active', NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [vendorId[0].id]
    );
    console.log('Vendor user created');
  } else {
    await dataSource.query(
      `UPDATE users SET password = $1 WHERE email = 'vendor@test.com'`,
      [vendorHash]
    );
    console.log('Vendor password updated');
  }

  // =====================
  // CATEGORIES SEED
  // =====================
  console.log('Seeding categories...');

  const categories = [
    {
      nameHe: 'אלקטרוניקה',
      nameAr: 'إلكترونيات',
      nameEn: 'Electronics',
      
      children: [
        { nameHe: 'מחשבים ולפטופים', nameAr: 'حواسيب ولابتوب', nameEn: 'Computers & Laptops' },
        { nameHe: 'טלפונים חכמים', nameAr: 'هواتف ذكية', nameEn: 'Smartphones' },
        { nameHe: 'טלוויזיות', nameAr: 'تلفزيونات', nameEn: 'TVs' },
        { nameHe: 'מצלמות', nameAr: 'كاميرات', nameEn: 'Cameras' },
        { nameHe: 'אוזניות ורמקולים', nameAr: 'سماعات ومكبرات', nameEn: 'Headphones & Speakers' },
        { nameHe: 'גאדג\'טים ואביזרים', nameAr: 'أجهزة وإكسسوارات', nameEn: 'Gadgets & Accessories' },
      ],
    },
    {
      nameHe: 'אופנה וביגוד',
      nameAr: 'أزياء وملابس',
      nameEn: 'Fashion & Clothing',
      
      children: [
        { nameHe: 'גברים', nameAr: 'رجال', nameEn: 'Men' },
        { nameHe: 'נשים', nameAr: 'نساء', nameEn: 'Women' },
        { nameHe: 'ילדים', nameAr: 'أطفال', nameEn: 'Kids' },
        { nameHe: 'נעליים', nameAr: 'أحذية', nameEn: 'Shoes' },
        { nameHe: 'תיקים ואביזרים', nameAr: 'حقائب وإكسسوارات', nameEn: 'Bags & Accessories' },
      ],
    },
    {
      nameHe: 'בית וגינה',
      nameAr: 'منزل وحديقة',
      nameEn: 'Home & Garden',
      
      children: [
        { nameHe: 'ריהוט', nameAr: 'أثاث', nameEn: 'Furniture' },
        { nameHe: 'מטבח', nameAr: 'مطبخ', nameEn: 'Kitchen' },
        { nameHe: 'עיצוב ודקור', nameAr: 'ديكور', nameEn: 'Decor' },
        { nameHe: 'כלי עבודה', nameAr: 'أدوات', nameEn: 'Tools' },
        { nameHe: 'גינון', nameAr: 'بستنة', nameEn: 'Gardening' },
      ],
    },
    {
      nameHe: 'ספורט ופנאי',
      nameAr: 'رياضة وترفيه',
      nameEn: 'Sports & Leisure',
      
      children: [
        { nameHe: 'ביגוד ספורט', nameAr: 'ملابس رياضية', nameEn: 'Sportswear' },
        { nameHe: 'ציוד כושר', nameAr: 'معدات لياقة', nameEn: 'Fitness Equipment' },
        { nameHe: 'כדורגל וכדורסל', nameAr: 'كرة قدم وكرة سلة', nameEn: 'Football & Basketball' },
        { nameHe: 'ספורט מים', nameAr: 'رياضات مائية', nameEn: 'Water Sports' },
        { nameHe: 'אופניים', nameAr: 'دراجات', nameEn: 'Bicycles' },
      ],
    },
    {
      nameHe: 'יופי ובריאות',
      nameAr: 'جمال وصحة',
      nameEn: 'Beauty & Health',
      
      children: [
        { nameHe: 'טיפוח פנים', nameAr: 'العناية بالوجه', nameEn: 'Face Care' },
        { nameHe: 'טיפוח שיער', nameAr: 'العناية بالشعر', nameEn: 'Hair Care' },
        { nameHe: 'בשמים', nameAr: 'عطور', nameEn: 'Perfumes' },
        { nameHe: 'ויטמינים ותוספים', nameAr: 'فيتامينات ومكملات', nameEn: 'Vitamins & Supplements' },
      ],
    },
    {
      nameHe: 'ילדים וצעצועים',
      nameAr: 'أطفال وألعاب',
      nameEn: 'Kids & Toys',
      
      children: [
        { nameHe: 'צעצועים', nameAr: 'ألعاب', nameEn: 'Toys' },
        { nameHe: 'ביגוד תינוקות', nameAr: 'ملابس أطفال', nameEn: 'Baby Clothes' },
        { nameHe: 'עגלות ואביזרים', nameAr: 'عربات وإكسسوارات', nameEn: 'Strollers & Accessories' },
      ],
    },
    {
      nameHe: 'מזון ומשקאות',
      nameAr: 'طعام ومشروبات',
      nameEn: 'Food & Beverages',
      
      children: [],
    },
    {
      nameHe: 'רכב ואביזרים',
      nameAr: 'سيارات وإكسسوارات',
      nameEn: 'Cars & Accessories',
      
      children: [],
    },
  ];

  for (const cat of categories) {
    // Check if parent category exists
    const existing = await dataSource.query(
      `SELECT id FROM categories WHERE "nameHe" = $1 AND "parentId" IS NULL`,
      [cat.nameHe]
    );

    let parentId: string;
    if (existing.length === 0) {
      const result = await dataSource.query(
        `INSERT INTO categories (id, "nameHe", "nameAr", "nameEn", "parentId", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, $3, NULL, NOW(), NOW())
         RETURNING id`,
        [cat.nameHe, cat.nameAr, cat.nameEn]
      );
      parentId = result[0].id;
    } else {
      parentId = existing[0].id;
    }

    // Insert children
    for (const child of cat.children) {
      const childExists = await dataSource.query(
        `SELECT id FROM categories WHERE "nameHe" = $1 AND "parentId" = $2`,
        [child.nameHe, parentId]
      );
      if (childExists.length === 0) {
        await dataSource.query(
          `INSERT INTO categories (id, "nameHe", "nameAr", "nameEn", "parentId", "createdAt", "updatedAt")
           VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())`,
          [child.nameHe, child.nameAr, child.nameEn, parentId]
        );
      }
    }
  }

  console.log('Categories seeded successfully!');

  await dataSource.destroy();
  console.log('\nSeed completed successfully!');
  console.log('\nCredentials:');
  console.log('Admin: admin@meshtalem.com / Admin@2024');
  console.log('Vendor: vendor@test.com / Vendor@2024');
}

seed().catch(console.error);
