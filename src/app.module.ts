import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './auth/auth.module';
import { VendorsModule } from './vendors/vendors.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { UploadsModule } from './uploads/uploads.module';
import { User } from './users/user.entity';
import { Vendor } from './vendors/vendor.entity';
import { Category } from './categories/category.entity';
import { Product } from './products/product.entity';
import { Order, OrderItem } from './orders/order.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        if (databaseUrl) {
          return {
            type: 'postgres' as const,
            url: databaseUrl,
            entities: [User, Vendor, Category, Product, Order, OrderItem],
            synchronize: true,
            ssl: { rejectUnauthorized: false },
            logging: false,
          };
        }
        return {
          type: 'postgres' as const,
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'password'),
          database: configService.get<string>('DB_NAME', 'meshtalem_db'),
          entities: [User, Vendor, Category, Product, Order, OrderItem],
          synchronize: !isProduction,
          logging: !isProduction,
        };
      },
    }),
    EventEmitterModule.forRoot(),
    AuthModule,
    VendorsModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    UploadsModule,
  ],
})
export class AppModule {}
