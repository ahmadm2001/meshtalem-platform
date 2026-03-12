import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order, OrderItem, OrderStatus, PaymentStatus, ItemStatus } from './order.entity';
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
    private eventEmitter: EventEmitter2,
  ) {}

  // Helper: get vendor.id from user.id
  private async getVendorIdByUserId(userId: string): Promise<string | null> {
    const vendor = await this.vendorRepository.findOne({
      where: { user: { id: userId } },
    });
    return vendor?.id || null;
  }

  async createGuestOrder(dto: CreateOrderDto) {
    return this.createOrderInternal(null, dto);
  }

  async createOrder(customerId: string, dto: CreateOrderDto) {
    return this.createOrderInternal(customerId, dto);
  }

  private async createOrderInternal(customerId: string | null, dto: CreateOrderDto) {
    // Fetch all products and vendors in batch for efficiency
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.productRepository.findByIds(productIds);
    const productMap = new Map(products.map((p) => [p.id, p]));

    // Collect vendor IDs to fetch vendor names
    const vendorIds = [...new Set(products.map((p) => p.vendorId).filter(Boolean))];
    const vendors = vendorIds.length > 0 ? await this.vendorRepository.findByIds(vendorIds) : [];
    const vendorMap = new Map(vendors.map((v) => [v.id, v.businessName || v.businessNameHe || '']));

    const orderItemsData: Partial<OrderItem>[] = [];
    let subtotalCustomer = 0;
    let totalVendorCost = 0;

    for (const item of dto.items) {
      const product = productMap.get(item.productId);

      if (!product || product.status !== ProductStatus.APPROVED) {
        throw new NotFoundException(`המוצר ${item.productId} לא נמצא`);
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(`אין מספיק מלאי עבור ${product.nameHe}`);
      }

      const baseCustomerPrice = Number(product.customerPrice || product.vendorPrice || 0);
      const vendorPriceAtPurchase = Number(product.vendorPrice || 0);
      const shippingFeeAtPurchase = Number(product.shippingFee || 0);
      const qty = item.quantity;

      // Calculate options extra cost from selectedOptions snapshot
      let optionsExtraCost = 0;
      let selectedOptionsSnapshot: { groupName: string; selectedValue: string; priceModifier: number }[] | null = null;

      if (item.selectedOptions && item.selectedOptions.length > 0) {
        selectedOptionsSnapshot = item.selectedOptions;
        optionsExtraCost = item.selectedOptions.reduce((sum, opt) => sum + (Number(opt.priceModifier) || 0), 0);
      }

      const customerPriceAtPurchase = baseCustomerPrice + optionsExtraCost;
      const customerTotal = customerPriceAtPurchase * qty;
      const vendorCostTotal = (vendorPriceAtPurchase + shippingFeeAtPurchase) * qty;
      const profitTotal = customerTotal - vendorCostTotal;

      subtotalCustomer += customerTotal;
      totalVendorCost += vendorCostTotal;

      orderItemsData.push({
        productId: product.id,
        vendorId: product.vendorId,
        vendorName: vendorMap.get(product.vendorId) || '',
        productNameHe: product.nameHe || product.nameAr || '',
        productNameAr: product.nameAr || '',
        productImageUrl: product.images?.[0] || undefined,
        // Price snapshots
        vendorPriceAtPurchase,
        customerPriceAtPurchase,
        shippingFeeAtPurchase,
        // Legacy fields
        priceAtPurchase: customerPriceAtPurchase,
        // Computed totals
        quantity: qty,
        customerTotal,
        vendorCostTotal,
        profitTotal,
        lineTotal: customerTotal,
        itemStatus: ItemStatus.PENDING,
        // Color selected by customer (snapshot - legacy)
        selectedColor: item.selectedColor || null,
        // Generic options snapshot
        selectedOptions: selectedOptionsSnapshot,
        optionsExtraCost,
        // Delivery time snapshot from product
        deliveryTimeAtPurchase: product.deliveryTime || null,
      });
    }

    const totalShipping = 25; // Fixed shipping cost charged to customer
    const totalCustomer = subtotalCustomer + totalShipping;
    const totalProfit = totalCustomer - totalVendorCost;

    const order = this.orderRepository.create({
      customerId: customerId || undefined,
      guestName: dto.guestName,
      guestPhone: dto.guestPhone,
      guestEmail: dto.guestEmail,
      shippingFullName: dto.shippingFullName,
      shippingPhone: dto.shippingPhone,
      shippingCity: dto.shippingCity,
      shippingStreet: dto.shippingStreet,
      shippingApartment: dto.shippingApartment,
      shippingZipCode: dto.shippingZipCode,
      shippingNotes: dto.shippingNotes,
      // New financial fields
      subtotalCustomer,
      totalShipping,
      totalCustomer,
      totalVendorCost,
      totalProfit,
      // Legacy fields for backward compatibility
      subtotal: subtotalCustomer,
      shippingCost: totalShipping,
      total: totalCustomer,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
    });

    const savedOrder = await this.orderRepository.save(order);

    // Save order items in batch
    const itemEntities = orderItemsData.map((item) =>
      this.orderItemRepository.create({ ...item, orderId: savedOrder.id })
    );
    await this.orderItemRepository.save(itemEntities);

    // Reduce stock in batch
    for (const item of dto.items) {
      await this.productRepository.decrement({ id: item.productId }, 'stock', item.quantity);
    }

    const finalOrder = await this.orderRepository.findOne({
      where: { id: savedOrder.id },
      relations: ['items'],
    });

    // Emit order.created event NON-BLOCKING
    const emailTo = dto.guestEmail || '';
    if (emailTo) {
      const storeUrl = process.env.STORE_URL || 'http://localhost:3001';
      this.eventEmitter.emit('order.created', {
        orderId: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        guestEmail: emailTo,
        guestName: dto.guestName || dto.shippingFullName || 'לקוח יקר',
        total: totalCustomer,
        items: orderItemsData.map((i) => ({
          productNameHe: i.productNameHe || '',
          quantity: i.quantity,
          priceAtPurchase: Number(i.customerPriceAtPurchase || 0),
        })),
        shippingCity: dto.shippingCity,
        shippingStreet: dto.shippingStreet,
        trackingUrl: `${storeUrl}/track/${savedOrder.id}`,
      });
    }

    return finalOrder;
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

  // Public tracking endpoint - no auth required, safe fields only
  async getOrderByIdPublic(orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items'],
    });
    if (!order) throw new NotFoundException('ההזמנה לא נמצאה');
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      totalCustomer: order.totalCustomer || order.total,
      totalShipping: order.totalShipping || order.shippingCost,
      shippingCity: order.shippingCity,
      items: order.items.map((item) => ({
        id: item.id,
        productNameHe: item.productNameHe,
        productImageUrl: item.productImageUrl,
        quantity: item.quantity,
        customerPriceAtPurchase: item.customerPriceAtPurchase || item.priceAtPurchase,
        customerTotal: item.customerTotal || item.lineTotal,
        itemStatus: item.itemStatus,
        selectedColor: item.selectedColor || null,
        selectedOptions: item.selectedOptions || null,
        optionsExtraCost: Number(item.optionsExtraCost || 0),
        deliveryTimeAtPurchase: item.deliveryTimeAtPurchase || null,
      })),
    };
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

    for (const item of order.items) {
      await this.productRepository.increment({ id: item.productId }, 'stock', item.quantity);
    }

    return { message: 'ההזמנה בוטלה בהצלחה' };
  }

  // ========== VENDOR ACTIONS ==========

  async getVendorOrders(userId: string) {
    const vendorId = await this.getVendorIdByUserId(userId);
    if (!vendorId) return [];

    const items = await this.orderItemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.order', 'order')
      .where('item.vendorId = :vendorId', { vendorId })
      .orderBy('order.createdAt', 'DESC')
      .getMany();

    // Build order map with Hebrew data (no translation needed - platform is Hebrew-only)
    const orderMap = new Map<string, any>();
    for (const item of items) {
      const order = item.order as any;
      if (!orderMap.has(order.id)) {
        orderMap.set(order.id, {
          id: order.id,
          createdAt: order.createdAt,
          status: order.status,
          // Customer contact
          shippingFullName: order.shippingFullName,
          shippingPhone: order.shippingPhone,
          shippingCity: order.shippingCity,
          shippingStreet: order.shippingStreet,
          shippingApartment: order.shippingApartment,
          shippingNotes: order.shippingNotes,
          guestName: order.guestName,
          guestPhone: order.guestPhone,
        });
      }
    }

    // Return items with VENDOR-SAFE data only (no customerPrice, no profit)
    return items.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      productId: item.productId,
      productNameAr: item.productNameAr,
      productNameHe: item.productNameHe,
      productImageUrl: item.productImageUrl,
      vendorName: item.vendorName,
      // Vendor sees ONLY their price and shipping fee
      vendorPriceAtPurchase: Number(item.vendorPriceAtPurchase || 0),
      shippingFeeAtPurchase: Number(item.shippingFeeAtPurchase || 0),
      vendorCostTotal: Number(item.vendorCostTotal || 0),
      quantity: item.quantity,
      itemStatus: item.itemStatus,
      createdAt: item.createdAt,
      // Color and delivery time (vendor sees these)
      selectedColor: item.selectedColor || null,
      // Generic options snapshot (vendor sees these)
      selectedOptions: item.selectedOptions || null,
      optionsExtraCost: Number(item.optionsExtraCost || 0),
      deliveryTimeAtPurchase: item.deliveryTimeAtPurchase || null,
      // Order data
      order: orderMap.get(item.orderId) || {},
    }));
  }

  async updateItemStatus(itemId: string, userId: string, status: ItemStatus) {
    const vendorId = await this.getVendorIdByUserId(userId);
    if (!vendorId) throw new NotFoundException('ספק לא נמצא');

    const item = await this.orderItemRepository.findOne({
      where: { id: itemId, vendorId },
      relations: ['order'],
    });
    if (!item) throw new NotFoundException('פריט לא נמצא או אין הרשאה');

    item.itemStatus = status;
    const saved = await this.orderItemRepository.save(item);

    // Auto-update parent order status based on all items
    const allItems = await this.orderItemRepository.find({ where: { orderId: item.orderId } });
    const statuses = allItems.map((i) => i.itemStatus);
    let orderStatus: OrderStatus = OrderStatus.PENDING;
    if (statuses.every((s) => s === ItemStatus.DELIVERED)) orderStatus = OrderStatus.DELIVERED;
    else if (statuses.every((s) => s === ItemStatus.CANCELLED)) orderStatus = OrderStatus.CANCELLED;
    else if (statuses.some((s) => s === ItemStatus.SHIPPED)) orderStatus = OrderStatus.SHIPPED;
    else if (statuses.some((s) => s === ItemStatus.PROCESSING)) orderStatus = OrderStatus.PROCESSING;
    else if (statuses.some((s) => s === ItemStatus.CONFIRMED)) orderStatus = OrderStatus.CONFIRMED;

    await this.orderRepository.update(item.orderId, { status: orderStatus });

    // Emit status update event NON-BLOCKING for email notification
    const order = item.order as any;
    const customerEmail = order?.guestEmail || order?.customer?.email || '';
    const customerName = order?.guestName || order?.shippingFullName || 'לקוח יקר';
    if (customerEmail) {
      const storeUrl = process.env.STORE_URL || 'http://localhost:3001';
      this.eventEmitter.emit('order.status.updated', {
        orderId: item.orderId,
        email: customerEmail,
        customerName,
        status,
        trackingUrl: `${storeUrl}/track/${item.orderId}`,
      });
    }

    return saved;
  }

  async getVendorStats(userId: string) {
    const vendorId = await this.getVendorIdByUserId(userId);
    if (!vendorId) return { totalRevenue: 0, totalOrders: 0, activeProducts: 0, pendingOrders: 0 };

    const [revenueResult, totalOrders, pendingOrders] = await Promise.all([
      this.orderItemRepository
        .createQueryBuilder('item')
        .select('SUM(item.vendorCostTotal)', 'total')
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
      activeProducts: 0,
      pendingOrders: Number(pendingOrders?.count || 0),
    };
  }

  // ========== ADMIN ACTIONS ==========

  async getAllOrders(status?: OrderStatus) {
    const where = status ? { status } : {};
    const orders = await this.orderRepository.find({
      where,
      relations: ['items', 'customer'],
      order: { createdAt: 'DESC' },
    });

    // Enrich each order with full price breakdown (admin sees everything)
    return orders.map((order) => {
      const enrichedItems = order.items.map((item) => {
        const vendorPrice = Number(item.vendorPriceAtPurchase || 0);
        const shippingFee = Number(item.shippingFeeAtPurchase || 0);
        const customerPrice = Number(item.customerPriceAtPurchase || item.priceAtPurchase || 0);
        const qty = item.quantity;
        const vendorCostTotal = Number(item.vendorCostTotal) || (vendorPrice + shippingFee) * qty;
        const customerTotal = Number(item.customerTotal) || customerPrice * qty;
        const profitTotal = Number(item.profitTotal) || customerTotal - vendorCostTotal;

        return {
          id: item.id,
          productId: item.productId,
          productNameHe: item.productNameHe,
          productNameAr: item.productNameAr,
          productImageUrl: item.productImageUrl,
          vendorId: item.vendorId,
          vendorName: item.vendorName || '',
          quantity: qty,
          vendorPriceAtPurchase: vendorPrice,
          shippingFeeAtPurchase: shippingFee,
          customerPriceAtPurchase: customerPrice,
          vendorCostTotal,
          customerTotal,
          profitTotal,
          itemStatus: item.itemStatus,
          selectedColor: item.selectedColor || null,
          selectedOptions: item.selectedOptions || null,
          optionsExtraCost: Number(item.optionsExtraCost || 0),
          deliveryTimeAtPurchase: item.deliveryTimeAtPurchase || null,
        };
      });

      const totalVendorCost = enrichedItems.reduce((s, i) => s + i.vendorCostTotal, 0);
      const totalCustomerRevenue = enrichedItems.reduce((s, i) => s + i.customerTotal, 0);
      const profit = totalCustomerRevenue - totalVendorCost;

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        status: order.status,
        paymentStatus: order.paymentStatus,
        // Customer info
        guestName: order.guestName,
        guestPhone: order.guestPhone,
        guestEmail: order.guestEmail,
        shippingFullName: order.shippingFullName,
        shippingPhone: order.shippingPhone,
        shippingCity: order.shippingCity,
        shippingStreet: order.shippingStreet,
        shippingApartment: order.shippingApartment,
        shippingNotes: order.shippingNotes,
        // Financial summary
        subtotalCustomer: Number(order.subtotalCustomer || order.subtotal || 0),
        totalShipping: Number(order.totalShipping || order.shippingCost || 0),
        totalCustomer: Number(order.totalCustomer || order.total || 0),
        totalVendorCost: totalVendorCost,
        totalProfit: profit,
        items: enrichedItems,
      };
    });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
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
      .addSelect('item.vendorName', 'vendorName')
      .addSelect('SUM(item.vendorCostTotal)', 'totalVendorRevenue')
      .addSelect('SUM(item.customerTotal)', 'totalCustomerRevenue')
      .addSelect('SUM(item.profitTotal)', 'totalProfit')
      .addSelect('COUNT(DISTINCT order.id)', 'totalOrders')
      .addSelect('SUM(item.quantity)', 'totalItemsSold')
      .where('order.paymentStatus = :paid', { paid: PaymentStatus.PAID })
      .groupBy('item.vendorId')
      .addGroupBy('item.vendorName');

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
        .select('SUM(order.totalCustomer)', 'total')
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
