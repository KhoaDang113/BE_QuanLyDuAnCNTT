import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Rating, RatingDocument } from '../schema/rating.schema';
import { CreateRatingDto } from '../dto/create-rating.dto';
import { UpdateRatingDto } from '../dto/update-rating.dto';
import { GetRatingsDto } from '../dto/get-ratings.dto';
import { CloudinaryService } from '../../../shared/cloudinary/cloudinary.service';

interface RatingStats {
  _id: null;
  avgRating: number;
  totalRatings: number;
  rating5: number;
  rating4: number;
  rating3: number;
  rating2: number;
  rating1: number;
}

@Injectable()
export class RatingService {
  constructor(
    @InjectModel(Rating.name) private ratingModel: Model<RatingDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async getRatingsByProduct(dto: GetRatingsDto) {
    const { product_id, page = 1, limit = 10 } = dto;

    if (!product_id) {
      throw new BadRequestException('product_id is required');
    }

    if (!Types.ObjectId.isValid(product_id)) {
      throw new BadRequestException('product_id is invalid');
    }

    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      this.ratingModel
        .find({
          product_id: new Types.ObjectId(product_id),
          is_deleted: false,
        })
        .populate('user_id', 'name avatar email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id product_id user_id content rating images created_at')
        .lean(),
      this.ratingModel.countDocuments({
        product_id: new Types.ObjectId(product_id),
        is_deleted: false,
      }),
    ]);

    const ratingStats = await this.ratingModel.aggregate<RatingStats>([
      {
        $match: {
          product_id: new Types.ObjectId(product_id),
          is_deleted: false,
        },
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalRatings: { $sum: 1 },
          rating5: {
            $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] },
          },
          rating4: {
            $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] },
          },
          rating3: {
            $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] },
          },
          rating2: {
            $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] },
          },
          rating1: {
            $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] },
          },
        },
      },
    ]);

    const stats: RatingStats = ratingStats[0] || {
      _id: null,
      avgRating: 0,
      totalRatings: 0,
      rating5: 0,
      rating4: 0,
      rating3: 0,
      rating2: 0,
      rating1: 0,
    };

    return {
      ratings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        avgRating: Math.round(stats.avgRating * 10) / 10,
        totalRatings: stats.totalRatings,
        distribution: {
          5: stats.rating5,
          4: stats.rating4,
          3: stats.rating3,
          2: stats.rating2,
          1: stats.rating1,
        },
      },
    };
  }

  async getRatingsByUser(userId: string, page = 1, limit = 10) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('userId is invalid');
    }

    const skip = (page - 1) * limit;

    const [ratings, total] = await Promise.all([
      this.ratingModel
        .find({
          user_id: new Types.ObjectId(userId),
          is_deleted: false,
        })
        .populate('product_id', 'name slug image_primary')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .select('_id product_id user_id content rating images created_at')
        .lean(),
      this.ratingModel.countDocuments({
        user_id: new Types.ObjectId(userId),
        is_deleted: false,
      }),
    ]);

    return {
      ratings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createRating(
    userId: string,
    dto: CreateRatingDto,
    files?: Express.Multer.File[],
  ) {
    if (!Types.ObjectId.isValid(dto.product_id)) {
      throw new BadRequestException('product_id is invalid');
    }

    let imageUrls: string[] = [];
    if (files && files.length > 0) {
      try {
        imageUrls = await this.cloudinaryService.uploadMultipleImages(
          files,
          'WebSieuThi/ratings',
        );
      } catch {
        throw new BadRequestException('Error uploading images');
      }
    }

    const rating = new this.ratingModel({
      product_id: new Types.ObjectId(dto.product_id),
      user_id: new Types.ObjectId(userId),
      content: dto.content,
      rating: dto.rating,
      images: imageUrls,
    });

    await rating.save();

    return await this.ratingModel
      .findById(rating._id)
      .populate('user_id', 'name avatar email')
      .select('_id product_id user_id content rating images created_at')
      .lean();
  }

  async updateRating(
    ratingId: string,
    userId: string,
    dto: UpdateRatingDto,
    files?: Express.Multer.File[],
  ) {
    if (!Types.ObjectId.isValid(ratingId)) {
      throw new BadRequestException('ratingId is invalid');
    }

    const rating = await this.ratingModel.findOne({
      _id: new Types.ObjectId(ratingId),
      is_deleted: false,
    });

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    if (rating.user_id.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to edit this rating',
      );
    }
    if (files && files.length > 0) {
      try {
        dto.images = await this.cloudinaryService.uploadMultipleImages(
          files,
          'WebSieuThi/ratings',
        );
      } catch {
        throw new BadRequestException('Error uploading images');
      }
    }

    const { images, ...rest } = dto;
    Object.assign(rating, rest);
    if (Array.isArray(images) && images.length > 0) {
      rating.images = images;
    }
    await rating.save();

    return await this.ratingModel
      .findById(rating._id)
      .populate('user_id', 'name avatar email')
      .select('_id product_id user_id content rating images created_at')
      .lean();
  }

  async deleteRating(ratingId: string, userId: string, isAdmin = false) {
    if (!Types.ObjectId.isValid(ratingId)) {
      throw new BadRequestException('ratingId is invalid');
    }

    const rating = await this.ratingModel.findOne({
      _id: new Types.ObjectId(ratingId),
      is_deleted: false,
    });

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    if (!isAdmin && rating.user_id.toString() !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this rating',
      );
    }

    rating.is_deleted = true;
    await rating.save();

    return {
      message: 'Rating deleted successfully',
    };
  }

  async getRatingById(ratingId: string) {
    if (!Types.ObjectId.isValid(ratingId)) {
      throw new BadRequestException('ratingId is invalid');
    }

    const rating = await this.ratingModel
      .findOne({
        _id: new Types.ObjectId(ratingId),
        is_deleted: false,
      })
      .populate('user_id', 'name avatar email')
      .populate('product_id', 'name slug image_primary')
      .select('_id product_id user_id content rating images created_at')
      .lean();

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    return rating;
  }
}
