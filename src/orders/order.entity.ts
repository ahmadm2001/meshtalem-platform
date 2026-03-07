import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
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

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'customerId' })
  customer: User;

  @Column({ nullable: true })
  customerId: string;

  // Guest customer (no login required)
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

  // Shipping address (home delivery only)
  @Column()
  shippingFullName: string;

  @Column()
  shippingPhone: string;

  @Column()
  shippingCity: string;

  @Column()
  shippingStreet: string;

  @Column({ nullable: true })
  shippingApartment: string;

  @Column({ nullable: true })
  shippingZipCode: string;

  @Column({ nullable: true })
  shippingNotes: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
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
}

@Entity('order_items')
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

  // Snapshot of product at time of purchase
  @Column()
  productNameHe: string;

  @Column({ nullable: true })
  productImageUrl: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  priceAtPurchase: number;

  @Column()
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  lineTotal: number;
}
