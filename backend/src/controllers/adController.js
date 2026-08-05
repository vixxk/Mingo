const Ad = require('../models/adModel');
const { generateUploadUrl, deleteObject, extractKeyFromUrl } = require('../utils/s3');
const ApiResponse = require('../utils/apiResponse');

class AdController {
  // Public endpoint for mobile app
  static async getActiveAds(req, res, next) {
    try {
      const ads = await Ad.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
      return ApiResponse.success(res, ads, 'Active ads retrieved');
    } catch (err) {
      next(err);
    }
  }

  // Admin endpoints
  static async getAllAds(req, res, next) {
    try {
      const ads = await Ad.find().sort({ order: 1, createdAt: -1 });
      return ApiResponse.success(res, ads, 'All ads retrieved');
    } catch (err) {
      next(err);
    }
  }

  static async createAd(req, res, next) {
    try {
      const { title, imageUrl, link, isActive, order } = req.body;
      if (!title || !imageUrl) {
        return ApiResponse.error(res, 'Title and Image URL are required', 400);
      }
      const ad = await Ad.create({ title, imageUrl, link, isActive, order });
      return ApiResponse.success(res, ad, 'Ad created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  static async updateAd(req, res, next) {
    try {
      const { id } = req.params;
      const { title, imageUrl, link, isActive, order } = req.body;
      const ad = await Ad.findById(id);
      if (!ad) {
        return ApiResponse.error(res, 'Ad not found', 404);
      }

      // If image is being changed, delete the old one
      if (imageUrl && imageUrl !== ad.imageUrl) {
        const oldKey = extractKeyFromUrl(ad.imageUrl);
        if (oldKey) await deleteObject(oldKey).catch(e => console.log('Failed to delete old S3 object:', e));
      }

      ad.title = title || ad.title;
      ad.imageUrl = imageUrl || ad.imageUrl;
      ad.link = link !== undefined ? link : ad.link;
      ad.isActive = isActive !== undefined ? isActive : ad.isActive;
      ad.order = order !== undefined ? order : ad.order;

      await ad.save();
      return ApiResponse.success(res, ad, 'Ad updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteAd(req, res, next) {
    try {
      const { id } = req.params;
      const ad = await Ad.findById(id);
      if (!ad) {
        return ApiResponse.error(res, 'Ad not found', 404);
      }

      // Delete from S3
      const key = extractKeyFromUrl(ad.imageUrl);
      if (key) await deleteObject(key).catch(e => console.log('Failed to delete S3 object:', e));

      await Ad.findByIdAndDelete(id);
      return ApiResponse.success(res, null, 'Ad deleted successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getAdUploadUrl(req, res, next) {
    try {
      const { fileName, fileType } = req.body;
      const ext = fileName.split('.').pop();
      const { uploadUrl, fileUrl } = await generateUploadUrl(fileType, ext, 'ads');
      return ApiResponse.success(res, { uploadUrl, fileUrl }, 'Upload URL generated');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdController;
