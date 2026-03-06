import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from '../users/user.entity';
import { Vendor, VendorStatus } from '../vendors/vendor.entity';
import { RegisterCustomerDto, RegisterVendorDto, LoginDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    private jwtService: JwtService,
  ) {}

  async registerCustomer(dto: RegisterCustomerDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      fullName: dto.fullName,
      phone: dto.phone,
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
    });

    await this.userRepository.save(user);
    return this.generateTokenResponse(user);
  }

  async registerVendor(dto: RegisterVendorDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('البريد الإلكتروني مستخدم بالفعل');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = this.userRepository.create({
      email: dto.email,
      password: hashedPassword,
      fullName: dto.fullName,
      phone: dto.phone,
      role: UserRole.VENDOR,
      status: UserStatus.INACTIVE, // Inactive until admin approves
    });

    const savedUser = await this.userRepository.save(user);

    const vendor = this.vendorRepository.create({
      user: savedUser,
      businessName: dto.businessName,
      description: dto.description,
      phone: dto.phone,
      address: dto.address,
      status: VendorStatus.PENDING,
    });

    await this.vendorRepository.save(vendor);

    return {
      message: 'تم تقديم طلب التسجيل بنجاح. سيتم مراجعته من قبل الإدارة.',
      status: 'pending',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException('تم حظر هذا الحساب. يرجى التواصل مع الدعم.');
    }

    if (user.role === UserRole.VENDOR && user.status === UserStatus.INACTIVE) {
      throw new UnauthorizedException('حسابك قيد المراجعة. يرجى الانتظار حتى يتم الموافقة عليه.');
    }

    // Load vendor status if vendor
    let vendorStatus: string | undefined;
    if (user.role === UserRole.VENDOR) {
      const vendor = await this.vendorRepository.findOne({
        where: { user: { id: user.id } },
      });
      vendorStatus = vendor?.status;
    }
    return this.generateTokenResponse(user, vendorStatus);
  }

  private generateTokenResponse(user: User, vendorStatus?: string) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        ...(vendorStatus !== undefined && { vendorStatus }),
      },
    };
  }
}
