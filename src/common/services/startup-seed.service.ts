import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../../users/user.entity';

@Injectable()
export class StartupSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StartupSeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.seedAdmin();
    } catch (err) {
      this.logger.warn('Seed skipped (tables may not be ready yet): ' + err?.message);
    }
  }

  private async seedAdmin() {
    const existing = await this.userRepo.findOne({ where: { email: 'admin@meshtalem.com' } });
    if (!existing) {
      const hash = await bcrypt.hash('Admin@2024', 10);
      const admin = this.userRepo.create({
        email: 'admin@meshtalem.com',
        password: hash,
        fullName: 'مدير النظام',
        phone: '0500000000',
        role: 'admin',
        status: 'active',
      } as any);
      await this.userRepo.save(admin);
      this.logger.log('✅ Admin user created: admin@meshtalem.com / Admin@2024');
    } else {
      this.logger.log('ℹ️  Admin user already exists');
    }
  }
}
