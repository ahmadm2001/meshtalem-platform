import {
  IsString,
  IsArray,
  IsUUID,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({ example: 'uuid-of-product' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ example: 'ישראל ישראלי' })
  @IsString()
  shippingFullName: string;

  @ApiProperty({ example: '050-1234567' })
  @IsString()
  shippingPhone: string;

  @ApiProperty({ example: 'תל אביב' })
  @IsString()
  shippingCity: string;

  @ApiProperty({ example: 'רחוב הרצל 10' })
  @IsString()
  shippingStreet: string;

  @ApiProperty({ example: 'דירה 5' })
  @IsString()
  shippingApartment: string;

  @ApiPropertyOptional({ example: '6100000' })
  @IsOptional()
  @IsString()
  shippingZipCode?: string;

  @ApiPropertyOptional({ example: 'קוד דלת: 1234' })
  @IsOptional()
  @IsString()
  shippingNotes?: string;
}
