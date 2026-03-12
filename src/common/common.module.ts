import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailService } from './services/email.service';
import { EmailListener } from './listeners/email.listener';
import { TranslationService } from './services/translation.service';
import { StartupSeedService } from './services/startup-seed.service';
import { User } from '../users/user.entity';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([User])],
  providers: [EmailService, EmailListener, TranslationService, StartupSeedService],
  exports: [EmailService, TranslationService],
})
export class CommonModule {}
