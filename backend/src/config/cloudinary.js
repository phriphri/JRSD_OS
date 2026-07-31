'use strict';

const cloudinary = require('cloudinary').v2;
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Checks if Cloudinary credentials are fully configured.
 */
function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_API_SECRET !== 'sample_secret_key'
  );
}

/**
 * Upload a file buffer to Cloudinary using stream.
 * @param {Buffer} buffer - File buffer from Multer memoryStorage
 * @param {Object} options - Upload options (folder, resource_type, public_id, etc.)
 * @returns {Promise<{ secure_url: string, public_id: string, format: string, resource_type: string }>}
 */
async function uploadToCloudinary(buffer, options = {}) {
  const uploadOptions = {
    resource_type: 'auto',
    folder: 'jrsd_os',
    ...options,
  };

  // Fallback mock mode if Cloudinary is not configured with real API keys
  if (!isCloudinaryConfigured()) {
    console.warn('[Cloudinary Warning] Using local fallback URL since real Cloudinary API keys are not set.');
    const timestamp = Date.now();
    const mockPublicId = `${uploadOptions.folder}/${options.public_id || 'file_' + timestamp}`;
    const base64Data = buffer ? `data:${options.mimetype || 'application/octet-stream'};base64,${buffer.toString('base64')}` : '';
    return {
      secure_url: base64Data || `https://res.cloudinary.com/demo/image/upload/sample.jpg`,
      public_id: mockPublicId,
      format: options.format || 'bin',
      resource_type: 'auto',
    };
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      resolve({
        secure_url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        resource_type: result.resource_type,
      });
    });
    uploadStream.end(buffer);
  });
}

/**
 * Delete a resource from Cloudinary by public_id.
 * @param {string} publicId - The Cloudinary public_id
 * @param {string} resourceType - 'image', 'raw', 'video', or 'auto'
 */
async function deleteFromCloudinary(publicId, resourceType = 'image') {
  if (!publicId || !isCloudinaryConfigured()) return true;
  try {
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return result.result === 'ok' || result.result === 'not found';
  } catch (err) {
    console.error('[deleteFromCloudinary error]', err.message);
    return false;
  }
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadToCloudinary,
  deleteFromCloudinary,
};
