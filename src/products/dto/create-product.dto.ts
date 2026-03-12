import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsUUID,
  Min,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductWarranty, ProductDeliveryTime } from '../product.entity';

export class ProductOptionValueDto {
  @IsString()
  label: string;

  @IsNumber()
  @Min(0)
  priceModifier: number;
}

export class ProductOptionGroupDto {
  @IsString()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOptionValueDto)
  values: ProductOptionValueDto[];
}

export class CreateProductDto {
  @ApiProperty({ example: 'שטיח סלון' })
  @IsString()
  nameAr: string;

  @ApiPropertyOptional({ example: 'שטיח איכותי בעיצוב מודרני...' })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiProperty({ example: 299.99 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingFee?: number;

  @ApiPropertyOptional({ enum: ProductWarranty, example: ProductWarranty.ONE_YEAR })
  @IsOptional()
  @IsEnum(ProductWarranty)
  warranty?: ProductWarranty;

  @ApiPropertyOptional({ enum: ProductDeliveryTime, example: ProductDeliveryTime.TWO_THREE_DAYS })
  @IsOptional()
  @IsEnum(ProductDeliveryTime)
  deliveryTime?: ProductDeliveryTime;

  @ApiPropertyOptional({ example: ['black', 'blue', 'red'] })
  @IsOptional()
  @IsArray()
  colors?: string[];

  @ApiProperty({ example: 50 })
  @IsNumber()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ example: 'uuid-of-category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: ['https://...', 'https://...'] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiPropertyOptional({
    example: [
      { name: 'צבע', values: [{ label: 'שחור', priceModifier: 0 }, { label: 'כחול', priceModifier: 20 }] },
      { name: 'מידה', values: [{ label: '2x2', priceModifier: 0 }, { label: '3x3', priceModifier: 80 }] },
    ]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductOptionGroupDto)
  productOptions?: ProductOptionGroupDto[];
}
