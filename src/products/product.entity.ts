import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vendor } from '../vendors/vendor.entity';
import { Category } from '../categories/category.entity';

export enum ProductStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DRAFT = 'draft',
}

export enum ProductWarranty {
  NONE = 'none',
  HALF_YEAR = '6_months',
  ONE_YEAR = '1_year',
  ONE_HALF_YEAR = '1.5_years',
  TWO_YEARS = '2_years',
  TWO_HALF_YEARS = '2.5_years',
  THREE_YEARS = '3_years',
  THREE_HALF_YEARS = '3.5_years',
  FOUR_YEARS = '4_years',
  FOUR_HALF_YEARS = '4.5_years',
  FIVE_YEARS = '5_years',
}

/**
 * Generic product option group structure.
 * Example:
 * {
 *   name: "צבע",
 *   values: [
 *     { label: "שחור", priceModifier: 0 },
 *     { label: "כחול", priceModifier: 20 }
 *   ]
 * }
 */
export interface ProductOptionValue {
  label: string;
  priceModifier: number;
}

export interface ProductOptionGroup {
  name: string;
  values: ProductOptionValue[];
}

export enum ProductDeliveryTime {
  SAME_DAY = 'same_day',
  ONE_TWO_DAYS = '1_2_days',
  TWO_THREE_DAYS = '2_3_days',
  THREE_FIVE_DAYS = '3_5_days',
  FIVE_SEVEN_DAYS = '5_7_days',
  SEVEN_TEN_DAYS = '7_10_days',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Vendor, { eager: false })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column()
  vendorId: string;

  @ManyToOne(() => Category, { eager: true, nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ nullable: true })
  categoryId: string;

  // Arabic (original - entered by vendor)
  @Column()
  nameAr: string;

  @Column({ type: 'text', nullable: true })
  descriptionAr: string;

  // Hebrew (auto-translated by AI, editable by admin)
  @Column({ nullable: true })
  nameHe: string;

  @Column({ type: 'text', nullable: true })
  descriptionHe: string;

  // English (optional)
  @Column({ nullable: true })
  nameEn: string;

  @Column({ type: 'text', nullable: true })
  descriptionEn: string;

  // Vendor's original price (only visible to vendor and admin)
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  vendorPrice: number;

  // Customer-facing price (set by admin, defaults to vendorPrice)
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  customerPrice: number;

  // Shipping fee (stored internally)
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: 0 })
  shippingFee: number;

  // Warranty
  @Column({
    type: 'enum',
    enum: ProductWarranty,
    default: ProductWarranty.NONE,
  })
  warranty: ProductWarranty;

  // Delivery time (selected by vendor from predefined list)
  @Column({
    type: 'enum',
    enum: ProductDeliveryTime,
    nullable: true,
    default: null,
  })
  deliveryTime: ProductDeliveryTime | null;

  // Available colors (array of color keys e.g. ["black","blue","red"])
  @Column({ type: 'json', nullable: true, default: null })
  colors: string[] | null;

  /**
   * Generic product options - array of option groups with price modifiers.
   * Example: [{ name: "צבע", values: [{ label: "שחור", priceModifier: 0 }, { label: "כחול", priceModifier: 20 }] }]
   */
  @Column({ type: 'json', nullable: true, default: null })
  productOptions: ProductOptionGroup[] | null;

  @Column({ default: 0 })
  stock: number;

  // Images stored as JSON array to support base64 and URLs
  @Column({ type: 'json', nullable: true })
  images: string[];

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.PENDING })
  status: ProductStatus;

  @Column({ nullable: true })
  rejectionReason: string;

  @Column({ nullable: true })
  adminNote: string;

  @Column({ default: false })
  translationApproved: boolean;

  @Column({ default: false })
  isHidden: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
