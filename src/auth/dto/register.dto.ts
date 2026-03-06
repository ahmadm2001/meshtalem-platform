import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/user.entity';

export class RegisterCustomerDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'ישראל ישראלי' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ example: '050-1234567' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class RegisterVendorDto {
  @ApiProperty({ example: 'vendor@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'أحمد محمد' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'متجر الجودة' })
  @IsString()
  businessName: string;

  @ApiPropertyOptional({ example: 'نحن نبيع أفضل المنتجات' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '050-1234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'الناصرة، شارع الاستقلال 5' })
  @IsOptional()
  @IsString()
  address?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123' })
  @IsString()
  password: string;
}
