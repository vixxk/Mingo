const GiftService = require('../services/giftService');
const ApiResponse = require('../utils/apiResponse');

class GiftController {
  static async getAllGifts(req, res, next) {
    try {
      const gifts = await GiftService.getGifts();
      return ApiResponse.success(res, gifts, 'Gifts retrieved successfully');
    } catch (err) {
      next(err);
    }
  }

  static async sendGift(req, res, next) {
    try {
      const { receiverId, giftId, count } = req.body;
      const result = await GiftService.sendGift({
        senderId: req.user.id,
        receiverId,
        giftId,
        count: count || 1
      });

      // Emit socket event for real-time update
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${receiverId}`).emit('gift_received', {
          senderName: req.user.name,
          gift: result.gift
        });
        
        // Also notify sender for balance update
        io.to(`user_${req.user.id}`).emit('balance_updated', {
          coins: result.remainingCoins
        });
      }

      return ApiResponse.success(res, result, 'Gift sent successfully');
    } catch (err) {
      next(err);
    }
  }
}

module.exports = GiftController;
