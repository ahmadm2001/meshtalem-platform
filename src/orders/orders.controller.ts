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
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, User } from '../users/user.entity';
import { OrderStatus, ItemStatus } from './order.entity';

@ApiTags('Orders - הזמנות')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ========== GUEST / PUBLIC ==========

  @Post('guest')
  @ApiOperation({ summary: 'יצירת הזמנה ללא התחברות (guest)' })
  createGuestOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.createGuestOrder(dto);
  }

  // ========== PUBLIC TRACKING ==========

  @Get('track/:orderId')
  @ApiOperation({ summary: 'מעקב הזמנה ציבורי (ללא התחברות)' })
  trackOrder(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.ordersService.getOrderByIdPublic(orderId);
  }

  // ========== VENDOR ==========

  @Get('vendor')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'הזמנות הספק (מוצרים שנמכרו)' })
  getVendorOrders(@CurrentUser() user: User) {
    return this.ordersService.getVendorOrders(user.id);
  }

  @Get('vendor/stats')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'סטטיסטיקות ספק' })
  getVendorStats(@CurrentUser() user: User) {
    return this.ordersService.getVendorStats(user.id);
  }

  @Put('vendor/items/:itemId/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'עדכון סטטוס פריט הזמנה (ספק)' })
  updateItemStatus(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body('status') status: ItemStatus,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.updateItemStatus(itemId, user.id, status);
  }

  // ========== ADMIN ==========

  @Get('admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'כל ההזמנות (מנהל)' })
  getAllOrders(@Query('status') status?: OrderStatus) {
    return this.ordersService.getAllOrders(status);
  }

  @Put('admin/:id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'עדכון סטטוס הזמנה (מנהל)' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.ordersService.updateOrderStatus(id, status);
  }

  @Get('admin/reports/by-vendor')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'דוח מכירות לפי ספק (מנהל)' })
  getSalesByVendor(@Query('vendorId') vendorId?: string) {
    return this.ordersService.getSalesByVendor(vendorId);
  }

  @Get('admin/reports/dashboard')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'סטטיסטיקות דשבורד (מנהל)' })
  getDashboardStats() {
    return this.ordersService.getDashboardStats();
  }
}
