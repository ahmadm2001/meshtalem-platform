import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VendorsService } from './vendors.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, User } from '../users/user.entity';
import { VendorStatus } from './vendor.entity';

@ApiTags('Vendors - ספקים')
@Controller('vendors')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // ========== VENDOR ==========

  @Get('my-profile')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'פרופיל הספק המחובר' })
  getMyProfile(@CurrentUser() user: User) {
    return this.vendorsService.getMyProfile(user.id);
  }

  @Put('my-profile')
  @UseGuards(RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiOperation({ summary: 'עדכון פרופיל ספק' })
  updateMyProfile(@CurrentUser() user: User, @Body() body: any) {
    return this.vendorsService.updateMyProfile(user.id, body);
  }

  // ========== ADMIN ==========

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'כל הספקים (מנהל)' })
  getAllVendors(@Query('status') status?: VendorStatus) {
    return this.vendorsService.getAllVendors(status);
  }

  @Get('admin/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'פרטי ספק (מנהל)' })
  getVendorById(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendorsService.getVendorById(id);
  }

  @Put('admin/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'אישור ספק (מנהל)' })
  approveVendor(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendorsService.approveVendor(id);
  }

  @Put('admin/:id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'דחיית ספק (מנהל)' })
  rejectVendor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.vendorsService.rejectVendor(id, reason);
  }

  @Put('admin/:id/suspend')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'השהיית ספק (מנהל)' })
  suspendVendor(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendorsService.suspendVendor(id);
  }
}
