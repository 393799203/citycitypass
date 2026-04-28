const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/public';

async function testPaymentTimeout() {
  console.log('=== 支付超时测试 ===\n');
  
  console.log('1. 创建测试订单...');
  const orderRes = await axios.post(`${BASE_URL}/orders`, {
    sessionId: 'test_timeout_session',
    ownerId: '2902d3bc-bb8d-411a-8914-ad1a375033ba',
    warehouseId: 'bc4b8e07-bef4-4eda-abdf-530e41dffae0',
    receiver: '超时测试',
    phone: '13800000001',
    province: '北京市',
    city: '北京市',
    address: '测试地址',
    items: [{ skuId: 'd325401e-b2f9-4780-9324-a978a2b94ef0', quantity: 1 }]
  });
  
  const orderNo = orderRes.data.data.orderNo;
  console.log(`订单号: ${orderNo}`);
  console.log(`订单来源: ${orderRes.data.data.source}`);
  console.log(`订单状态: ${orderRes.data.data.status}`);
  
  console.log('\n2. 创建支付订单...');
  const paymentRes = await axios.post(`${BASE_URL}/payments/create`, {
    orderNo,
    paymentMethod: 'WECHAT'
  });
  
  console.log(`支付ID: ${paymentRes.data.data.paymentId}`);
  console.log(`支付超时时间: ${paymentRes.data.data.paymentTimeoutAt}`);
  
  const timeoutAt = new Date(paymentRes.data.data.paymentTimeoutAt);
  const now = new Date();
  const waitMinutes = Math.ceil((timeoutAt - now) / 60000);
  
  console.log(`\n支付超时服务已启动，每分钟检查一次超时订单。`);
  console.log(`订单将在 ${waitMinutes} 分钟后超时。`);
  console.log(`\n支付超时功能验证说明：`);
  console.log(`1. 支付超时服务在服务器启动时自动启动（每1分钟检查一次）`);
  console.log(`2. 当订单支付超时后，订单状态会变为 CANCELLED`);
  console.log(`3. 支付状态会变为 TIMEOUT`);
  console.log(`4. 锁定的库存会被释放`);
  
  console.log('\n3. 验证库存锁定...');
  const productRes = await axios.get(`${BASE_URL}/products/7edc4585-3dec-42c2-a257-9c0b8bebade3`);
  const sku = productRes.data.data.skus.find(s => s.id === 'd325401e-b2f9-4780-9324-a978a2b94ef0');
  console.log(`箱装茅台可用库存: ${sku.availableStock}`);
  
  console.log('\n=== 测试完成 ===');
  console.log(`订单号: ${orderNo}`);
  console.log(`请在 ${waitMinutes} 分钟后再次查询订单状态验证超时功能。`);
}

testPaymentTimeout().catch(console.error);
