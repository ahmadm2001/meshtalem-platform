import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor, VendorStatus } from './vendor.entity';
import { User, UserStatus } from '../users/user.entity';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getMyProfile(userId: string) {
    const vendor = await this.vendorRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!vendor) throw new NotFoundException('الملف الشخصي غير موجود');
    return vendor;
  }

  async updateMyProfile(userId: string, updateData: Partial<Vendor>) {
    const vendor = await this.vendorRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!vendor) throw new NotFoundException('الملف الشخصي غير موجود');
    Object.assign(vendor, updateData);
    return this.vendorRepository.save(vendor);
  }

  // ========== ADMIN ACTIONS ==========

  async getAllVendors(status?: VendorStatus) {
    const where = status ? { status } : {};
    return this.vendorRepository.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getVendorById(vendorId: string) {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: ['user'],
    });
    if (!vendor) throw new NotFoundException('הספק לא נמצא');
    return vendor;
  }

  async approveVendor(vendorId: string) {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: ['user'],
    });
    if (!vendor) throw new NotFoundException('הספק לא נמצא');

    vendor.status = VendorStatus.APPROVED;
    await this.vendorRepository.save(vendor);

    // Activate the user account
    vendor.user.status = UserStatus.ACTIVE;
    await this.userRepository.save(vendor.user);

    return { message: 'הספק אושר בהצלחה', vendor };
  }

  async rejectVendor(vendorId: string, reason: string) {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: ['user'],
    });
    if (!vendor) throw new NotFoundException('הספק לא נמצא');

    vendor.status = VendorStatus.REJECTED;
    vendor.rejectionReason = reason;
    await this.vendorRepository.save(vendor);

    return { message: 'הספק נדחה', vendor };
  }

  async suspendVendor(vendorId: string) {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: ['user'],
    });
    if (!vendor) throw new NotFoundException('הספק לא נמצא');

    vendor.status = VendorStatus.SUSPENDED;
    await this.vendorRepository.save(vendor);

    vendor.user.status = UserStatus.INACTIVE;
    await this.userRepository.save(vendor.user);

    return { message: 'הספק הושהה', vendor };
  }
}
