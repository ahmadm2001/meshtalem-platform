import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderItem, OrderStatus, PaymentStatus } from './order.entity';
import { Product, ProductStatus } from '../products/product.entity';
import { Vendor } from '../vendors/vendor.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Vendor)
    private vendorRepository: Repository<Vendor>,
  ) {}

  // Helper: get vendor.id from user.id
  private async getVendorIdByUserId(userId: string): Promise<string | null> {
    const vendor = await this.vendorRepository.findOne({
      where: { user: { id: userId } },
    });
    return vendor?.id || null;
  }

  async createOrder(customerId: string, dto: CreateOrderDto) {
    // Validate all products and calculate totals
    const orderItems: Partial<OrderItem>[] = [];
    let subtotal = 0;

    for (const item of dto.items) {
      const product = await this.productRepository.findOne({
        where: { id: item.productId, status: ProductStatus.APPROVED },
      });

      if (!product) {
        throw new NotFoundException(`המוצר ${item.productId} לא נמצא`);
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `אין מספיק מלאי עבור ${product.nameHe}`,
        );
      }

      const lineTotal = Number(product.price) * item.quantity;
      subtotal += lineTotal;

      orderItems.push({
        productId: product.id,
        vendorId: product.vendorId,
        productNameHe: product.nameHe,
        productImageUrl: product.images?.[0] || undefined,
        priceAtPurchase: product.price,
        quantity: item.quantity,
        lineTotal,
      });
    }

    const shippingCost = 25; // Fixed shipping cost (configurable)
    const total = subtotal + shippingCost;

    const order = this.orderRepository.create({
      customerId,
      shippingFullName: dto.shippingFullName,
      shippingPhone: dto.shippingPhone,
      shippingCity: dto.shippingCity,
      shippingStreet: dto.shippingStreet,
      shippingApartment: dto.shippingApartment,
      shippingZipCode: dto.shippingZipCode,
      shippingNotes: dto.shippingNotes,
      subtotal,
      shippingCost,
      total,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Save order items
    for (const item of orderItems) {
      const orderItem = this.orderItemRepository.create({
        ...item,
        orderId: savedOrder.id,
      });
      await this.orderItemRepository.save(orderItem);
    }

    // Reduce stock
    for (const item of dto.items) {
      await this.productRepository.decrement(
        { id: item.productId },
        'stock',
        item.quantity,
      );
    }

    return this.orderRepository.findOne({
      where: { id: savedOrder.id },
      relations: ['items'],
    });
  }

  async getMyOrders(customerId: string) {
    return this.orderRepository.find({
      where: { customerId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOrderById(orderId: string, customerId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, customerId },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException('ההזמנה לא נמצאה');
    return order;
  }

  async cancelOrder(orderId: string, customerId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, customerId },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException('ההזמנה לא נמצאה');

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('לא ניתן לבטל הזמנה שכבר בטיפול');
    }

    order.status = OrderStatus.CANCELLED;
    await this.orderRepository.save(order);

    // Restore stock
    for (const item of order.items) {
      await this.productRepository.increment(
        { id: item.productId },
        'stock',
        item.quantity,
      );
    }

    return { message: 'ההזמנה בוטלה בהצלחה' };
  }

  // ========== VENDOR ACTIONS ==========

  async getVendorOrders(userId: string) {
    const vendorId = await this.getVendorIdByUserId(userId);
    if (!vendorId) return [];
    return this.orderItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.order', 'order')
      .where('item.vendorId = :vendorId', { vendorId })
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }

  async getVendorStats(userId: string) {
    const vendorId = await this.getVendorIdByUserId(userId);
    if (!vendorId) return { totalRevenue: 0, totalOrders: 0, activeProducts: 0, pendingOrders: 0 };
    const [revenueResult, totalOrders, pendingOrders] = await Promise.all([
      this.orderItemRepository
        .createQueryBuilder('item')
        .select('SUM(item.lineTotal)', 'total')
        .where('item.vendorId = :vendorId', { vendorId })
        .getRawOne(),
      this.orderItemRepository
        .createQueryBuilder('item')
        .leftJoin('item.order', 'order')
        .where('item.vendorId = :vendorId', { vendorId })
        .select('COUNT(DISTINCT item.orderId)', 'count')
        .getRawOne(),
      this.orderItemRepository
        .createQueryBuilder('item')
        .leftJoin('item.order', 'order')
        .where('item.vendorId = :vendorId', { vendorId })
        .andWhere('order.status = :status', { status: OrderStatus.PENDING })
        .select('COUNT(DISTINCT item.orderId)', 'count')
        .getRawOne(),
    ]);
    return {
      totalRevenue: Number(revenueResult?.total || 0),
      totalOrders: Number(totalOrders?.count || 0),
      activeProducts: 0, // will be filled by products service
      pendingOrders: Number(pendingOrders?.count || 0),
    };
  }

  // ========== ADMIN ACTIONS ==========

  async getAllOrders(status?: OrderStatus) {
    const where = status ? { status } : {};
    return this.orderRepository.find({
      where,
      relations: ['items', 'customer'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('ההזמנה לא נמצאה');
    order.status = status;
    return this.orderRepository.save(order);
  }

  // ========== REPORTS ==========

  async getSalesByVendor(vendorId?: string) {
    const query = this.orderItemRepository
      .createQueryBuilder('item')
      .leftJoin('item.order', 'order')
      .select('item.vendorId', 'vendorId')
      .addSelect('SUM(item.lineTotal)', 'totalRevenue')
      .addSelect('COUNT(DISTINCT order.id)', 'totalOrders')
      .addSelect('SUM(item.quantity)', 'totalItemsSold')
      .where('order.paymentStatus = :paid', { paid: PaymentStatus.PAID })
      .groupBy('item.vendorId');

    if (vendorId) {
      query.andWhere('item.vendorId = :vendorId', { vendorId });
    }

    return query.getRawMany();
  }

  async getDashboardStats() {
    const [totalOrders, totalRevenue, pendingOrders, activeVendors, activeProducts] = await Promise.all([
      this.orderRepository.count(),
      this.orderRepository
        .createQueryBuilder('order')
        .select('SUM(order.total)', 'total')
        .where('order.paymentStatus = :paid', { paid: PaymentStatus.PAID })
        .getRawOne(),
      this.orderRepository.count({ where: { status: OrderStatus.PENDING } }),
      this.vendorRepository.count({ where: { status: 'approved' as any } }),
      this.productRepository.count({ where: { status: ProductStatus.APPROVED } }),
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue?.total || 0,
      pendingOrders,
      activeVendors,
      activeProducts,
    };
  }
}
