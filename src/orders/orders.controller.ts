import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, User } from '../users/user.entity';
import { OrderStatus } from './order.entity';

@ApiTags('Orders - הזמנות')
@Controller('orders')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ========== CUSTOMER ==========

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'יצירת הזמנה חדשה (לקוח)' })
  createOrder(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(user.id, dto);
  }

  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'הזמנות שלי (לקוח)' })
  getMyOrders(@CurrentUser() user: User) {
    return this.ordersService.getMyOrders(user.id);
  }

  @Get('my/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'פרטי הזמנה בודדת (לקוח)' })
  getMyOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.getOrderById(id, user.id);
  }

  @Put('my/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @ApiOperation({ summary: 'ביטול הזמנה (לקוח)' })
  cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.cancelOrder(id, user.id);
  }

  // ========== VENDOR ==========

  @Get('vendor')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'הזמנות הספק (מוצרים שנמכרו)' })
  getVendorOrders(@CurrentUser() user: User) {
    return this.ordersService.getVendorOrders(user.id);
  }

  @Get('vendor/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'סטטיסטיקות ספק' })
  getVendorStats(@CurrentUser() user: User) {
    return this.ordersService.getVendorStats(user.id);
  }

  // ========== ADMIN ==========

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'כל ההזמנות (מנהל)' })
  getAllOrders(@Query('status') status?: OrderStatus) {
    return this.ordersService.getAllOrders(status);
  }

  @Put('admin/:id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'עדכון סטטוס הזמנה (מנהל)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.ordersService.updateOrderStatus(id, status);
  }

  @Get('admin/reports/by-vendor')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'דוח מכירות לפי ספק (מנהל)' })
  getSalesByVendor(@Query('vendorId') vendorId?: string) {
    return this.ordersService.getSalesByVendor(vendorId);
  }

  @Get('admin/reports/dashboard')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'סטטיסטיקות דשבורד (מנהל)' })
  getDashboardStats() {
    return this.ordersService.getDashboardStats();
  }
}
