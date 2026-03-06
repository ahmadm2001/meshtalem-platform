import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
  ) {}

  async getAllCategories() {
    return this.categoryRepository.find({
      where: { isActive: true },
      relations: ['children'],
      order: { nameHe: 'ASC' },
    });
  }

  async createCategory(data: Partial<Category>) {
    const category = this.categoryRepository.create(data);
    return this.categoryRepository.save(category);
  }

  async updateCategory(id: string, data: Partial<Category>) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) throw new NotFoundException('הקטגוריה לא נמצאה');
    Object.assign(category, data);
    return this.categoryRepository.save(category);
  }

  async deleteCategory(id: string) {
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) throw new NotFoundException('הקטגוריה לא נמצאה');
    category.isActive = false;
    await this.categoryRepository.save(category);
    return { message: 'הקטגוריה הוסרה' };
  }
}
