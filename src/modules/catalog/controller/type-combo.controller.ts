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
} from '@nestjs/common';
import { TypeComboService } from '../service/type-combo.service';
import { Public } from '../../../common/decorators/public.decorator';
import { AdminGuard } from '../../../common/guards/admin.guard';
import { CreateTypeComboDto } from '../dto/create-type-combo.dto';
import { UpdateTypeComboDto } from '../dto/update-type-combo.dto';


@Controller('type-combos')
export class TypeComboController {
  constructor(private readonly typeComboService: TypeComboService) {}

  @UseGuards(AdminGuard)
  @Get('type-combos-admin')
  async getTypeComboAdmin(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('key') key?: string,
  ): Promise<any> {
    return await this.typeComboService.getTypeComboAdmin(page, limit, key);
  }


  @Public()
  @Get()
  async getAllTypeCombos() {
    return this.typeComboService.findAll();
  }


  @Public()
  @Get(':id')
  async getTypeComboById(@Param('id') id: string) {
    return this.typeComboService.findById(id);
  }


  @Post()
  @UseGuards(AdminGuard)
  async createTypeCombo(@Body() createTypeComboDto: CreateTypeComboDto) {
    return this.typeComboService.create(createTypeComboDto);
  }


  @Put(':id')
  @UseGuards(AdminGuard)
  async updateTypeCombo(
    @Param('id') id: string,
    @Body() updateTypeComboDto: UpdateTypeComboDto,
  ) {
    return this.typeComboService.update(id, updateTypeComboDto);
  }


  @Delete(':id')
  @UseGuards(AdminGuard)
  async deleteTypeCombo(@Param('id') id: string) {
    return this.typeComboService.delete(id);
  }
}
