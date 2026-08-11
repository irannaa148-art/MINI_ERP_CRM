import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config/env';
import fs from 'fs';
import path from 'path';

let s3Client: S3Client | null = null;

if (config.aws.s3Bucket && config.aws.accessKeyId && config.aws.secretAccessKey) {
  s3Client = new S3Client({
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  });
}

export const uploadProductImage = async (
  file: Express.Multer.File
): Promise<string> => {
  const fileExt = path.extname(file.originalname) || '.jpg';
  const fileName = `products/${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;

  if (s3Client && config.aws.s3Bucket) {
    try {
      const command = new PutObjectCommand({
        Bucket: config.aws.s3Bucket,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await s3Client.send(command);
      return `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${fileName}`;
    } catch (err) {
      console.warn('AWS S3 upload failed, falling back to local file storage:', err);
    }
  }

  // Fallback: Store on local disk
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const localFileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
  const localFilePath = path.join(uploadDir, localFileName);
  fs.writeFileSync(localFilePath, file.buffer);

  return `/uploads/${localFileName}`;
};
