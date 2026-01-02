// File: brand.service.ts
// Mô tả: Service chứa business logic cho module quản lý thương hiệu
// Chức năng: Xử lý các nghiệp vụ CRUD cho thương hiệu, tương tác với database

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

// Decorator @Injectable: Đánh dấu class này có thể được inject vào các class khác
@Injectable()
export class BrandService {
  constructor(
    // Inject Brand model để thao tác với collection Brand trong MongoDB
    @InjectModel(Brand.name)
    private brandModel: Model<BrandDocument>,
    // Inject CloudinaryService để upload hình ảnh lên Cloudinary
    private readonly cloudinaryService: CloudinaryService,
  ) { }

  // ============================================================
  // CÁC PHƯƠNG THỨC TRUY VẤN (READ)
  // ============================================================

  /**
   * Lấy tất cả thương hiệu đang hoạt động
   * Điều kiện: is_active = true và is_deleted = false
   * Chỉ trả về các trường cần thiết: name, slug, description, image
   * @returns Danh sách thương hiệu
   */
  async findAll(): Promise<Brand[]> {
    return this.brandModel
      .find({ is_active: true, is_deleted: false })
      .select('name slug description image')
      .lean(); // lean() trả về plain JavaScript object, tối ưu hiệu năng
  }

  /**
   * Tìm thương hiệu theo ID
   * @param id - ID của thương hiệu
   * @returns Thông tin thương hiệu
   * @throws BadRequestException nếu ID không hợp lệ
   * @throws NotFoundException nếu không tìm thấy thương hiệu
   */
  async findById(id: string): Promise<Brand> {
    // Kiểm tra ID có đúng định dạng MongoDB ObjectId không
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

  /**
   * Tìm thương hiệu theo slug
   * @param slug - Slug của thương hiệu (URL-friendly)
   * @returns Thông tin thương hiệu
   * @throws NotFoundException nếu không tìm thấy thương hiệu
   */
  async findBySlug(slug: string): Promise<Brand> {
    const brand = await this.brandModel
      .findOne({ slug, is_deleted: false })
      .exec();

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return brand;
  }

  /**
   * Lấy danh sách thương hiệu cho Admin (có phân trang và tìm kiếm)
   * @param page - Số trang hiện tại (mặc định: 1)
   * @param limit - Số lượng item mỗi trang (mặc định: 10)
   * @param key - Từ khóa tìm kiếm theo name hoặc slug (optional)
   * @returns Object chứa danh sách thương hiệu và thông tin phân trang
   */
  async getBrandsAdmin(
    page: number = 1,
    limit: number = 10,
    key?: string,
  ): Promise<any> {
    // Tính số bản ghi cần bỏ qua dựa trên page và limit
    const skip = (page - 1) * limit;

    // Xây dựng query - chỉ lấy các bản ghi chưa bị xóa
    const query: Record<string, any> = { is_deleted: false };

    // Nếu có từ khóa tìm kiếm, thêm điều kiện search
    // Tìm kiếm theo name HOẶC slug (case-insensitive)
    if (key && typeof key === 'string' && key.trim().length > 0) {
      query.$or = [
        { name: { $regex: key.trim(), $options: 'i' } },
        { slug: { $regex: key.trim(), $options: 'i' } },
      ];
    }

    // Thực hiện 2 query song song để tối ưu hiệu năng:
    // 1. Lấy danh sách thương hiệu với phân trang
    // 2. Đếm tổng số bản ghi
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
      total,    // Tổng số thương hiệu
      page,     // Trang hiện tại
      limit,    // Số lượng mỗi trang
      brands,   // Danh sách thương hiệu
    };
  }

  // ============================================================
  // CÁC PHƯƠNG THỨC TẠO MỚI (CREATE)
  // ============================================================

  /**
   * Tạo mới thương hiệu
   * @param createBrandDto - Dữ liệu thương hiệu từ request
   * @param file - File hình ảnh được upload (optional)
   * @returns Thương hiệu vừa được tạo
   * @throws BadRequestException nếu thiếu hình ảnh hoặc slug đã tồn tại
   */
  async create(
    createBrandDto: CreateBrandDto,
    file: Express.Multer.File,
  ): Promise<Brand> {
    let imageUrl = createBrandDto.image;

    // Nếu có file upload, upload lên Cloudinary
    if (file) {
      try {
        imageUrl = await this.cloudinaryService.uploadImage(
          file,
          'WebSieuThi/brands', // Folder lưu trữ trên Cloudinary
        );
      } catch {
        throw new BadRequestException('Error uploading image');
      }
    }

    // Kiểm tra bắt buộc phải có hình ảnh
    if (!imageUrl) {
      throw new BadRequestException('Image is required');
    }

    // Tạo document mới với dữ liệu từ DTO
    const brand = new this.brandModel({
      ...createBrandDto,
      image: imageUrl,
      // Nếu không truyền is_active, mặc định là true
      is_active:
        createBrandDto.is_active !== undefined
          ? createBrandDto.is_active
          : true,
    });

    try {
      // Lưu vào database
      return await brand.save();
    } catch (error: any) {
      // Xử lý lỗi duplicate key (slug đã tồn tại)
      // MongoDB error code 11000 = duplicate key error
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

  // ============================================================
  // CÁC PHƯƠNG THỨC CẬP NHẬT (UPDATE)
  // ============================================================

  /**
   * Cập nhật thông tin thương hiệu
   * @param id - ID của thương hiệu cần cập nhật
   * @param updateBrandDto - Dữ liệu cập nhật từ request
   * @param file - File hình ảnh mới (optional)
   * @returns Thương hiệu sau khi cập nhật
   * @throws BadRequestException nếu ID không hợp lệ hoặc slug đã tồn tại
   * @throws NotFoundException nếu không tìm thấy thương hiệu
   */
  async update(
    id: string,
    updateBrandDto: UpdateBrandDto,
    file: Express.Multer.File,
  ): Promise<Brand> {
    // Kiểm tra ID có đúng định dạng MongoDB ObjectId không
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid brand ID');
    }

    let imageUrl = updateBrandDto.image;

    // Nếu có file upload mới, upload lên Cloudinary
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

    // Chuẩn bị dữ liệu cập nhật
    const updateData: Record<string, any> = {
      ...updateBrandDto,
    };

    // Nếu có URL hình ảnh mới, thêm vào updateData
    if (imageUrl) {
      updateData.image = imageUrl;
    }

    // Loại bỏ các trường có giá trị undefined
    // (chỉ cập nhật những trường được gửi lên)
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    try {
      // Tìm và cập nhật thương hiệu
      // Điều kiện: id khớp và chưa bị xóa
      const brand = await this.brandModel
        .findOneAndUpdate(
          { _id: id, is_deleted: false },
          { $set: updateData },
          { new: true }, // Trả về document sau khi cập nhật
        )
        .exec();

      if (!brand) {
        throw new NotFoundException('Brand not found');
      }

      return brand;
    } catch (error: any) {
      // Xử lý lỗi duplicate key (slug đã tồn tại)
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

  // ============================================================
  // CÁC PHƯƠNG THỨC XÓA (DELETE)
  // ============================================================

  /**
   * Xóa thương hiệu (soft delete)
   * Không xóa thực sự mà chỉ đánh dấu is_deleted = true
   * @param id - ID của thương hiệu cần xóa
   * @returns Thông báo xóa thành công
   * @throws BadRequestException nếu ID không hợp lệ
   * @throws NotFoundException nếu không tìm thấy thương hiệu
   */
  async delete(id: string): Promise<{ message: string }> {
    // Kiểm tra ID có đúng định dạng MongoDB ObjectId không
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid brand ID');
    }

    // Soft delete: cập nhật is_deleted = true và is_active = false
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
}
