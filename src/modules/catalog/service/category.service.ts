import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from '../schema/category.schema';
import { Product, ProductDocument } from '../schema/product.schema';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { CloudinaryService } from 'src/shared/cloudinary/cloudinary.service';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  /**
   * Lấy tất cả category và sub-category
   * Trả về danh sách category cha kèm theo danh sách subCategories
   */
  async findAll(): Promise<Category[]> {
    const parentCategories = await this.categoryModel
      .find({
        parent_id: null,
        is_active: true,
        is_deleted: false,
      })
      .select('_id name slug description image is_active is_deleted')
      .lean();

    const categoryWithsubCategories = await Promise.all(
      parentCategories.map(async (parent) => {
        const subCategories = await this.categoryModel
          .find({
            parent_id: parent._id,
            is_active: true,
            is_deleted: false,
          })
          .select('_id name slug description image is_active is_deleted')
          .lean();

        return { ...parent, subCategories: subCategories };
      }),
    );

    return categoryWithsubCategories;
  }

  /**
   * Tìm category theo ID
   * @param id ID của category
   */
  async findById(id: string): Promise<Category> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    const category = await this.categoryModel
      .findOne({ _id: id, is_deleted: false })
      .populate('parent_id')
      .exec();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  /**
   * Tìm category theo Slug
   * @param slug Slug của category
   */
  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoryModel
      .findOne({ slug, is_deleted: false })
      .populate('parent_id')
      .exec();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  /**
   * Tìm các category con của một parentId
   * @param parentId ID của category cha
   */
  async findChildren(parentId: string): Promise<Category[]> {
    if (!Types.ObjectId.isValid(parentId)) {
      throw new BadRequestException('Invalid parent ID');
    }

    return this.categoryModel
      .find({ parent_id: parentId, is_deleted: false })
      .exec();
  }

  /**
   * Tìm các category gốc (không có parent)
   */
  async findRootCategories(): Promise<Category[]> {
    return this.categoryModel
      .find({
        $or: [{ parent_id: null }, { parent_id: { $exists: false } }],
        is_deleted: false,
      })
      .exec();
  }

  /**
   * Kiểm tra slug đã tồn tại chưa
   * @param slug Slug cần kiểm tra
   * @param excludeId ID cần loại trừ (nếu đang update)
   */
  async checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
    const query: Record<string, any> = {
      slug,
      is_deleted: false,
    };

    if (excludeId && Types.ObjectId.isValid(excludeId)) {
      query._id = { $ne: new Types.ObjectId(excludeId) };
    }

    const existing = await this.categoryModel.findOne(query).lean();
    return !!existing;
  }

  /**
   * Tạo mới category
   * @param createCategoryDto Dữ liệu tạo mới
   * @param file File ảnh upload lên Cloudinary
   */
  async create(
    createCategoryDto: CreateCategoryDto,
    file: Express.Multer.File,
  ): Promise<Category> {
    if (createCategoryDto.parent_id) {
      if (!Types.ObjectId.isValid(createCategoryDto.parent_id)) {
        throw new BadRequestException('Invalid parent category ID');
      }
      const parentExists = await this.categoryModel.findOne({
        _id: createCategoryDto.parent_id,
        is_deleted: false,
      });
      if (!parentExists) {
        throw new NotFoundException('Parent category not found');
      }
    }

    let imageUrl = createCategoryDto.image;
    if (file) {
      try {
        imageUrl = await this.cloudinaryService.uploadImage(
          file,
          'WebSieuThi/categories',
        );
      } catch {
        throw new BadRequestException('Error uploading image');
      }
    }

    const category = new this.categoryModel({
      ...createCategoryDto,
      parent_id: createCategoryDto.parent_id
        ? new Types.ObjectId(createCategoryDto.parent_id)
        : null,
      is_active:
        createCategoryDto.is_active !== undefined
          ? createCategoryDto.is_active
          : true,
      image: imageUrl,
    });

    try {
      return await category.save();
    } catch (error: any) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: number }).code === 11000
      ) {
        throw new BadRequestException(
          `Category with slug "${createCategoryDto.slug}" already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * Cập nhật category
   * @param id ID category
   * @param updateCategoryDto Dữ liệu cập nhật
   * @param file File ảnh mới (nếu có)
   */
  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
    file: Express.Multer.File,
  ): Promise<Category> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    if (updateCategoryDto.parent_id) {
      if (!Types.ObjectId.isValid(updateCategoryDto.parent_id)) {
        throw new BadRequestException('Invalid parent category ID');
      }

      if (updateCategoryDto.parent_id === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }
      const parentExists = await this.categoryModel.findOne({
        _id: updateCategoryDto.parent_id,
        is_deleted: false,
      });
      if (!parentExists) {
        throw new NotFoundException('Parent category not found');
      }
    }

    let imageUrl = updateCategoryDto.image;
    if (file) {
      try {
        imageUrl = await this.cloudinaryService.uploadImage(
          file,
          'WebSieuThi/categories',
        );
      } catch {
        throw new BadRequestException('Error uploading image');
      }
    }

    const updateData: Record<string, any> = {
      ...updateCategoryDto,
    };

    if (imageUrl) {
      updateData.image = imageUrl;
    }
    if (updateCategoryDto.parent_id) {
      updateData.parent_id = new Types.ObjectId(updateCategoryDto.parent_id);
    }

    // Loại bỏ các field undefined
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    try {
      const category = await this.categoryModel
        .findOneAndUpdate(
          { _id: id, is_deleted: false },
          { $set: updateData },
          { new: true },
        )
        .exec();

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      return category;
    } catch (error: any) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: number }).code === 11000
      ) {
        throw new BadRequestException(
          `Category with slug "${updateCategoryDto.slug}" already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * Xóa category (soft delete)
   * Không thể xóa nếu có category con
   * @param id ID category
   */
  async delete(id: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    const hasChildren = await this.categoryModel
      .findOne({ parent_id: id, is_deleted: false })
      .exec();
    if (hasChildren) {
      throw new BadRequestException(
        'Cannot delete category with subcategories',
      );
    }

    const result = await this.categoryModel
      .findByIdAndUpdate(
        id,
        { $set: { is_deleted: true, is_active: false } },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new NotFoundException('Category not found');
    }

    return { message: 'Category deleted successfully' };
  }

  /**
   * Đếm số lượng sản phẩm của category
   * @param id ID category
   */
  async getProductCount(id: string): Promise<{ count: number }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    const count = await this.productModel.countDocuments({
      category_id: new Types.ObjectId(id),
      is_deleted: false,
    });

    return { count };
  }

  /**
   * Xóa category và tất cả sản phẩm trong đó (soft delete cả 2)
   * Vẫn check nếu có sub-category thì chặn xóa
   * @param id ID category
   */
  async deleteWithProducts(id: string): Promise<{ message: string; deletedProductsCount: number }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category ID');
    }

    const hasChildren = await this.categoryModel
      .findOne({ parent_id: id, is_deleted: false })
      .exec();
    if (hasChildren) {
      throw new BadRequestException(
        'Không thể xóa danh mục có danh mục con. Vui lòng xóa danh mục con trước.',
      );
    }

    // Đếm và xóa (soft delete) tất cả sản phẩm trong danh mục
    const productResult = await this.productModel.updateMany(
      { category_id: new Types.ObjectId(id), is_deleted: false },
      { $set: { is_deleted: true, is_active: false } },
    );

    // Xóa (soft delete) danh mục
    const result = await this.categoryModel
      .findByIdAndUpdate(
        id,
        { $set: { is_deleted: true, is_active: false } },
        { new: true },
      )
      .exec();

    if (!result) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    return {
      message: 'Xóa danh mục và sản phẩm thành công',
      deletedProductsCount: productResult.modifiedCount,
    };
  }

  /**
   * Lấy danh sách category cho admin với phân trang và tìm kiếm
   * @param page Trang hiện tại
   * @param limit Số item/trang
   * @param key Keyword tìm kiếm
   */
  async getCategoriesAdmin(
    page: number = 1,
    limit: number = 10,
    key?: string,
  ): Promise<any> {
    const skip = (page - 1) * limit;
    const query: Record<string, any> = { is_deleted: false };

    if (key && typeof key === 'string' && key.trim().length > 0) {
      query.$text = { $search: key.trim() };
    }

    const [categories, total] = await Promise.all([
      this.categoryModel
        .find(query)
        .skip(skip)
        .limit(limit)
        .select('_id name slug image is_active parent_id')
        .lean(),
      this.categoryModel.countDocuments(query),
    ]);

    return {
      total,
      page,
      limit,
      categories,
    };
  }
}
