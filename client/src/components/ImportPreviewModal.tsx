import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { aiApi } from '../api/ai';
import { toast } from 'react-toastify';

interface OrderItem {
  '商品名称': string;
  '包装': string;
  '规格': string;
  '数量': string;
  '单价': string;
  '小计': string;
}

interface OrderData {
  orderNo: string;
  '订单编号'?: string;
  '主体'?: string;
  '客户名称'?: string;
  '折扣'?: string;
  '收货人'?: string;
  '手机号'?: string;
  '省份'?: string;
  '城市'?: string;
  '收货地址'?: string;
  '总金额'?: string;
  '状态'?: string;
  '下单时间'?: string;
  items: OrderItem[];
  _status?: 'valid' | 'invalid' | 'fixed';
  _errors?: string[];
  _fixed?: boolean;
}

interface ImportPreviewModalProps {
  fileData: { orderNo: string; rows: any[] }[];
  owners: { id: string; name: string }[];
  warehouses: { id: string; name: string }[];
  customers?: { id: string; name: string; type?: string }[];
  onConfirm: (data: { orderNo?: string; rows: any[] }[]) => void;
  onCancel: () => void;
}

export default function ImportPreviewModal({
  fileData,
  owners,
  warehouses,
  customers = [],
  onConfirm,
  onCancel
}: ImportPreviewModalProps) {
  const [validating, setValidating] = useState(false);
  const [aiFixing, setAiFixing] = useState(false);
  const [aiFixingIdx, setAiFixingIdx] = useState<number | null>(null);
  const [data, setData] = useState<OrderData[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set([0]));

  useEffect(() => {
    validateData();
  }, []);

  const fixWithAI = async (orderIdx: number) => {
    setAiFixing(true);
    setAiFixingIdx(orderIdx);
    const originalData = fileData[orderIdx];

    try {
      const rawRows = originalData.rows.map((r, idx) => `第${idx + 1}行原始数据: ${JSON.stringify(r, null, 2)}`).join('\n');

      const prompt = `你是订单数据处理助手。Excel导入的原始数据可能有字段名不统一、格式不规范等问题。请分析以下原始数据，找出对应的字段并规范化。

需要的标准字段：
- 订单编号
- 主体
- 收货人
- 手机号（可能叫：电话、手机、联系电话等）
- 省份
- 城市
- 收货地址（可能叫：地址、地址信息等）
- 商品名称（可能叫：商品、品名、货物等）
- 包装（可能叫：包装方式、包装规格等）
- 规格（可能叫：规格、容量、ml等）
- 数量
- 单价

原始Excel数据：
${rawRows}

请根据原始数据内容智能匹配字段，返回规范化后的JSON：
{
  "主体": "主体名称",
  "收货人": "收货人姓名",
  "手机号": "手机号",
  "省份": "省份",
  "城市": "城市",
  "收货地址": "详细地址",
  "rows": [
    {
      "商品名称": "商品名称",
      "包装": "包装",
      "规格": "规格",
      "数量": 数量,
      "单价": 单价
    }
  ]
}`;

      const result = await aiApi.callAI(prompt);
      console.log('AI 原始输出:', result);
      const jsonMatch = result.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        console.log('AI JSON 解析内容:', jsonMatch[0]);
        const fixed = JSON.parse(jsonMatch[0]);
        console.log('AI 解析后数据:', JSON.stringify(fixed, null, 2));
        const updated = [...data];
        const currentOrder = updated[orderIdx];

        currentOrder['主体'] = fixed['主体'] || currentOrder['主体'];
        currentOrder['收货人'] = fixed['收货人'] || currentOrder['收货人'];
        currentOrder['手机号'] = fixed['手机号'] || currentOrder['手机号'];
        currentOrder['省份'] = fixed['省份'] || currentOrder['省份'];
        currentOrder['城市'] = fixed['城市'] || currentOrder['城市'];
        currentOrder['收货地址'] = fixed['收货地址'] || currentOrder['收货地址'];

        if (fixed.rows && Array.isArray(fixed.rows)) {
          currentOrder.items = fixed.rows.map((r: any) => ({
            '商品名称': r['商品名称'] || '',
            '包装': r['包装'] || '',
            '规格': r['规格'] || '',
            '数量': String(r['数量'] || ''),
            '单价': String(r['单价'] || ''),
            '小计': '',
          }));
        }

        const errors: string[] = [];
        if (!currentOrder['主体']) {
          errors.push('缺少主体');
        } else if (!owners.find(o => o.name === currentOrder['主体'])) {
          errors.push(`主体"${currentOrder['主体']}"不存在`);
        }
        if (!currentOrder['收货人']) errors.push('缺少收货人');
        if (!currentOrder['手机号']) errors.push('缺少手机号');
        if (!currentOrder['收货地址']) errors.push('缺少收货地址');
        if (!currentOrder.items.some(i => i['商品名称'])) errors.push('缺少商品');
        if (!currentOrder.items.some(i => i['包装'])) errors.push('缺少包装');
        if (!currentOrder.items.some(i => i['规格'])) errors.push('缺少规格');

        currentOrder._errors = errors;
        currentOrder._status = errors.length === 0 ? 'valid' : 'invalid';
        currentOrder._fixed = true;

        setData(updated);
        if (errors.length === 0) {
          toast.success('AI 补全成功');
        } else {
          toast.warning('AI 已补全，但仍有错误需要处理');
        }
      }
    } catch (error: any) {
      toast.error('AI 补全失败: ' + (error.message || '未知错误'));
    }

    setAiFixing(false);
    setAiFixingIdx(null);
  };

  const validateData = () => {
    setValidating(true);
    const validated: OrderData[] = fileData
      .filter((item) => {
        const row = item.rows[0];
        const statusText = row['状态'];
        const statusMap: Record<string, string> = {
          '待拣货': 'PENDING',
          '拣货中': 'PICKING',
          '出库审核中': 'OUTBOUND_REVIEW',
          '运力调度': 'DISPATCHING',
          '已调度': 'DISPATCHED',
          '运输中': 'IN_TRANSIT',
          '已送达': 'DELIVERED',
          '已完成': 'COMPLETED',
          '退货中': 'RETURNING',
          '已取消': 'CANCELLED',
        };
        const mappedStatus = statusText ? statusMap[statusText] : null;
        if (mappedStatus && mappedStatus !== 'PENDING') {
          return false;
        }
        return true;
      })
      .map((item) => {
        const row = item.rows[0];
        const errors: string[] = [];

        if (!row['主体']) errors.push('缺少主体');
        if (!owners.find(o => o.name === row['主体'])) errors.push(`主体"${row['主体']}"不存在`);
        if (!row['收货人']) errors.push('缺少收货人');
        if (!row['手机号']) errors.push('缺少手机号');
        if (!row['收货地址']) errors.push('缺少收货地址');
        if (!item.rows.some((r: any) => r['商品名称'])) errors.push('缺少商品');
        if (!item.rows.some((r: any) => r['包装'])) errors.push('缺少包装');
        if (!item.rows.some((r: any) => r['规格'])) errors.push('缺少规格');

        const items: OrderItem[] = item.rows.map(r => ({
          '商品名称': r['商品名称'] || '',
          '包装': r['包装'] || '',
          '规格': r['规格'] || '',
          '数量': r['数量'] || '',
          '单价': r['单价'] || '',
          '小计': r['小计'] || '',
        }));

        return {
          orderNo: item.orderNo,
          '订单编号': row['订单编号'],
          '主体': row['主体'],
          '客户名称': row['客户名称'],
          '折扣': row['折扣'],
          '收货人': row['收货人'],
          '手机号': row['手机号'],
          '省份': row['省份'],
          '城市': row['城市'],
          '收货地址': row['收货地址'],
          '总金额': row['总金额'],
          '状态': row['状态'],
          '下单时间': row['下单时间'],
          items,
          _status: errors.length === 0 ? 'valid' as const : 'invalid' as const,
          _errors: errors,
        };
      });
    setData(validated);
    setValidating(false);
  };

  const toggleExpand = (idx: number) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(idx)) {
      newExpanded.delete(idx);
    } else {
      newExpanded.add(idx);
    }
    setExpandedOrders(newExpanded);
  };

  const validCount = data.filter(d => d._status === 'valid').length;
  const invalidCount = data.filter(d => d._status === 'invalid').length;

  const handleConfirm = () => {
    const validOrders = data
      .filter(d => d._status === 'valid' && d.orderNo)
      .map(d => {
        const customerName = d['客户名称'];
        const customer = customers.find(c => c.name === customerName);
        return {
          orderNo: d.orderNo,
          '主体': d['主体'],
          '客户名称': d['客户名称'],
          '客户Id': customer?.id,
          '折扣': d['折扣'],
          '收货人': d['收货人'],
          '手机号': d['手机号'],
          '省份': d['省份'],
          '城市': d['城市'],
          '收货地址': d['收货地址'],
          '状态': d['状态'],
          rows: d.items.map(item => ({
            '商品名称': item['商品名称'],
            '包装': item['包装'],
            '规格': item['规格'],
            '数量': item['数量'],
            '单价': item['单价'],
          })),
        };
      });
    onConfirm(validOrders);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">导入数据预览</h2>
            <p className="text-sm text-gray-500">
              共 {data.length} 条订单 · <span className="text-green-600">{validCount} 条有效</span> · <span className="text-red-500">{invalidCount} 条需处理</span>
            </p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {validating ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              <span className="ml-3 text-gray-600">正在验证数据...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((order, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg overflow-hidden ${
                    order._status === 'valid' ? 'border-green-200 bg-green-50/50' :
                    order._status === 'fixed' ? 'border-blue-200 bg-blue-50/50' :
                    'border-red-200 bg-red-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => toggleExpand(idx)}>
                    <div className="flex items-center gap-3">
                      {order._status === 'valid' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      )}
                      <div>
                        <span className="font-medium">{order['订单编号'] || order.orderNo}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {order['主体']} → {order['收货人']} {order['手机号'] ? `(${order['手机号']})` : ''}
                      </span>
                      <span className="text-sm text-orange-600">
                        {order.items.length}种商品
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {order._status !== 'valid' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            fixWithAI(idx);
                          }}
                          disabled={aiFixing}
                          className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200 disabled:opacity-50"
                        >
                          {aiFixing && aiFixingIdx === idx ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          AI 补全
                        </button>
                      )}
                      {expandedOrders.has(idx) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {expandedOrders.has(idx) && (
                    <div className="border-t p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">订单信息</h4>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">订单编号:</span>
                              <span className="text-gray-800 font-medium">{order['订单编号'] || order.orderNo || '-'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">主体:</span>
                              {order._errors?.some(e => e.includes('主体')) ? (
                                <select
                                  value={order['主体'] || ''}
                                  onChange={(e) => {
                                    const updated = [...data];
                                    const newOwner = e.target.value;
                                    updated[idx]['主体'] = newOwner;
                                    updated[idx]._errors = updated[idx]._errors?.filter(err => {
                                      if (newOwner && owners.find(o => o.name === newOwner)) {
                                        return !err.includes('主体');
                                      }
                                      if (err.includes('缺少主体')) {
                                        return !newOwner;
                                      }
                                      return true;
                                    });
                                    updated[idx]._status = updated[idx]._errors?.length === 0 ? 'valid' : 'invalid';
                                    setData(updated);
                                  }}
                                  className="border rounded px-2 py-1 text-sm"
                                >
                                  <option value="">选择主体</option>
                                  {owners.map(o => (
                                    <option key={o.id} value={o.name}>{o.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className={order._errors?.includes('缺少主体') ? 'text-red-500' : 'text-gray-800'}>
                                  {order['主体'] || '未填写'}
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">状态:</span>
                              <span className="text-gray-800">{order['状态'] || '-'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">收货信息</h4>
                          <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-500">收货人:</span>
                              <span className={order._errors?.includes('缺少收货人') ? 'text-red-500' : 'text-gray-800'}>
                                {order['收货人'] || '未填写'}
                                {order['客户名称'] && ` (${order['客户名称']}${order['折扣'] ? `, ${order['折扣']}` : ''})`}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">手机号:</span>
                              <span className={order._errors?.includes('缺少手机号') ? 'text-red-500' : 'text-gray-800'}>
                                {order['手机号'] || '未填写'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">省份/城市:</span>
                              <span className="text-gray-800">{order['省份'] || '-'}/{order['城市'] || '-'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-500">收货地址:</span>
                              <span className="text-gray-800 truncate max-w-[150px]">{order['收货地址'] || '未填写'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">商品信息 ({order.items.length}种)</h4>
                          <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
                            {order.items.map((item, itemIdx) => (
                              <div key={itemIdx} className="flex justify-between items-center border-b border-gray-100 pb-1">
                                <span className="text-gray-800 truncate max-w-[120px]">{item['商品名称']}</span>
                                <span className="text-gray-500 text-xs">{item['包装']} {item['规格']}</span>
                                <span className="text-gray-800">x{item['数量']}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {order._errors && order._errors.length > 0 && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                          <strong>存在问题:</strong> {order._errors.join('; ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">
            取消
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              将导入 {validCount} 条有效订单
            </span>
            <button
              onClick={handleConfirm}
              disabled={validCount === 0}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认导入
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
