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

// ─────────────────────────────────────────────────────────────────────────────
// Q DOOR Configurator Schema — Finalized v2
// Stored as JSON in the `productOptions` column.
// Backward-compatible: old records without `id` / `step` / `type` fields will
// still render via the legacy radio-button fallback in the frontend.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Controls which UI component is used to render an option group.
 *  visual_card    — Large clickable cards with icon + price (door type, height)
 *  color_grid     — Grid of solid color swatches with RAL codes
 *  single_radio   — Standard single-choice radio list
 *  multi_checkbox — Multiple selections allowed (upgrades, accessories)
 */
export type OptionDisplayType =
  | 'visual_card'
  | 'color_grid'
  | 'single_radio'
  | 'multi_checkbox';

export interface ProductOptionValue {
  /** Stable unique identifier used as the state key (e.g. "double_door"). */
  id: string;
  /** Customer-facing label (e.g. "דלת כפולה"). */
  label: string;
  /** Extra cost added to the base price. 0 = no extra cost. */
  priceModifier: number;
  /** Hex color code for color_grid swatches (e.g. "#1A1A1A"). */
  colorCode?: string;
  /** Key that maps to an SVG/PNG illustration for visual_card. */
  icon?: string;
  /** URL of a product image to swap into the preview when this value is selected. */
  imageOverride?: string;
  /** Short descriptive text shown below the label (e.g. Smart Lock feature list). */
  description?: string;
}

export interface OptionDependencyRule {
  /** The `id` of the parent option group. */
  groupId: string;
  /** The `id` of the value that must be selected in the parent group. */
  valueId: string;
}

export interface ProductOptionGroup {
  /** Stable unique identifier used as the Zustand state key (e.g. "door_type"). */
  id: string;
  /** Customer-facing section title (e.g. "איזו דלת תבחרו?"). */
  name: string;
  /** UI component type. Defaults to "single_radio" for backward compatibility. */
  type: OptionDisplayType;
  /** Wizard step number. Groups are rendered in ascending order. */
  step: number;
  /** If true, the customer must select a value before adding to cart. */
  required: boolean;
  /**
   * Logical grouping used only in the admin panel to organise the builder UI.
   * Suggested values: "structure" | "design" | "upgrades" | "installation"
   */
  adminCategory?: string;
  /**
   * When present, this group is only rendered if the specified parent group
   * currently has the specified value selected.
   */
  dependsOn?: OptionDependencyRule;
  /** The available choices for this group. */
  values: ProductOptionValue[];
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fixed built-in door variant — always 3 per product.
 * id: 'single' | 'single_half' | 'double'
 */
export interface DoorVariant {
  id: 'single' | 'single_half' | 'double';
  label: string;   // e.g. "דלת"
  basePrice: number;
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
   * Q DOOR Configurator options — stored as a JSON array of ProductOptionGroup objects.
   *
   * The column type is `json` (PostgreSQL stores this as JSONB internally when
   * the column is declared without explicit type casting, but TypeORM's `json`
   * type maps to the native `json` type; to use JSONB explicitly, set
   * `{ type: 'jsonb' }` — both are safe for additive schema changes).
   *
   * Migration safety: This column is nullable with a null default, so existing
   * rows are unaffected. New fields added to the interface (id, step, type, etc.)
   * are optional from the database's perspective — the JSON payload is schema-free.
   * Old records that contain only { name, values[] } will fall back to the
   * legacy single_radio renderer in the frontend.
   */
  @Column({ type: 'json', nullable: true, default: null })
  productOptions: ProductOptionGroup[] | null;

  // ─── Q DOOR specific fields ─────────────────────────────────────────────────

  /**
   * Estimated base price shown to the customer before configuration.
   * The configurator adds priceModifiers on top of this value.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: null })
  baseEstimatedPrice: number | null;

  /**
   * Deposit amount the customer pays online.
   * Can be a fixed amount or a percentage-derived value set by admin.
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, default: null })
  depositAmount: number | null;

  /**
   * Manufacturing / lead time shown to the customer (e.g. "4-6 שבועות").
   */
  @Column({ nullable: true, default: null })
  manufacturingTime: string | null;

  /**
   * Fixed built-in door variants — always 3 entries:
   * דלת | דלת וחצי | דלת כפולה
   * Each has its own base price. When the customer selects a variant,
   * the product base price updates to that variant's basePrice.
   */
  @Column({ type: 'json', nullable: true, default: null })
  doorVariants: DoorVariant[] | null;

  // ─── Legacy / marketplace fields (kept for backward compatibility) ────────────

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
