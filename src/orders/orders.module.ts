import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderItem } from './order.entity';
import { Product } from '../products/product.entity';
import { Vendor } from '../vendors/vendor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Product, Vendor])],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
