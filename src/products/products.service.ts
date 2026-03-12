import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductStatus } from './product.entity';
import { Vendor } from '../vendors/vendor.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
  ) {}

  // Helper: get vendor.id from user.id
  private async getVendorIdByUserId(userId: string): Promise<string> {
    const vendor = await this.vendorRepository.findOne({
      where: { user: { id: userId } },
    });
    if (!vendor) throw new NotFoundException('ספק לא נמצא');
    return vendor.id;
  }

  // ==================== ADMIN CREATE ====================

  async adminCreateProduct(dto: any) {
    const product = this.productRepository.create({
      nameAr: dto.name || dto.nameAr || '',
      nameHe: dto.name || dto.nameHe || dto.nameAr || '',
      descriptionAr: dto.description || dto.descriptionAr || '',
      descriptionHe: dto.description || dto.descriptionHe || dto.descriptionAr || '',
      // Q DOOR pricing fields
      baseEstimatedPrice: dto.baseEstimatedPrice != null ? Number(dto.baseEstimatedPrice) : null,
      depositAmount: dto.depositAmount != null ? Number(dto.depositAmount) : null,
      manufacturingTime: dto.manufacturingTime || null,
      // Legacy price fields (kept for backward compatibility)
      customerPrice: dto.baseEstimatedPrice || dto.price || 0,
      vendorPrice: dto.baseEstimatedPrice || dto.price || 0,
      shippingFee: dto.shippingFee || 0,
      warranty: dto.warranty || null,
      deliveryTime: dto.deliveryTime || null,
      colors: dto.colors && dto.colors.length > 0 ? dto.colors : null,
      productOptions: dto.productOptions && dto.productOptions.length > 0 ? dto.productOptions : null,
      stock: 0,  // Doors are made-to-order, no stock tracking
      images: dto.images || [],
      categoryId: dto.categoryId || null,
      status: ProductStatus.APPROVED,  // Admin products are auto-approved
      isHidden: dto.isHidden ?? false,
    });
    return this.productRepository.save(product);
  }

  // ==================== VENDOR ACTIONS ====================

  async createProduct(userId: string, dto: CreateProductDto) {
    const vendorId = await this.getVendorIdByUserId(userId);

    // Platform is Hebrew-only: nameAr field is used for Hebrew input
    // nameHe = nameAr (same value, no translation needed)
    const product = this.productRepository.create({
      vendorId,
      categoryId: dto.categoryId,
      nameAr: dto.nameAr,
      descriptionAr: dto.descriptionAr,
      nameHe: dto.nameAr,         // Hebrew = same as input (no translation)
      descriptionHe: dto.descriptionAr,
      vendorPrice: dto.price,
      customerPrice: dto.price,   // defaults to vendor price until admin changes it
      shippingFee: dto.shippingFee || 0,
      warranty: dto.warranty,
      deliveryTime: dto.deliveryTime || null,
      colors: dto.colors && dto.colors.length > 0 ? dto.colors : null,
      productOptions: dto.productOptions && dto.productOptions.length > 0 ? dto.productOptions : null,
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

    if (!product) throw new NotFoundException('המוצר לא נמצא');

    // Hebrew-only: sync nameHe/descriptionHe with nameAr/descriptionAr
    if (dto.nameAr) {
      dto['nameHe'] = dto.nameAr;
      dto['translationApproved'] = false;
    }
    if (dto.descriptionAr !== undefined) {
      dto['descriptionHe'] = dto.descriptionAr;
    }

    if (dto.nameAr || dto.descriptionAr || dto.price) {
      dto['status'] = ProductStatus.PENDING;
    }

    // Vendor can only update vendorPrice, not customerPrice
    if (dto.price !== undefined) {
      dto['vendorPrice'] = dto.price;
      delete dto.price;
    }

    // Handle colors update
    if (dto['colors'] !== undefined) {
      product.colors = dto['colors'] && dto['colors'].length > 0 ? dto['colors'] : null;
      delete dto['colors'];
    }

    // Handle productOptions update
    if (dto['productOptions'] !== undefined) {
      product.productOptions = dto['productOptions'] && dto['productOptions'].length > 0 ? dto['productOptions'] : null;
      delete dto['productOptions'];
    }

    // Handle deliveryTime update
    if (dto['deliveryTime'] !== undefined) {
      product.deliveryTime = dto['deliveryTime'] || null;
      delete dto['deliveryTime'];
    }

    Object.assign(product, dto);
    return this.productRepository.save(product);
  }

  async deleteProduct(productId: string, userId: string) {
    const vendorId = await this.getVendorIdByUserId(userId);
    const product = await this.productRepository.findOne({
      where: { id: productId, vendorId },
    });
    if (!product) throw new NotFoundException('המוצר לא נמצא');
    await this.productRepository.remove(product);
    return { message: 'המוצר נמחק בהצלחה' };
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
        'product.customerPrice',
        'product.warranty',
        'product.deliveryTime',
        'product.colors',
        'product.productOptions',
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
        '(product.nameHe LIKE :search OR product.descriptionHe LIKE :search OR product.nameAr LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.minPrice) {
      query.andWhere('product.customerPrice >= :minPrice', { minPrice: filters.minPrice });
    }

    if (filters?.maxPrice) {
      query.andWhere('product.customerPrice <= :maxPrice', { maxPrice: filters.maxPrice });
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
        'product.customerPrice',
        'product.warranty',
        'product.deliveryTime',
        'product.colors',
        'product.productOptions',
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

    // Hebrew-only: ensure nameHe is set
    if (!product.nameHe) {
      product.nameHe = product.nameAr;
    }
    if (!product.descriptionHe && product.descriptionAr) {
      product.descriptionHe = product.descriptionAr;
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

    // Hebrew-only: sync nameHe with nameAr if nameAr is updated
    if (dto.nameAr && !dto.nameHe) {
      dto.nameHe = dto.nameAr;
    }
    if (dto.descriptionAr !== undefined && !dto.descriptionHe) {
      dto.descriptionHe = dto.descriptionAr;
    }

    // Admin sets customerPrice separately; vendorPrice is never changed by admin
    if (dto.price !== undefined) {
      product.customerPrice = dto.price;
      delete dto.price;
    }
    // Never allow admin to overwrite vendorPrice
    delete dto.vendorPrice;

    // Handle colors
    if (dto.colors !== undefined) {
      product.colors = dto.colors && dto.colors.length > 0 ? dto.colors : null;
      delete dto.colors;
    }

    // Handle productOptions
    if (dto.productOptions !== undefined) {
      product.productOptions = dto.productOptions && dto.productOptions.length > 0 ? dto.productOptions : null;
      delete dto.productOptions;
    }

    // Handle deliveryTime
    if (dto.deliveryTime !== undefined) {
      product.deliveryTime = dto.deliveryTime || null;
      delete dto.deliveryTime;
    }

    // Handle Q DOOR specific fields
    if (dto.baseEstimatedPrice !== undefined) {
      product.baseEstimatedPrice = dto.baseEstimatedPrice != null ? Number(dto.baseEstimatedPrice) : null;
      // Keep legacy customerPrice in sync
      if (dto.baseEstimatedPrice) product.customerPrice = Number(dto.baseEstimatedPrice);
      delete dto.baseEstimatedPrice;
    }
    if (dto.depositAmount !== undefined) {
      product.depositAmount = dto.depositAmount != null ? Number(dto.depositAmount) : null;
      delete dto.depositAmount;
    }
    if (dto.manufacturingTime !== undefined) {
      product.manufacturingTime = dto.manufacturingTime || null;
      delete dto.manufacturingTime;
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
