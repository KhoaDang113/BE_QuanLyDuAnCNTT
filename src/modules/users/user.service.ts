import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UpdateUserByAdminDto } from './dto/update-user-by-admin.dto';
import { GetUsersDto } from './dto/get-users.dto';
import { CloudinaryService } from '../../shared/cloudinary/cloudinary.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async getUserProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('name email phone avatar gender');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateUserProfile(
    userId: string,
    updateUserDto: UpdateUserProfileDto,
    file: Express.Multer.File,
  ): Promise<User> {
    let avatar_url = updateUserDto.avatar;

    if (file) {
      try {
        avatar_url = await this.cloudinaryService.uploadImage(
          file,
          'WebSieuThi/avatars',
        );
      } catch {
        throw new BadRequestException('Error uploading image');
      }
    }
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { ...updateUserDto, avatar: avatar_url },
        { new: true },
      )
      .select('name email phone avatar gender');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getAllUsers(dto: GetUsersDto) {
    const { page = 1, limit = 10, role, search } = dto;
    const skip = (page - 1) * limit;

    const query: Record<string, any> = {};

    if (role) {
      query.role = role;
    }
    let useTextScore = false;
    if (search) {
      const isNumeric = /^\d+$/.test(search);
      if (isNumeric) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.phone = { $regex: `^${escaped}` };
      } else {
        query.$text = { $search: search };
        useTextScore = true;
      }
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .select('name email phone avatar gender role isLocked createdAt')
        .sort(
          useTextScore
            ? {
                score: { $meta: 'textScore' },
              }
            : { createdAt: -1 },
        )
        .skip(skip)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(query),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID');
    }

    const user = await this.userModel
      .findById(userId)
      .select(
        'name email phone avatar gender role isLocked emailVerifiedAt isPhoneVerified authProvider createdAt updatedAt',
      );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUserByAdmin(
    userId: string,
    updateDto: UpdateUserByAdminDto,
    file: Express.Multer.File,
  ) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID');
    }

    let avatar_url = updateDto.avatar;
    if (file) {
      try {
        avatar_url = await this.cloudinaryService.uploadImage(
          file,
          'WebSieuThi/avatars',
        );
      } catch {
        throw new BadRequestException('Error uploading image');
      }
    }
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { ...updateDto, avatar: avatar_url },
        { new: true },
      )
      .select(
        'name email phone avatar gender role isLocked emailVerifiedAt isPhoneVerified authProvider',
      );

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async lockUser(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID');
    }

    const user = await this.userModel
      .findByIdAndUpdate(userId, { isLocked: true }, { new: true })
      .select('name email isLocked');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User locked successfully',
      user,
    };
  }

  async unlockUser(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Invalid user ID');
    }

    const user = await this.userModel
      .findByIdAndUpdate(userId, { isLocked: false }, { new: true })
      .select('name email isLocked');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      message: 'User unlocked successfully',
      user,
    };
  }
}
