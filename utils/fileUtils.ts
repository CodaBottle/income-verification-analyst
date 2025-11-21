
import type { UploadedFile } from '../types';

// Maximum dimensions for image compression
const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

// Compress image files to reduce payload size
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Only compress images
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;

      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          if (width > height) {
            height = (height / width) * MAX_IMAGE_DIMENSION;
            width = MAX_IMAGE_DIMENSION;
          } else {
            width = (width / height) * MAX_IMAGE_DIMENSION;
            height = MAX_IMAGE_DIMENSION;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          JPEG_QUALITY
        );
      };

      img.onerror = () => resolve(file);
    };

    reader.onerror = () => resolve(file);
  });
};

export const fileToBase64 = async (file: File): Promise<UploadedFile> => {
  // Compress image before converting to base64
  const processedFile = await compressImage(file);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(processedFile);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      if (!base64Data) {
        reject(new Error("Could not extract base64 data from file."));
        return;
      }
      resolve({
        name: file.name,
        mimeType: processedFile.type,
        data: base64Data,
      });
    };
    reader.onerror = (error) => reject(error);
  });
};

// Validate total payload size (base64 increases size by ~33%)
export const validateFilesSize = (files: File[]): { valid: boolean; totalSize: number; estimatedBase64Size: number } => {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const estimatedBase64Size = totalSize * 1.33; // Base64 encoding overhead
  const MAX_PAYLOAD_SIZE = 3.5 * 1024 * 1024; // 3.5 MB to stay under 4.5 MB limit with margin

  return {
    valid: estimatedBase64Size < MAX_PAYLOAD_SIZE,
    totalSize,
    estimatedBase64Size,
  };
};
