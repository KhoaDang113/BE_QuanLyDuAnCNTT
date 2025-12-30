import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ComboService } from '../service/combo.service';
import { Public } from '../../../common/decorators/public.decorator';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { CreateComboDto } from '../dto/create-combo.dto';
import { UpdateComboDto } from '../dto/update-combo.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('combos')
export class ComboController {
  constructor(private readonly comboService: ComboService) {}

  @UseGuards(AdminGuard)
  @Get('combos-admin')
  async getCombosAdmin(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('key') key?: string,
    @Query('type_combo_id') type_combo_id?: string,
  ): Promise<any> {
    return await this.comboService.getCombosAdmin(page, limit, key, type_combo_id);
  }

  @Public()
  @Get()
  async getAllCombos() {
    return this.comboService.findAll();
  }

  @Public()
  @Get(':id')
  async getComboById(@Param('id') id: string) {
    return this.comboService.findById(id);
  }

  @Post()
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('image'))
  async createCombo(
    @Body() createComboDto: CreateComboDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.comboService.create(createComboDto, file);
  }

  @Put(':id')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('image'))
  async updateCombo(
    @Param('id') id: string,
    @Body() updateComboDto: UpdateComboDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.comboService.update(id, updateComboDto, file);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteCombo(@Param('id') id: string) {
    return this.comboService.delete(id);
  }
}
