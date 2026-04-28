export const paymentConfig = {
  wechat: {
    appId: process.env.WECHAT_APP_ID || 'wx_mock_app_id',
    mchId: process.env.WECHAT_MCH_ID || 'mock_mch_id',
    apiKey: process.env.WECHAT_API_KEY || 'mock_api_key_32_characters_long',
    notifyUrl: process.env.WECHAT_NOTIFY_URL || 'http://localhost:3001/api/public/payments/wechat/notify',
    sandbox: process.env.WECHAT_SANDBOX === 'true' || true,
  },
  alipay: {
    appId: process.env.ALIPAY_APP_ID || 'mock_alipay_app_id',
    privateKey: process.env.ALIPAY_PRIVATE_KEY || 'mock_private_key',
    alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY || 'mock_public_key',
    notifyUrl: process.env.ALIPAY_NOTIFY_URL || 'http://localhost:3001/api/public/payments/alipay/notify',
    sandbox: process.env.ALIPAY_SANDBOX === 'true' || true,
  },
  paymentTimeout: parseInt(process.env.PAYMENT_TIMEOUT || '30'),
};

export enum PaymentMethod {
  WECHAT = 'WECHAT',
  ALIPAY = 'ALIPAY',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',
}
