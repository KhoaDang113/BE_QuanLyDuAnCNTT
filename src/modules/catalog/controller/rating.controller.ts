import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFiles,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';
import { RatingService } from '../service/rating.service';
import { CreateRatingDto } from '../dto/create-rating.dto';
import { UpdateRatingDto } from '../dto/update-rating.dto';
import { GetRatingsDto } from '../dto/get-ratings.dto';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { Public } from '../../../common/decorators/public.decorator';

@Controller('ratings')
export class RatingController {
  constructor(private readonly ratingService: RatingService) {}

  @Public()
  @Get('product')
  async getRatingsByProduct(@Query() dto: GetRatingsDto) {
    return this.ratingService.getRatingsByProduct(dto);
  }

  @Get('my-ratings')
  async getMyRatings(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.ratingService.getRatingsByUser(userId, page, limit);
  }

  @Public()
  @Get(':id')
  async getRatingById(@Param('id') id: string) {
    return this.ratingService.getRatingById(id);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('images', 5))
  async createRating(
    @Req() req: Request,
    @Body() dto: CreateRatingDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.ratingService.createRating(userId, dto, files);
  }

  @Put(':id')
  @UseInterceptors(FilesInterceptor('images', 5))
  async updateRating(
    @Param('id') id: string,
    @Req() req: Request,
    @Body() dto: UpdateRatingDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.ratingService.updateRating(id, userId, dto, files);
  }

  @Delete(':id')
  async deleteRating(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.ratingService.deleteRating(id, userId, false);
  }

  @UseGuards(AdminGuard)
  @Delete('admin/:id')
  async adminDeleteRating(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user?.id as string;
    if (!userId) {
      throw new UnauthorizedException('User not found');
    }
    return this.ratingService.deleteRating(id, userId, true);
  }
}
