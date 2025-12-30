import { Model, Types } from 'mongoose';
import { Banner, BannerDocument } from '../schema/banner.schema';
import { InjectModel } from '@nestjs/mongoose';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Category, CategoryDocument } from '../schema/category.schema';
import { CreateBannerDto } from '../dto/create-banner.dto';
import { UpdateBannerDto } from '../dto/update-banner.dto';
import { CloudinaryService } from 'src/shared/cloudinary/cloudinary.service';

@Injectable()
export class BannerService {
  constructor(
    @InjectModel(Banner.name)
    private bannerModel: Model<BannerDocument>,
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async getBannersByCategorySlugOrAll(
    categorySlug?: string,
  ): Promise<Banner[]> {
    if (!categorySlug) {
      return this.bannerModel
        .find({ is_active: true, is_deleted: false })
        .select('image link category_id')
        .lean();
    }
    const category = await this.categoryModel
      .findOne({ slug: categorySlug, is_deleted: false, is_active: true })
      .select('_id')
      .lean();
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return this.bannerModel
      .find({
        category_id: category._id,
        is_active: true,
        is_deleted: false,
      })
      .select('image link')
      .lean();
  }

  async create(
    dto: CreateBannerDto,
    file: Express.Multer.File,
  ): Promise<Banner> {
    if (dto.category_id && !Types.ObjectId.isValid(dto.category_id)) {
      throw new BadRequestException('Invalid category ID');
    }

    if (dto.category_id) {
      const categoryExists = await this.categoryModel.findOne({
        _id: dto.category_id,
        is_deleted: false,
      });
      if (!categoryExists) {
        throw new NotFoundException('Category not found');
      }
    }

    let imageUrl = dto.image;
    if (file) {
      try {
        imageUrl = await this.cloudinaryService.uploadImage(
          file,
          'WebSieuThi/banners',
        );
      } catch {
        throw new BadRequestException('Error uploading image');
      }
    }

    const banner = new this.bannerModel({
      ...dto,
      category_id: dto.category_id
        ? new Types.ObjectId(dto.category_id)
        : undefined,
      is_active: dto.is_active !== undefined ? dto.is_active : true,
      image: imageUrl,
    });

    const savedBanner = await banner.save();
    return {
      image: savedBanner.image,
      link: savedBanner.link,
      category_id: savedBanner.category_id,
      is_active: savedBanner.is_active,
      is_deleted: savedBanner.is_deleted,
    } as Banner;
  }

  async update(
    id: string,
    dto: UpdateBannerDto,
    file: Express.Multer.File,
  ): Promise<Banner> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid banner ID');
    }

    if (dto.category_id) {
      if (!Types.ObjectId.isValid(dto.category_id)) {
        throw new BadRequestException('Invalid category ID');
      }
      const categoryExists = await this.categoryModel.findOne({
        _id: dto.category_id,
        is_deleted: false,
      });
      if (!categoryExists) {
        throw new NotFoundException('Category not found');
      }
    }

    let imageUrl = dto.image;
    if (file) {
      try {
        imageUrl = await this.cloudinaryService.uploadImage(
          file,
          'WebSieuThi/banners',
        );
      } catch {
        throw new BadRequestException('Error uploading image');
      }
    }

    const updateData: Record<string, any> = { ...dto };

    if (imageUrl) {
      updateData.image = imageUrl;
    }
    if (dto.category_id) {
      updateData.category_id = new Types.ObjectId(dto.category_id);
    }

    // Loại bỏ các field undefined
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updated = await this.bannerModel
      .findOneAndUpdate(
        { _id: id, is_deleted: false },
        { $set: updateData },
        { new: true },
      )
      .select('image link category_id')
      .lean();

    if (!updated) {
      throw new NotFoundException('Banner not found');
    }

    return updated as Banner;
  }

  async delete(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid banner ID');
    }

    const result = await this.bannerModel
      .findByIdAndUpdate(
        id,
        { $set: { is_deleted: true, is_active: false } },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new NotFoundException('Banner not found');
    }

    return { message: 'Banner deleted successfully' };
  }
}
