import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/user.entity';

@ApiTags('Categories - קטגוריות')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /** GET /categories - tree: root categories with children nested */
  @Get()
  @ApiOperation({ summary: 'קבלת כל הקטגוריות עם תת-קטגוריות (ציבורי)' })
  getAllCategories() {
    return this.categoriesService.getAllCategories();
  }

  /** GET /categories/flat - flat list of all categories */
  @Get('flat')
  @ApiOperation({ summary: 'רשימה שטוחה של כל הקטגוריות (ציבורי)' })
  getAllFlat() {
    return this.categoriesService.getAllFlat();
  }

  /** GET /categories/:id - single category with children */
  @Get(':id')
  @ApiOperation({ summary: 'קבלת קטגוריה בודדת עם תת-קטגוריות' })
  getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.getById(id);
  }

  @Post('admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'יצירת קטגוריה חדשה (מנהל) - parentId אופציונלי לתת-קטגוריה' })
  createCategory(@Body() body: any) {
    return this.categoriesService.createCategory(body);
  }

  @Put('admin/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'עריכת קטגוריה (מנהל) - parentId: null להפוך לראשית' })
  updateCategory(@Param('id', ParseUUIDPipe) id: string, @Body() body: any) {
    return this.categoriesService.updateCategory(id, body);
  }

  @Delete('admin/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'מחיקת קטגוריה (מנהל)' })
  deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.deleteCategory(id);
  }
}
