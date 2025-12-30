import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TypeCombo, TypeComboDocument } from '../schema/type-combo.schema';
import { CreateTypeComboDto } from '../dto/create-type-combo.dto';
import { UpdateTypeComboDto } from '../dto/update-type-combo.dto';

@Injectable()
export class TypeComboService {
  constructor(
    @InjectModel(TypeCombo.name)
    private typeComboModel: Model<TypeComboDocument>,
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  async findAll(): Promise<TypeCombo[]> {
    return await this.typeComboModel
      .find({
        is_active: true,
        is_deleted: false,
      })
      .sort({ order_index: 1, createdAt: 1 })
      .select('_id name slug order_index description is_active')
      .lean();
  }

  async findById(id: string): Promise<TypeCombo> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID type combo');
    }

    const typeCombo = await this.typeComboModel
      .findOne({ _id: id, is_deleted: false })
      .exec();

    if (!typeCombo) {
      throw new NotFoundException('Not found type combo');
    }

    return typeCombo;
  }

  async create(
    createTypeComboDto: CreateTypeComboDto,
  ): Promise<{ message: string; data: TypeCombo }> {
    let slug = createTypeComboDto.slug;
    if (!slug) {
      slug = this.generateSlug(createTypeComboDto.name);
    }

    const existingSlug = await this.typeComboModel
      .findOne({ slug, is_deleted: false })
      .exec();
    if (existingSlug) {
      throw new ConflictException(
        `Slug "${slug}" already exists. Please choose a different name.`,
      );
    }

    const typeCombo = new this.typeComboModel({
      ...createTypeComboDto,
      slug,
      is_active:
        createTypeComboDto.is_active !== undefined
          ? createTypeComboDto.is_active
          : true,
      order_index:
        createTypeComboDto.order_index !== undefined
          ? createTypeComboDto.order_index
          : 0,
    });

    const saved = await typeCombo.save();
    return {
      message: 'Create type combo success',
      data: saved,
    };
  }

  async update(
    id: string,
    updateTypeComboDto: UpdateTypeComboDto,
  ): Promise<TypeCombo> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID type combo');
    }

    const existingTypeCombo = await this.typeComboModel.findById(id);
    if (!existingTypeCombo || existingTypeCombo.is_deleted) {
      throw new NotFoundException(`TypeCombo with ID ${id} not found`);
    }

    if (updateTypeComboDto.slug || updateTypeComboDto.name) {
      let newSlug = updateTypeComboDto.slug;
      if (updateTypeComboDto.name && !updateTypeComboDto.slug) {
        newSlug = this.generateSlug(updateTypeComboDto.name);
      }

      if (newSlug && newSlug !== existingTypeCombo.slug) {
        const existingSlug = await this.typeComboModel
          .findOne({
            slug: newSlug,
            _id: { $ne: id },
            is_deleted: false,
          })
          .exec();

        if (existingSlug) {
          throw new ConflictException(
            `Slug "${newSlug}" already exists. Please choose a different name.`,
          );
        }

        updateTypeComboDto.slug = newSlug;
      }
    }

    if (
      updateTypeComboDto.order_index !== undefined &&
      updateTypeComboDto.order_index !== existingTypeCombo.order_index
    ) {
      const conflictTypeCombo = await this.typeComboModel.findOne({
        order_index: updateTypeComboDto.order_index,
        _id: { $ne: id },
        is_deleted: false,
      });

      if (conflictTypeCombo) {
        await this.typeComboModel.findByIdAndUpdate(conflictTypeCombo._id, {
          order_index: existingTypeCombo.order_index,
        });
      }
    }

    const updateData: Record<string, any> = { ...updateTypeComboDto };

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const typeCombo = await this.typeComboModel
      .findOneAndUpdate(
        { _id: id, is_deleted: false },
        { $set: updateData },
        { new: true },
      )
      .exec();

    if (!typeCombo) {
      throw new NotFoundException('Not found type combo');
    }

    return typeCombo;
  }

  async delete(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid ID type combo');
    }

    const result = await this.typeComboModel
      .findByIdAndUpdate(
        id,
        { $set: { is_deleted: true, is_active: false } },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new NotFoundException('Not found type combo');
    }

    return { message: 'Delete type combo success' };
  }

  async getTypeComboAdmin(
    page: number = 1,
    limit: number = 10,
    key?: string,
  ): Promise<any> {
    const skip = (page - 1) * limit;
    const query: Record<string, any> = { is_deleted: false };

    if (key && typeof key === 'string' && key.trim().length > 0) {
      query.$or = [
        { name: { $regex: key.trim(), $options: 'i' } },
        { slug: { $regex: key.trim(), $options: 'i' } },
        { description: { $regex: key.trim(), $options: 'i' } },
      ];
    }

    const [typeCombos, total] = await Promise.all([
      this.typeComboModel
        .find(query)
        .sort({ order_index: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          '_id name slug order_index description is_active createdAt updatedAt',
        )
        .lean(),
      this.typeComboModel.countDocuments(query),
    ]);

    return {
      total,
      page,
      limit,
      typeCombos,
    };
  }
}
