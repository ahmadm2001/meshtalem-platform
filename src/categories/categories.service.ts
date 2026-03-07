import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  /** Returns only root categories with their children nested inside */
  async getAllCategories() {
    return this.categoryRepository.find({
      where: { isActive: true, parent: IsNull() },
      relations: ['children'],
      order: { nameHe: 'ASC' },
    });
  }

  /** Returns a flat list of ALL categories (root + sub) */
  async getAllFlat() {
    return this.categoryRepository.find({
      where: { isActive: true },
      relations: ['parent'],
      order: { nameHe: 'ASC' },
    });
  }

  /** Returns a single category with its children */
  async getById(id: string) {
    const cat = await this.categoryRepository.findOne({
      where: { id },
      relations: ['children', 'parent'],
    });
    if (!cat) throw new NotFoundException('הקטגוריה לא נמצאה');
    return cat;
  }

  async createCategory(data: {
    nameHe: string;
    nameAr?: string;
    nameEn?: string;
    descriptionHe?: string;
    imageUrl?: string;
    parentId?: string;
  }) {
    const category = this.categoryRepository.create({
      nameHe: data.nameHe,
      nameAr: data.nameAr,
      nameEn: data.nameEn,
      descriptionHe: data.descriptionHe,
      imageUrl: data.imageUrl,
    });

    if (data.parentId) {
      const parent = await this.categoryRepository.findOne({
        where: { id: data.parentId },
      });
      if (!parent) throw new NotFoundException('קטגוריית האב לא נמצאה');
      category.parent = parent;
    }

    return this.categoryRepository.save(category);
  }

  async updateCategory(
    id: string,
    data: {
      nameHe?: string;
      nameAr?: string;
      nameEn?: string;
      descriptionHe?: string;
      imageUrl?: string;
      parentId?: string | null;
    },
  ) {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['parent'],
    });
    if (!category) throw new NotFoundException('הקטגוריה לא נמצאה');

    if (data.nameHe !== undefined) category.nameHe = data.nameHe;
    if (data.nameAr !== undefined) category.nameAr = data.nameAr;
    if (data.nameEn !== undefined) category.nameEn = data.nameEn;
    if (data.descriptionHe !== undefined) category.descriptionHe = data.descriptionHe;
    if (data.imageUrl !== undefined) category.imageUrl = data.imageUrl;

    if ('parentId' in data) {
      if (data.parentId === null || data.parentId === '') {
        category.parent = null;
      } else if (data.parentId) {
        if (data.parentId === id) throw new Error('קטגוריה לא יכולה להיות הורה של עצמה');
        const parent = await this.categoryRepository.findOne({
          where: { id: data.parentId },
        });
        if (!parent) throw new NotFoundException('קטגוריית האב לא נמצאה');
        category.parent = parent;
      }
    }

    return this.categoryRepository.save(category);
  }

  async deleteCategory(id: string) {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['children'],
    });
    if (!category) throw new NotFoundException('הקטגוריה לא נמצאה');

    // Deactivate children too
    if (category.children?.length) {
      for (const child of category.children) {
        child.isActive = false;
        await this.categoryRepository.save(child);
      }
    }

    category.isActive = false;
    await this.categoryRepository.save(category);
    return { message: 'הקטגוריה הוסרה' };
  }
}
