import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductStatus } from './product.entity';
import { Vendor } from '../vendors/vendor.entity';
import { TranslationService } from '../common/services/translation.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
    private translationService: TranslationService,
  ) {}

  // Helper: get vendor.id from user.id
  private async getVendorIdByUserId(userId: string): Promise<string> {
    const vendor = await this.vendorRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!vendor) throw new NotFoundException('لم يتم العثور على ملف المورد');
    return vendor.id;
  }

  // ==================== VENDOR ACTIONS ====================

  async createProduct(userId: string, dto: CreateProductDto) {
    const vendorId = await this.getVendorIdByUserId(userId);
    // Auto-translate Arabic content to Hebrew using AI
    const { nameHe, descriptionHe } =
      await this.translationService.translateProductContent(
        dto.nameAr,
        dto.descriptionAr || '',
      );

    const product = this.productRepository.create({
      vendorId,
      categoryId: dto.categoryId,
      nameAr: dto.nameAr,
      descriptionAr: dto.descriptionAr,
      nameHe,
      descriptionHe,
      price: dto.price,
      stock: dto.stock,
      images: dto.images || [],
      status: ProductStatus.PENDING,
    });

    return this.productRepository.save(product);
  }

  async updateProduct(productId: string, userId: string, dto: UpdateProductDto) {
    const vendorId = await this.getVendorIdByUserId(userId);
    const product = await this.productRepository.findOne({
      where: { id: productId, vendorId },
    });

    if (!product) throw new NotFoundException('المنتج غير موجود');

    if (dto.nameAr || dto.descriptionAr) {
      const { nameHe, descriptionHe } =
        await this.translationService.translateProductContent(
          dto.nameAr || product.nameAr,
          dto.descriptionAr || product.descriptionAr || '',
        );
      dto['nameHe'] = nameHe;
      dto['descriptionHe'] = descriptionHe;
      dto['translationApproved'] = false;
    }

    if (dto.nameAr || dto.descriptionAr || dto.price) {
      dto['status'] = ProductStatus.PENDING;
    }

    Object.assign(product, dto);
    return this.productRepository.save(product);
  }

  async deleteProduct(productId: string, userId: string) {
    const vendorId = await this.getVendorIdByUserId(userId);
    const product = await this.productRepository.findOne({
      where: { id: productId, vendorId },
    });
    if (!product) throw new NotFoundException('المنتج غير موجود');
    await this.productRepository.remove(product);
    return { message: 'تم حذف المنتج بنجاح' };
  }

  async getVendorProducts(userId: string) {
    const vendorId = await this.getVendorIdByUserId(userId);
    return this.productRepository.find({
      where: { vendorId },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
  }

  // ==================== CUSTOMER ACTIONS ====================

  async getPublicProducts(filters?: {
    categoryId?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.status = :status', { status: ProductStatus.APPROVED })
      .andWhere('product.stock > 0')
      .andWhere('product.isHidden = false')
      .select([
        'product.id',
        'product.nameHe',
        'product.descriptionHe',
        'product.price',
        'product.stock',
        'product.images',
        'product.createdAt',
        'category.id',
        'category.nameHe',
      ]);

    if (filters?.categoryId) {
      query.andWhere('product.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters?.search) {
      query.andWhere(
        '(product.nameHe ILIKE :search OR product.descriptionHe ILIKE :search OR product.nameAr ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.minPrice) {
      query.andWhere('product.price >= :minPrice', { minPrice: filters.minPrice });
    }

    if (filters?.maxPrice) {
      query.andWhere('product.price <= :maxPrice', { maxPrice: filters.maxPrice });
    }

    const [products, total] = await query
      .skip(skip)
      .take(limit)
      .orderBy('product.createdAt', 'DESC')
      .getManyAndCount();

    return {
      products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPublicProductById(productId: string) {
    const product = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.id = :id', { id: productId })
      .andWhere('product.status = :status', { status: ProductStatus.APPROVED })
      .andWhere('product.isHidden = false')
      .select([
        'product.id',
        'product.nameHe',
        'product.descriptionHe',
        'product.price',
        'product.stock',
        'product.images',
        'product.createdAt',
        'category.id',
        'category.nameHe',
      ])
      .getOne();

    if (!product) throw new NotFoundException('המוצר לא נמצא');
    return product;
  }

  // ==================== ADMIN ACTIONS ====================

  async getAllProducts(status?: string, vendorId?: string) {
    const query = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.vendor', 'vendor')
      .leftJoinAndSelect('vendor.user', 'user')
      .leftJoinAndSelect('product.category', 'category')
      .orderBy('product.createdAt', 'DESC');

    if (status) {
      query.andWhere('product.status = :status', { status });
    }
    if (vendorId) {
      query.andWhere('product.vendorId = :vendorId', { vendorId });
    }

    return query.getMany();
  }

  async getPendingProducts() {
    return this.productRepository.find({
      where: { status: ProductStatus.PENDING },
      relations: ['vendor', 'vendor.user', 'category'],
      order: { createdAt: 'ASC' },
    });
  }

  async getProductByIdAdmin(productId: string) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['vendor', 'vendor.user', 'category'],
    });
    if (!product) throw new NotFoundException('המוצר לא נמצא');
    return product;
  }

  async approveProduct(productId: string, adminNote?: string) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['vendor', 'vendor.user', 'category'],
    });
    if (!product) throw new NotFoundException('המוצר לא נמצא');

    // Auto-translate if Hebrew name is missing or same as Arabic
    if (!product.nameHe || product.nameHe === product.nameAr) {
      try {
        const { nameHe, descriptionHe } = await this.translationService.translateProductContent(
          product.nameAr,
          product.descriptionAr || '',
        );
        product.nameHe = nameHe;
        if (descriptionHe) product.descriptionHe = descriptionHe;
      } catch (e) {
        // Translation failed - keep existing values
      }
    }

    product.status = ProductStatus.APPROVED;
    product.translationApproved = true;
    if (adminNote) product.adminNote = adminNote;

    return this.productRepository.save(product);
  }

  async rejectProduct(productId: string, reason: string) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('המוצר לא נמצא');

    product.status = ProductStatus.REJECTED;
    product.rejectionReason = reason;

    return this.productRepository.save(product);
  }

  async adminUpdateProduct(productId: string, dto: any) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['vendor', 'vendor.user', 'category'],
    });
    if (!product) throw new NotFoundException('המוצר לא נמצא');

    // If admin changes Arabic content, re-translate
    if (dto.nameAr || dto.descriptionAr) {
      const { nameHe, descriptionHe } =
        await this.translationService.translateProductContent(
          dto.nameAr || product.nameAr,
          dto.descriptionAr || product.descriptionAr || '',
        );
      if (!dto.nameHe) dto.nameHe = nameHe;
      if (!dto.descriptionHe) dto.descriptionHe = descriptionHe;
    }

    Object.assign(product, dto);
    return this.productRepository.save(product);
  }

  async adminDeleteProduct(productId: string) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('המוצר לא נמצא');
    await this.productRepository.remove(product);
    return { message: 'המוצר נמחק בהצלחה' };
  }

  async toggleHideProduct(productId: string) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('המוצר לא נמצא');
    product.isHidden = !product.isHidden;
    await this.productRepository.save(product);
    return { message: product.isHidden ? 'המוצר הוסתר' : 'המוצר הוצג מחדש', isHidden: product.isHidden };
  }

  async adminUpdateTranslation(
    productId: string,
    nameHe: string,
    descriptionHe: string,
  ) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('המוצר לא נמצא');

    product.nameHe = nameHe;
    product.descriptionHe = descriptionHe;
    product.translationApproved = true;

    return this.productRepository.save(product);
  }
}
