import { v2 as cloudinary, ConfigOptions } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  useFactory: (config: ConfigService): typeof cloudinary => {
    const opts: ConfigOptions = {
      cloud_name: config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: config.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    };
    cloudinary.config(opts);
    return cloudinary;
  },
  inject: [ConfigService],
};
