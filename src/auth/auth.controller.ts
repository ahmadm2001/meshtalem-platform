import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterCustomerDto, RegisterVendorDto, LoginDto } from './dto/register.dto';

@ApiTags('Auth - אימות')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/customer')
  @ApiOperation({ summary: 'הרשמת לקוח חדש' })
  @ApiResponse({ status: 201, description: 'לקוח נרשם בהצלחה' })
  registerCustomer(@Body() dto: RegisterCustomerDto) {
    return this.authService.registerCustomer(dto);
  }

  @Post('register/vendor')
  @ApiOperation({ summary: 'הרשמת ספק חדש (ממתין לאישור מנהל)' })
  @ApiResponse({ status: 201, description: 'בקשת הרשמה התקבלה' })
  registerVendor(@Body() dto: RegisterVendorDto) {
    return this.authService.registerVendor(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'התחברות למערכת' })
  @ApiResponse({ status: 200, description: 'התחברות בוצעה בהצלחה' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
