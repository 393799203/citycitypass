import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import { paymentConfig, PaymentMethod, PaymentStatus } from '../config/payment';

export interface PaymentCreateResult {
  success: boolean;
  paymentId?: string;
  qrCodeUrl?: string;
  payUrl?: string;
  message?: string;
}

export interface PaymentNotifyResult {
  success: boolean;
  orderId?: string;
  paymentId?: string;
  amount?: number;
  message?: string;
}

export class WechatPaymentService {
  static async createPayment(orderId: string, amount: number, description: string): Promise<PaymentCreateResult> {
    try {
      const paymentId = `WX${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
      
      const qrCodeUrl = `weixin://wxpay/bizpayurl?pr=${paymentId}`;
      
      console.log(`[微信支付] 创建支付订单: ${paymentId}, 订单ID: ${orderId}, 金额: ${amount}`);
      
      return {
        success: true,
        paymentId,
        qrCodeUrl,
        message: '支付订单创建成功（模拟）',
      };
    } catch (error) {
      console.error('[微信支付] 创建支付订单失败:', error);
      return {
        success: false,
        message: '创建支付订单失败',
      };
    }
  }

  static verifySignature(params: any, signature: string): boolean {
    if (paymentConfig.wechat.sandbox) {
      console.log('[微信支付] 沙箱模式，跳过签名验证');
      return true;
    }

    try {
      const sortedKeys = Object.keys(params).sort();
      const signStr = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
      const expectedSign = CryptoJS.MD5(signStr + paymentConfig.wechat.apiKey).toString().toUpperCase();
      return signature === expectedSign;
    } catch (error) {
      console.error('[微信支付] 签名验证失败:', error);
      return false;
    }
  }

  static parseNotify(xmlData: string): PaymentNotifyResult {
    try {
      const orderIdMatch = xmlData.match(/<out_trade_no><!\[CDATA\[(.*?)\]\]><\/out_trade_no>/);
      const paymentIdMatch = xmlData.match(/<transaction_id><!\[CDATA\[(.*?)\]\]><\/transaction_id>/);
      const amountMatch = xmlData.match(/<total_fee>(\d+)<\/total_fee>/);
      const resultCodeMatch = xmlData.match(/<result_code><!\[CDATA\[(.*?)\]\]><\/result_code>/);

      if (!orderIdMatch || !paymentIdMatch) {
        return { success: false, message: '无效的回调数据' };
      }

      const orderId = orderIdMatch[1];
      const paymentId = paymentIdMatch[1];
      const amount = amountMatch ? parseInt(amountMatch[1]) / 100 : 0;
      const resultCode = resultCodeMatch ? resultCodeMatch[1] : '';

      console.log(`[微信支付] 回调解析成功: 订单ID=${orderId}, 支付ID=${paymentId}, 金额=${amount}, 结果=${resultCode}`);

      return {
        success: resultCode === 'SUCCESS',
        orderId,
        paymentId,
        amount,
        message: resultCode === 'SUCCESS' ? '支付成功' : '支付失败',
      };
    } catch (error) {
      console.error('[微信支付] 解析回调数据失败:', error);
      return { success: false, message: '解析回调数据失败' };
    }
  }

  static generateSuccessResponse(): string {
    return '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>';
  }

  static generateFailResponse(message: string): string {
    return `<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[${message}]]></return_msg></xml>`;
  }
}

export class AlipayPaymentService {
  static async createPayment(orderId: string, amount: number, subject: string): Promise<PaymentCreateResult> {
    try {
      const paymentId = `ALI${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
      
      const payUrl = `https://openapi.alipay.com/gateway.do?paymentId=${paymentId}&orderId=${orderId}`;
      
      console.log(`[支付宝] 创建支付订单: ${paymentId}, 订单ID: ${orderId}, 金额: ${amount}`);
      
      return {
        success: true,
        paymentId,
        payUrl,
        message: '支付订单创建成功（模拟）',
      };
    } catch (error) {
      console.error('[支付宝] 创建支付订单失败:', error);
      return {
        success: false,
        message: '创建支付订单失败',
      };
    }
  }

  static verifySignature(params: any): boolean {
    if (paymentConfig.alipay.sandbox) {
      console.log('[支付宝] 沙箱模式，跳过签名验证');
      return true;
    }

    try {
      const sign = params.sign;
      if (!sign) return false;

      const sortedKeys = Object.keys(params).filter(key => key !== 'sign' && key !== 'sign_type').sort();
      const signStr = sortedKeys.map(key => `${key}=${params[key]}`).join('&');
      
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(signStr);
      
      return verify.verify(paymentConfig.alipay.alipayPublicKey, sign, 'base64');
    } catch (error) {
      console.error('[支付宝] 签名验证失败:', error);
      return false;
    }
  }

  static parseNotify(params: any): PaymentNotifyResult {
    try {
      const orderId = params.out_trade_no;
      const paymentId = params.trade_no;
      const amount = parseFloat(params.total_amount || '0');
      const tradeStatus = params.trade_status;

      console.log(`[支付宝] 回调解析成功: 订单ID=${orderId}, 支付ID=${paymentId}, 金额=${amount}, 状态=${tradeStatus}`);

      return {
        success: tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED',
        orderId,
        paymentId,
        amount,
        message: tradeStatus === 'TRADE_SUCCESS' || tradeStatus === 'TRADE_FINISHED' ? '支付成功' : '支付失败',
      };
    } catch (error) {
      console.error('[支付宝] 解析回调数据失败:', error);
      return { success: false, message: '解析回调数据失败' };
    }
  }

  static generateSuccessResponse(): string {
    return 'success';
  }

  static generateFailResponse(): string {
    return 'fail';
  }
}

export class MockPaymentService {
  static async createPayment(orderId: string, amount: number, method: PaymentMethod): Promise<PaymentCreateResult> {
    const paymentId = `MOCK${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[模拟支付] 创建支付订单: ${paymentId}, 订单ID: ${orderId}, 金额: ${amount}, 方式: ${method}`);
    
    return {
      success: true,
      paymentId,
      qrCodeUrl: `mock://payment/${paymentId}`,
      payUrl: `http://localhost:3001/mock-payment?paymentId=${paymentId}&amount=${amount}`,
      message: '模拟支付订单创建成功',
    };
  }

  static async simulatePayment(paymentId: string, success: boolean = true): Promise<{ success: boolean; message: string }> {
    console.log(`[模拟支付] 模拟支付: ${paymentId}, 结果: ${success ? '成功' : '失败'}`);
    return {
      success,
      message: success ? '支付成功' : '支付失败',
    };
  }
}
