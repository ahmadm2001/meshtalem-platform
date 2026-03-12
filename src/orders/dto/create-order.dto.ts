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

export class SelectedOptionDto {
  @IsString()
  groupName: string;

  @IsString()
  selectedValue: string;

  @IsNumber()
  @Min(0)
  priceModifier: number;
}

export class OrderItemDto {
  @ApiProperty({ example: 'uuid-of-product' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'blue' })
  @IsOptional()
  @IsString()
  selectedColor?: string;

  @ApiPropertyOptional({
    example: [
      { groupName: 'צבע', selectedValue: 'כחול', priceModifier: 20 },
      { groupName: 'מידה', selectedValue: '3x3', priceModifier: 80 },
    ]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedOptionDto)
  selectedOptions?: SelectedOptionDto[];
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  // Guest customer details (no login required)
  @ApiPropertyOptional({ example: 'ישראל ישראלי' })
  @IsOptional()
  @IsString()
  guestName?: string;

  @ApiPropertyOptional({ example: '050-1234567' })
  @IsOptional()
  @IsString()
  guestPhone?: string;

  @ApiPropertyOptional({ example: 'customer@email.com' })
  @IsOptional()
  @IsString()
  guestEmail?: string;

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

  @ApiPropertyOptional({ example: 'דירה 5' })
  @IsOptional()
  @IsString()
  shippingApartment?: string;

  @ApiPropertyOptional({ example: '6100000' })
  @IsOptional()
  @IsString()
  shippingZipCode?: string;

  @ApiPropertyOptional({ example: 'קוד דלת: 1234' })
  @IsOptional()
  @IsString()
  shippingNotes?: string;
}
