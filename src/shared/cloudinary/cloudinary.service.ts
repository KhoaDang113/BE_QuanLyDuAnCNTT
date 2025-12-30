import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'common',
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const allowedFormats = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'image/bmp',
      'image/heic',
      'image/heif',
      'image/avif',
      'image/tiff',
    ];
    if (!allowedFormats.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and WebP are allowed',
      );
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 5MB');
    }

    if (file.buffer && file.buffer.length > 0) {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folder,
            resource_type: 'image',
            transformation: [{ quality: 'auto' }, { fetch_format: 'auto' }],
          },
          (error, result: UploadApiResponse) => {
            if (error) {
              reject(
                new BadRequestException(`Upload failed: ${error.message}`),
              );
            } else {
              resolve(result.secure_url);
            }
          },
        );

        const readableStream = new Readable();
        readableStream.push(file.buffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
      });
    }

    type FileWithPath = Express.Multer.File & { path: string };
    const maybePath = (file as Partial<FileWithPath>).path;
    if (typeof maybePath === 'string') {
      try {
        const result = await cloudinary.uploader.upload(maybePath, {
          folder,
          resource_type: 'image',
          transformation: [{ quality: 'auto' }, { fetch_format: 'auto' }],
        });
        return result.secure_url;
      } catch (error: unknown) {
        const errObj = error as Record<string, unknown> | null;
        const message =
          errObj && typeof errObj.message === 'string'
            ? errObj.message
            : 'Unknown error';
        throw new BadRequestException(`Upload failed: ${message}`);
      }
    }

    throw new BadRequestException(
      'No file buffer or path available for upload',
    );
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'common',
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Allowed file types for documents
    const allowedFormats = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/zip',
      'application/x-rar-compressed',
    ];

    if (!allowedFormats.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed types: Images (JPEG, PNG, WebP), Documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX), Text (TXT, CSV), Archives (ZIP, RAR)',
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB for documents
    if (file.size > maxSize) {
      throw new BadRequestException(
        'File size too large. Maximum size is 10MB',
      );
    }

    // Determine resource type based on mimetype
    const isImage = file.mimetype.startsWith('image/');
    const resourceType = isImage ? 'image' : 'raw';

    if (file.buffer && file.buffer.length > 0) {
      return new Promise((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        const uploadOptions: any = {
          folder: folder,
          resource_type: resourceType,
        };

        // Only apply transformation for images
        if (isImage) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          uploadOptions.transformation = [
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ];
        }

        const uploadStream = cloudinary.uploader.upload_stream(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          uploadOptions,
          (error, result: UploadApiResponse) => {
            if (error) {
              reject(
                new BadRequestException(`Upload failed: ${error.message}`),
              );
            } else {
              resolve(result.secure_url);
            }
          },
        );

        const readableStream = new Readable();
        readableStream.push(file.buffer);
        readableStream.push(null);
        readableStream.pipe(uploadStream);
      });
    }

    type FileWithPath = Express.Multer.File & { path: string };
    const maybePath = (file as Partial<FileWithPath>).path;
    if (typeof maybePath === 'string') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
        const uploadOptions: any = {
          folder,
          resource_type: resourceType,
        };

        if (isImage) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          uploadOptions.transformation = [
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ];
        }

        const result = await cloudinary.uploader.upload(
          maybePath,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          uploadOptions,
        );
        return result.secure_url;
      } catch (error: unknown) {
        const errObj = error as Record<string, unknown> | null;
        const message =
          errObj && typeof errObj.message === 'string'
            ? errObj.message
            : 'Unknown error';
        throw new BadRequestException(`Upload failed: ${message}`);
      }
    }

    throw new BadRequestException(
      'No file buffer or path available for upload',
    );
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'common',
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }

  // async deleteImage(publicId: string): Promise<any> {
  //   try {
  //     const result = await cloudinary.uploader.destroy(publicId);
  //     return result;
  //   } catch (error) {
  //     throw new BadRequestException(`Delete failed: ${error?.message}`);
  //   }
  // }

  getPublicIdFromUrl(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    const publicId = filename.split('.')[0];
    const folder = parts[parts.length - 2];
    return `${folder}/${publicId}`;
  }
}
