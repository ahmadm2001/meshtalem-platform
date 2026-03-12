import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../users/user.entity';
import { User } from '../users/user.entity';

@ApiTags('Products - מוצרים')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ========== PUBLIC ROUTES (Customers) ==========

  @Get('public')
  @ApiOperation({ summary: 'קבלת כל המוצרים המאושרים (ללקוחות)' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getPublicProducts(
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.productsService.getPublicProducts({
      categoryId,
      search,
      minPrice,
      maxPrice,
      page,
      limit,
    });
  }

  @Get('public/:id')
  @ApiOperation({ summary: 'קבלת מוצר בודד (ללקוחות)' })
  getPublicProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.getPublicProductById(id);
  }

  // ========== VENDOR ROUTES ==========

  @Post('vendor')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'הוספת מוצר חדש (ספק)' })
  createProduct(@CurrentUser() user: User, @Body() dto: CreateProductDto) {
    return this.productsService.createProduct(user.id, dto);
  }

  @Get('vendor/my-products')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'קבלת המוצרים של הספק המחובר' })
  getMyProducts(@CurrentUser() user: User) {
    return this.productsService.getVendorProducts(user.id);
  }

  @Put('vendor/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'עריכת מוצר (ספק)' })
  updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.updateProduct(id, user.id, dto);
  }

  @Delete('vendor/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'מחיקת מוצר (ספק)' })
  deleteProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.productsService.deleteProduct(id, user.id);
  }

  // ========== ADMIN ROUTES ==========

  @Post('admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'יצירת מוצר חדש (מנהל) - ישירות מאושר' })
  adminCreateProduct(@Body() dto: any) {
    return this.productsService.adminCreateProduct(dto);
  }

  @Get('admin/all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'כל המוצרים (מנהל) - עם פרטי ספק' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'vendorId', required: false })
  getAllProducts(
    @Query('status') status?: string,
    @Query('vendorId') vendorId?: string,
  ) {
    return this.productsService.getAllProducts(status, vendorId);
  }

  @Get('admin/pending')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'מוצרים ממתינים לאישור (מנהל)' })
  getPendingProducts() {
    return this.productsService.getPendingProducts();
  }

  @Get('admin/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'פרטי מוצר מלאים (מנהל) - כולל ספק' })
  getProductAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.getProductByIdAdmin(id);
  }

  @Put('admin/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'עריכת מוצר (מנהל) - עריכה מלאה' })
  adminUpdateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
  ) {
    return this.productsService.adminUpdateProduct(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'מחיקת מוצר (מנהל) - מחיקה מוחלטת' })
  adminDeleteProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.adminDeleteProduct(id);
  }

  @Patch('admin/:id/toggle-hide')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'הסתרה/הצגה של מוצר (מנהל)' })
  toggleHideProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.toggleHideProduct(id);
  }

  @Put('admin/:id/approve')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'אישור מוצר (מנהל)' })
  approveProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('adminNote') adminNote?: string,
  ) {
    return this.productsService.approveProduct(id, adminNote);
  }

  @Put('admin/:id/reject')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'דחיית מוצר (מנהל)' })
  rejectProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.productsService.rejectProduct(id, reason);
  }

  @Put('admin/:id/translation')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'עריכת תרגום מוצר (מנהל)' })
  updateTranslation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('nameHe') nameHe: string,
    @Body('descriptionHe') descriptionHe: string,
  ) {
    return this.productsService.adminUpdateTranslation(id, nameHe, descriptionHe);
  }
}
