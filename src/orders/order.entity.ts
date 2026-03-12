import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum ItemStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('orders')
@Index(['status'])
@Index(['createdAt'])
@Index(['customerId'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Auto-generated human-readable order number
  @Column({ unique: true, nullable: true })
  orderNumber: string;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer: User;

  @Column({ nullable: true })
  customerId: string;

  // Guest customer fields
  @Column({ nullable: true })
  guestName: string;

  @Column({ nullable: true })
  guestPhone: string;

  @Column({ nullable: true })
  guestEmail: string;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];

  // Shipping address - raw (as entered by customer, usually Hebrew)
  @Column()
  shippingFullName: string;

  @Column({ nullable: true })
  shippingFullNameAr: string;

  @Column()
  shippingPhone: string;

  @Column()
  shippingCity: string;

  @Column({ nullable: true })
  shippingCityAr: string;

  @Column()
  shippingStreet: string;

  @Column({ nullable: true })
  shippingStreetAr: string;

  @Column({ nullable: true })
  shippingApartment: string;

  @Column({ nullable: true })
  shippingZipCode: string;

  @Column({ nullable: true })
  shippingNotes: string;

  @Column({ nullable: true })
  shippingNotesAr: string;

  // Financial snapshot at time of order
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotalCustomer: number;   // sum of customerPrice × qty for all items

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalShipping: number;      // fixed shipping cost charged to customer

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalCustomer: number;      // subtotalCustomer + totalShipping (what customer pays)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalVendorCost: number;    // sum of (vendorPrice + shippingFee) × qty for all items

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalProfit: number;        // totalCustomer - totalVendorCost

  // Legacy fields kept for backward compatibility
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  shippingCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  total: number;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  @Column({ nullable: true })
  paymentTransactionId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @BeforeInsert()
  generateOrderNumber() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `MSH-${timestamp}-${random}`;
  }
}

@Entity('order_items')
@Index(['vendorId'])
@Index(['orderId'])
@Index(['productId'])
@Index(['itemStatus'])
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  orderId: string;

  @Column()
  productId: string;

  @Column()
  vendorId: string;

  // Vendor name snapshot
  @Column({ nullable: true })
  vendorName: string;

  // Product name snapshots (both languages)
  @Column({ nullable: true })
  productNameHe: string;

  @Column({ nullable: true })
  productNameAr: string;

  @Column({ nullable: true })
  productImageUrl: string;

  // Price snapshots at time of purchase
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  vendorPriceAtPurchase: number;      // what vendor charges

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  customerPriceAtPurchase: number;    // what customer pays (set by admin)

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingFeeAtPurchase: number;      // vendor shipping fee

  @Column()
  quantity: number;

  // Computed totals (snapshot)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  vendorCostTotal: number;            // (vendorPriceAtPurchase + shippingFeeAtPurchase) × quantity

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  customerTotal: number;              // customerPriceAtPurchase × quantity

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  profitTotal: number;                // customerTotal - vendorCostTotal

  // Legacy field kept for backward compatibility
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  priceAtPurchase: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  lineTotal: number;

  // Per-item status managed by vendor
  @Column({ type: 'enum', enum: ItemStatus, default: ItemStatus.PENDING })
  itemStatus: ItemStatus;

  // Color selected by customer at purchase time (snapshot)
  @Column({ type: 'varchar', nullable: true, default: null })
  selectedColor: string | null;

  /**
   * Selected options snapshot at purchase time.
   * Stores both stable IDs and human-readable labels so the snapshot is
   * self-contained and readable even if the product schema changes later.
   *
   * For single_radio / visual_card / color_grid groups, `selectedValueIds`
   * contains exactly one entry.
   * For multi_checkbox groups it may contain multiple entries.
   *
   * Example:
   * [
   *   { groupId: "door_type", groupName: "סוג דלת", selectedValueIds: ["double"], selectedValueLabels: ["דלת כפולה"], priceModifier: 10800 },
   *   { groupId: "smart_upgrades", groupName: "שדרוגים", selectedValueIds: ["smart_lock","digital_viewer"], selectedValueLabels: ["מנעול חכם","עינית דיגיטלית"], priceModifier: 2650 }
   * ]
   */
  @Column({ type: 'json', nullable: true, default: null })
  selectedOptions: {
    groupId: string;
    groupName: string;
    selectedValueIds: string[];
    selectedValueLabels: string[];
    priceModifier: number;
  }[] | null;

  // Extra cost from selected options (sum of all priceModifiers)
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  optionsExtraCost: number;

  // Delivery time snapshot at purchase time
  @Column({ type: 'varchar', nullable: true, default: null })
  deliveryTimeAtPurchase: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
