import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Address, AddressDocument } from './schema/address.schema';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(
    @InjectModel(Address.name)
    private addressModel: Model<AddressDocument>,
  ) {}

  private ensureObjectId(id: string, label = 'id'): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
    return new Types.ObjectId(id);
  }

  async findAllByUser(userId: string): Promise<Address[]> {
    const userObjectId = this.ensureObjectId(userId, 'user id');
    return this.addressModel
      .find({ user_id: userObjectId, is_active: true })
      .select(
        'full_name phone address ward district city zip_code latitude longitude is_default is_active user_id',
      )
      .exec();
  }

  async findOneByUser(userId: string, addressId: string): Promise<Address> {
    const userObjectId = this.ensureObjectId(userId, 'user id');
    const addressObjectId = this.ensureObjectId(addressId, 'address id');
    const address = await this.addressModel
      .findOne({ _id: addressObjectId, user_id: userObjectId, is_active: true })
      .exec();
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  async create(userId: string, dto: CreateAddressDto): Promise<Address> {
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    const userObjectId = this.ensureObjectId(userId, 'user id');

    const address = await this.findAllByUser(userId);

    if (address.length == 0) {
      dto.is_default = true;
    }

    if (dto.is_default) {
      await this.addressModel.updateMany(
        { user_id: userObjectId, is_default: true },
        { $set: { is_default: false } },
      );
    }

    const created = new this.addressModel({ ...dto, user_id: userObjectId });
    return created.save();
  }

  async update(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<Address> {
    const userObjectId = this.ensureObjectId(userId, 'user id');
    const addressObjectId = this.ensureObjectId(addressId, 'address id');

    if (dto.is_default) {
      await this.addressModel.updateMany(
        { user_id: userObjectId, is_default: true },
        { $set: { is_default: false } },
      );
    }

    // Loại bỏ các field undefined
    const updateData: Record<string, any> = { ...dto };
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updated = await this.addressModel
      .findOneAndUpdate(
        { _id: addressObjectId, user_id: userObjectId },
        { $set: updateData },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Address not found');
    }

    return updated;
  }

  async remove(
    userId: string,
    addressId: string,
  ): Promise<{ message: string }> {
    const userObjectId = this.ensureObjectId(userId, 'user id');
    const addressObjectId = this.ensureObjectId(addressId, 'address id');

    const updated = await this.addressModel
      .findOneAndUpdate(
        { _id: addressObjectId, user_id: userObjectId },
        { $set: { is_active: false, is_default: false } },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Address not found');
    }

    return { message: 'Address deleted successfully' };
  }
}
