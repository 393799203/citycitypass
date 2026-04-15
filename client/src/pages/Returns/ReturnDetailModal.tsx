import React from 'react';
import { Link } from 'react-router-dom';
import { X, Phone, Clock, Truck, CheckCircle, Warehouse, DollarSign } from 'lucide-react';
import { ReturnOrder } from '../../types/returns';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  RETURN_REQUESTED: { label: '待发货', color: 'bg-yellow-500' },
  RETURN_SHIPPED: { label: '已发货', color: 'bg-blue-500' },
  RETURN_RECEIVING: { label: '收货中', color: 'bg-purple-500' },
  RETURN_QUALIFIED: { label: '已验收(全合格)', color: 'bg-green-500' },
  RETURN_PARTIAL_QUALIFIED: { label: '已验收(部分)', color: 'bg-orange-500' },
  RETURN_REJECTED: { label: '已拒收', color: 'bg-red-500' },
  RETURN_STOCK_IN: { label: '已入库', color: 'bg-indigo-500' },
  CANCELLED: { label: '已取消', color: 'bg-gray-500' },
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: '创建退货',
  SHIPPED: '客户发货',
  RECEIVE: '仓库收货',
  QUALIFY: '验收合格',
  REJECT: '验收拒收',
  STOCK_IN: '退货入库',
  REFUND: '退款完成',
  CANCEL: '取消',
};

interface ReturnDetailModalProps {
  isOpen: boolean;
  returnOrder: ReturnOrder | null;
  onClose: () => void;
  onReceive: () => void;
  onOpenQualifyModal: () => void;
  onOpenStockInModal: () => void;
  onOpenRefundModal: () => void;
}

export default function ReturnDetailModal({
  isOpen,
  returnOrder,
  onClose,
  onReceive,
  onOpenQualifyModal,
  onOpenStockInModal,
  onOpenRefundModal
}: ReturnDetailModalProps) {
  if (!isOpen || !returnOrder) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-bold">退货详情</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-4 gap-6">
            <div className="col-span-3 space-y-6">
              <div className="grid grid-cols-10 gap-6">
                <div className="col-span-4 flex items-center gap-3">
                  <div className="text-sm text-gray-500">退货单号</div>
                  <div className="font-medium truncate">{returnOrder.returnNo}</div>
                </div>
                <div className="col-span-4 flex items-center gap-3">
                  <div className="text-sm text-gray-500">原订单</div>
                  <Link to={`/orders/${returnOrder.orderId}`} className="font-medium text-primary-600 hover:underline truncate">
                    {returnOrder.order?.orderNo}
                  </Link>
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <div className="text-sm text-gray-500">状态</div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_CONFIG[returnOrder.status]?.color} text-white`}>
                    {STATUS_CONFIG[returnOrder.status]?.label}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className={`grid ${(returnOrder.trackingNo || returnOrder.logisticsCompany) ? 'grid-cols-3' : 'grid-cols-2'} gap-6`}>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">退货人</div>
                    <div className="flex items-center gap-2">
                      <div className="text-base">{returnOrder.receiverName}</div>
                      <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <Phone className="w-4 h-4" />
                        {returnOrder.receiverPhone}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 mt-2 mb-1">退货人地址</div>
                    <div className="text-base">{returnOrder.receiverAddress}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 mb-1">收货仓</div>
                    <div className="text-base">{returnOrder.warehouse?.name}</div>
                    <div className="text-sm text-gray-500 mt-2 mb-1">收货仓地址</div>
                    <div className="text-base">{returnOrder.warehouse?.address}</div>
                  </div>
                  {(returnOrder.trackingNo || returnOrder.logisticsCompany) && (
                    <div>
                      <div className="text-sm text-gray-500 mb-1">退货快递</div>
                        <div className="text-base">{returnOrder.logisticsCompany || '-'}</div>
                        <div className="text-sm text-gray-500 mt-2 mb-1">快递单号</div>
                        <div className="flex items-center gap-2">
                          <span className="text-base text-gray-600">{returnOrder.trackingNo || '-'}</span>
                          {returnOrder.trackingNo && returnOrder.logisticsCompany && (
                            <a
                              href={`https://www.kuaidi100.com/chaxun?com=${encodeURIComponent(returnOrder.logisticsCompany)}&nu=${returnOrder.trackingNo}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              查询
                            </a>
                          )}
                        </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500 mb-2">退货原因</div>
                <div className="text-base bg-gray-50 rounded-lg p-4">{returnOrder.reason}</div>
              </div>

              <div>
                <h3 className="text-base font-medium mb-3">退货商品</h3>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr className="text-center">
                      <th className="px-6 py-3 text-sm font-medium text-gray-600 text-center">商品</th>
                      <th className="px-6 py-3 text-sm font-medium text-gray-600 text-center">规格</th>
                      <th className="px-6 py-3 text-sm font-medium text-gray-600 text-center">批号</th>
                      <th className="px-6 py-3 text-sm font-medium text-gray-600 text-center">退货数</th>
                      <th className="px-6 py-3 text-sm font-medium text-gray-600 text-center">合格数</th>
                      <th className="px-6 py-3 text-sm font-medium text-gray-600 text-center">拒收数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnOrder.items?.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-6 py-4 text-center">
                            {item.bundleId ? (
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-purple-600 font-medium">[套装] {item.productName}</span>
                              </div>
                            ) : (
                              <span className="text-blue-600">[商品] {item.productName || item.sku?.product?.name || '-'}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-base text-gray-500 text-center">{item.packaging} · {item.spec}</td>
                          <td className="px-6 py-4 text-base text-purple-600 text-center">
                            {item.bundleId ? (item.bundleBatch?.batchNo || '-') : (item.skuBatch?.batchNo || '-')}
                          </td>
                          <td className="px-6 py-4 text-base text-center">{item.quantity}</td>
                          <td className="px-6 py-4 text-base text-green-600 text-center">{item.qualifiedQuantity}</td>
                          <td className="px-6 py-4 text-base text-red-600 text-center">{item.rejectedQuantity}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-medium">操作日志</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
                {returnOrder.logs?.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-sm">
                    <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{ACTION_LABELS[log.action] || log.action}</div>
                      {log.remark && <div className="text-gray-500 text-xs mt-0.5">{log.remark}</div>}
                      <div className="text-gray-400 text-xs mt-0.5">
                        {log.operatorName && `${log.operatorName} `}{new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t mt-6">
            {returnOrder.status === 'RETURN_SHIPPED' && (
              <button onClick={onReceive} className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2">
                <Truck className="w-4 h-4" /> 确认收到退货
              </button>
            )}
            {returnOrder.status === 'RETURN_RECEIVING' && (
              <button onClick={onOpenQualifyModal} className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> 验收确认
              </button>
            )}
            {(returnOrder.status === 'RETURN_QUALIFIED' || returnOrder.status === 'RETURN_PARTIAL_QUALIFIED') && (
              <button onClick={onOpenStockInModal} className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2">
                <Warehouse className="w-4 h-4" /> 退货入库
              </button>
            )}
            {['RETURN_STOCK_IN', 'RETURN_REJECTED'].includes(returnOrder.status) && returnOrder.refundStatus !== 'COMPLETED' && (
              <button onClick={onOpenRefundModal} className="px-4 py-2 bg-yellow-600 text-white rounded-lg flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> 确认退款
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
