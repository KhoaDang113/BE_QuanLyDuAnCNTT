import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Brand, BrandDocument } from '../schema/brand.schema';
import { CreateBrandDto } from '../dto/create-brand.dto';
import { UpdateBrandDto } from '../dto/update-brand.dto';
import { CloudinaryService } from 'src/shared/cloudinary/cloudinary.service';

@Injectable()
export class BrandService {
  constructor(
    @InjectModel(Brand.name)
    private brandModel: Model<BrandDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findAll(): Promise<Brand[]> {
    return this.brandModel
      .find({ is_active: true, is_deleted: false })
      .select('name slug description image')
      .lean();
  }

  async findById(id: string): Promise<Brand> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid brand ID');
    }

    const brand = await this.brandModel
      .findOne({ _id: id, is_deleted: false })
      .exec();

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return brand;
  }

  async findBySlug(slug: string): Promise<Brand> {
    const brand = await this.brandModel
      .findOne({ slug, is_deleted: false })
      .exec();

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return brand;
  }

  async create(
    createBrandDto: CreateBrandDto,
    file: Express.Multer.File,
  ): Promise<Brand> {
    let imageUrl = createBrandDto.image;
    if (file) {
      try {
        imageUrl = await this.cloudinaryService.uploadImage(
          file,
          'WebSieuThi/brands',
        );
      } catch {
        throw new BadRequestException('Error uploading image');
      }
    }

    if (!imageUrl) {
      throw new BadRequestException('Image is required');
    }

    const brand = new this.brandModel({
      ...createBrandDto,
      image: imageUrl,
      is_active:
        createBrandDto.is_active !== undefined
          ? createBrandDto.is_active
          : true,
    });

    try {
      return await brand.save();
    } catch (error: any) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: number }).code === 11000
      ) {
        throw new BadRequestException(
          `Brand with slug "${createBrandDto.slug}" already exists`,
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    updateBrandDto: UpdateBrandDto,
    file: Express.Multer.File,
  ): Promise<Brand> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid brand ID');
    }

    let imageUrl = updateBrandDto.image;
    if (file) {
      try {
        imageUrl = await this.cloudinaryService.uploadImage(
          file,
          'WebSieuThi/brands',
        );
      } catch {
        throw new BadRequestException('Error uploading image');
      }
    }

    const updateData: Record<string, any> = {
      ...updateBrandDto,
    };

    if (imageUrl) {
      updateData.image = imageUrl;
    }

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    try {
      const brand = await this.brandModel
        .findOneAndUpdate(
          { _id: id, is_deleted: false },
          { $set: updateData },
          { new: true },
        )
        .exec();

      if (!brand) {
        throw new NotFoundException('Brand not found');
      }

      return brand;
    } catch (error: any) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: number }).code === 11000
      ) {
        throw new BadRequestException(
          `Brand with slug "${updateBrandDto.slug}" already exists`,
        );
      }
      throw error;
    }
  }

  async delete(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid brand ID');
    }

    const result = await this.brandModel
      .findByIdAndUpdate(
        id,
        { $set: { is_deleted: true, is_active: false } },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new NotFoundException('Brand not found');
    }

    return { message: 'Brand deleted successfully' };
  }

  async getBrandsAdmin(
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
      ];
    }

    const [brands, total] = await Promise.all([
      this.brandModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .select('_id name slug image description is_active')
        .lean(),
      this.brandModel.countDocuments(query),
    ]);

    return {
      total,
      page,
      limit,
      brands,
    };
  }
}
