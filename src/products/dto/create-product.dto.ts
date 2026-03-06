import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'هاتف سامسونج جالاكسي' })
  @IsString()
  nameAr: string;

  @ApiPropertyOptional({ example: 'هاتف ذكي بمواصفات عالية...' })
  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @ApiProperty({ example: 299.99 })
  @IsNumber()
  @Min(0)
  price: number;

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
}
