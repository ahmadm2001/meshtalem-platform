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

  @Get()
  @ApiOperation({ summary: 'קבלת כל הקטגוריות (ציבורי)' })
  getAllCategories() {
    return this.categoriesService.getAllCategories();
  }

  @Post('admin')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'יצירת קטגוריה חדשה (מנהל)' })
  createCategory(@Body() body: any) {
    return this.categoriesService.createCategory(body);
  }

  @Put('admin/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'עריכת קטגוריה (מנהל)' })
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
