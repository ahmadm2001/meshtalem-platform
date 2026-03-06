import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product } from './product.entity';
import { Vendor } from '../vendors/vendor.entity';
import { TranslationService } from '../common/services/translation.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Vendor])],
  controllers: [ProductsController],
  providers: [ProductsService, TranslationService],
  exports: [ProductsService],
})
export class ProductsModule {}
