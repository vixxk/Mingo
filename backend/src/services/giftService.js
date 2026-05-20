const Gift = require('../models/giftModel');
const User = require('../models/userModel');
const Listener = require('../models/listenerModel');
const Transaction = require('../models/transactionModel');
const AppError = require('../utils/appError');
const mongoose = require('mongoose');

class GiftService {
  static async getGifts() {
    return await Gift.find({ isActive: true }).sort({ price: 1 });
  }

  static async sendGift({ senderId, receiverId, giftId, count = 1 }) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const gift = await Gift.findById(giftId).session(session);
      if (!gift) throw new AppError('Gift not found', 404);

      const sender = await User.findById(senderId).session(session);
      if (!sender) throw new AppError('Sender not found', 404);

      const totalCost = gift.price * count;
      if (sender.coins < totalCost) {
        throw new AppError('Insufficient coins for this gift', 402);
      }

      // 1. Deduct coins from sender
      sender.coins -= totalCost;
      await sender.save({ session });

      // 2. Create debit transaction for sender
      await Transaction.create([{
        userId: senderId,
        type: 'gift_send',
        amount: 0,
        coins: -totalCost,
        description: `Sent gift: ${gift.name} x${count}`,
        status: 'completed',
        metadata: { giftId, receiverId, count }
      }], { session });

      // 3. Credit receiver (Listener)
      // Payout ratio: 70% of coin value converted to earnings
      const payoutAmount = (totalCost * 0.7); 
      
      const listener = await Listener.findOne({ userId: receiverId }).session(session);
      if (listener) {
        listener.earnings += payoutAmount;
        listener.todayEarnings += payoutAmount;
        await listener.save({ session });

        // 4. Create credit transaction for listener
        await Transaction.create([{
          userId: receiverId,
          type: 'gift_receive',
          amount: payoutAmount,
          coins: 0,
          description: `Received gift: ${gift.name} x${count}`,
          status: 'completed',
          metadata: { giftId, senderId, count }
        }], { session });
      }

      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        remainingCoins: sender.coins,
        gift: {
          id: gift._id,
          name: gift.name,
          icon: gift.icon,
          animation: gift.animation,
          count
        }
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  static async seedGifts() {
    await Gift.deleteMany({}); // Overwrite existing gifts to apply new prices

    const initialGifts = [
      { name: 'Heart', icon: '❤️', price: 10, originalPrice: 15, animation: 'zoom' },
      { name: 'Candy Cane', icon: '🍭', price: 50, originalPrice: 70, animation: 'floating' },
      { name: 'Candy', icon: '🍬', price: 100, originalPrice: 140, animation: 'floating' },
      { name: 'Gift Box', icon: '🎁', price: 300, originalPrice: 400, animation: 'zoom' },
      { name: 'Wrapped Gift', icon: '💝', price: 500, originalPrice: 700, animation: 'shake' },
      { name: 'Gold Coins', icon: '💰', price: 1000, originalPrice: 1400, animation: 'floating' },
    ];

    await Gift.insertMany(initialGifts);
    console.log('Gifts re-seeded successfully with varied prices');
  }
}

module.exports = GiftService;
