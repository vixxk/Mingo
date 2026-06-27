const { google } = require('googleapis');

class PlayBillingService {
  /**
   * Initializes the Google APIs Publisher client
   */
  static getPublisherClient() {
    const email = process.env.GOOGLE_PLAY_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PLAY_PRIVATE_KEY 
      ? process.env.GOOGLE_PLAY_PRIVATE_KEY.replace(/\\n/g, '\n') 
      : null;

    if (!email || !privateKey) {
      throw new Error('Google Play credentials are not fully configured in environment variables');
    }

    const auth = new google.auth.JWT(
      email,
      null,
      privateKey,
      ['https://www.googleapis.com/auth/androidpublisher']
    );

    return google.androidpublisher({
      version: 'v3',
      auth
    });
  }

  /**
   * Verifies an in-app product purchase (consumable/non-consumable)
   * @param {string} productId - The ID of the product purchased (SKU)
   * @param {string} purchaseToken - The purchase token returned by the Play Store
   * @returns {Promise<object>} The purchase details from Google API
   */
  static async verifyProductPurchase(productId, purchaseToken) {
    const packageName = process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.vixxk.mingo';
    const playDeveloperApi = this.getPublisherClient();

    try {
      const response = await playDeveloperApi.purchases.products.get({
        packageName,
        productId,
        token: purchaseToken
      });

      // Google Play API response data:
      // purchaseState: 0 (Purchased), 1 (Canceled), 2 (Pending)
      // consumptionState: 0 (Yet to be consumed), 1 (Consumed)
      // acknowledgementState: 0 (Yet to be acknowledged), 1 (Acknowledged)
      return response.data;
    } catch (error) {
      console.error('Google Play purchase verification failed:', error);
      throw error;
    }
  }
}

module.exports = PlayBillingService;
