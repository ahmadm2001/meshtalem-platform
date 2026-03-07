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

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ default: 0 })
  stock: number;

  @Column({ type: 'simple-array', nullable: true })
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
