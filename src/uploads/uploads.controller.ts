import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';
import { memoryStorage } from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

// ─── Allowed MIME types ───────────────────────────────────────────────────────

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ─── Controller ───────────────────────────────────────────────────────────────

@Controller('uploads')
export class UploadsController {
  private cloudinaryConfigured = false;

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret &&
        cloudName !== 'your_cloud_name' &&
        apiKey !== 'your_cloudinary_api_key') {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
      this.cloudinaryConfigured = true;
    }
  }

  /**
   * POST /api/v1/uploads/image
   * Admin-only endpoint to upload an image file.
   * Returns { url: string } pointing to the hosted image.
   *
   * Strategy:
   *  1. If Cloudinary is configured → upload to Cloudinary CDN
   *  2. Otherwise → convert to base64 data URL (works without external service,
   *     stored inline in the DB / JSON — suitable for dev/demo)
   */
  @Post('image')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`סוג קובץ לא נתמך: ${file.mimetype}. מותר: JPEG, PNG, WebP, GIF`), false);
        }
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File): Promise<{ url: string; publicId?: string }> {
    if (!file) {
      throw new BadRequestException('לא נשלח קובץ');
    }

    // ── Cloudinary upload ─────────────────────────────────────────────────────
    if (this.cloudinaryConfigured) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'qdoor/products',
            resource_type: 'image',
            transformation: [
              { quality: 'auto:good', fetch_format: 'auto' },
              { width: 2000, height: 2000, crop: 'limit' },
            ],
          },
          (error, result) => {
            if (error || !result) {
              reject(new BadRequestException(`שגיאת Cloudinary: ${error?.message || 'שגיאה לא ידועה'}`));
            } else {
              resolve({ url: result.secure_url, publicId: result.public_id });
            }
          },
        );
        uploadStream.end(file.buffer);
      });
    }

    // ── Fallback: base64 data URL ─────────────────────────────────────────────
    // Works without any external service. Suitable for development / demo.
    // Note: large images will inflate the DB — configure Cloudinary for production.
    const base64 = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64}`;
    return { url: dataUrl };
  }
}
