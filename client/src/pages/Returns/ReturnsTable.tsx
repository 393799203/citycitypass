import React from 'react';
import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { ReturnOrder } from '../../types/returns';
import { formatPhone } from '../../utils/format';

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  RETURN_REQUESTED: { label: '待发货', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  RETURN_SHIPPED: { label: '已发货', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  RETURN_RECEIVING: { label: '收货中', color: 'text-purple-600', bgColor: 'bg-purple-50' },
  RETURN_QUALIFIED: { label: '已验收(全合格)', color: 'text-green-600', bgColor: 'bg-green-50' },
  RETURN_PARTIAL_QUALIFIED: { label: '已验收(部分)', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  RETURN_REJECTED: { label: '已拒收', color: 'text-red-600', bgColor: 'bg-red-50' },
  RETURN_STOCK_IN: { label: '已入库', color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
  REFUNDED: { label: '已退款', color: 'text-pink-600', bgColor: 'bg-pink-50' },
  CANCELLED: { label: '已取消', color: 'text-gray-600', bgColor: 'bg-gray-50' },
};

interface ReturnsTableProps {
  returns: ReturnOrder[];
  onOpenTrackingModal: (ret: ReturnOrder) => void;
  onReceive: (ret: ReturnOrder) => void;
  onOpenQualifyModal: (ret: ReturnOrder) => void;
  onOpenStockInModal: (ret: ReturnOrder) => void;
  onOpenRefundModal: (ret: ReturnOrder) => void;
}

export default function ReturnsTable({
  returns,
  onOpenTrackingModal,
  onReceive,
  onOpenQualifyModal,
  onOpenStockInModal,
  onOpenRefundModal
}: ReturnsTableProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr className="text-center">
            <th className="px-6 py-3 text-sm font-medium text-gray-600">退货单/原订单</th>
            <th className="px-6 py-3 text-sm font-medium text-gray-600">退货人</th>
            <th className="px-6 py-3 text-sm font-medium text-gray-600">仓库</th>
            <th className="px-6 py-3 text-sm font-medium text-gray-600">商品数</th>
            <th className="px-6 py-3 text-sm font-medium text-gray-600">金额</th>
            <th className="px-6 py-3 text-sm font-medium text-gray-600">状态</th>
            <th className="px-6 py-3 text-sm font-medium text-gray-600">退货原因</th>
            <th className="px-6 py-3 text-sm font-medium text-gray-600">时间</th>
            <th className="px-6 py-3 text-sm font-medium text-gray-600">操作</th>
          </tr>
        </thead>
        <tbody>
          {returns.map(ret => (
            <tr key={ret.id} className="border-t hover:bg-gray-50">
              <td className="px-6 py-4 text-base text-center">
                <Link to={`/returns/${ret.id}`} className="text-primary-600 hover:underline font-medium">
                  {ret.returnNo}
                </Link>
                <div className="flex items-center justify-center gap-1 text-gray-400 text-sm mt-0.5">
                  <span className="text-xs">订单:</span>
                  <Link to={`/orders/${ret.orderId}`} className="text-gray-500 hover:underline">{ret.order?.orderNo}</Link>
                </div>
              </td>
              <td className="px-6 py-4 text-base text-center">
                <div>{ret.receiverName}</div>
                <div className="flex items-center justify-center gap-1 text-gray-400 text-sm mt-0.5">
                  <Phone className="w-4 h-4" />
                  {formatPhone(ret.receiverPhone || '')}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-base text-center">{ret.warehouse?.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-base">{ret.items?.reduce((sum: number, item) => sum + item.quantity, 0)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-base text-primary-600 font-medium">¥{Number(ret.order?.totalAmount || 0).toLocaleString()}</td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className={`px-2 py-1 text-sm rounded-full ${STATUS_CONFIG[ret.status]?.bgColor} ${STATUS_CONFIG[ret.status]?.color}`}>
                  {STATUS_CONFIG[ret.status]?.label}
                </span>
              </td>
              <td className="px-6 py-4 text-base text-gray-600 max-w-xs truncate text-center">{ret.reason}</td>
              <td className="px-6 py-4 whitespace-nowrap text-base text-gray-500 text-center">{new Date(ret.createdAt).toLocaleString()}</td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <div className="flex flex-col gap-1 items-center">
                  {ret.status === 'RETURN_REQUESTED' && (
                    <button
                      onClick={() => onOpenTrackingModal(ret)}
                      className="px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded"
                    >
                      填写快递
                    </button>
                  )}
                  {ret.status === 'RETURN_SHIPPED' && (
                    <button
                      onClick={() => onReceive(ret)}
                      className="px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded"
                    >
                      确认收货
                    </button>
                  )}
                  {ret.status === 'RETURN_RECEIVING' && (
                    <button
                      onClick={() => onOpenQualifyModal(ret)}
                      className="px-2 py-1 text-xs text-white bg-green-600 hover:bg-green-700 rounded"
                    >
                      验收确认
                    </button>
                  )}
                  {(ret.status === 'RETURN_QUALIFIED' || ret.status === 'RETURN_PARTIAL_QUALIFIED') && (
                    <button
                      onClick={() => onOpenStockInModal(ret)}
                      className="px-2 py-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 rounded"
                    >
                      退货入库
                    </button>
                  )}
                  {['RETURN_STOCK_IN', 'RETURN_REJECTED'].includes(ret.status) && ret.refundStatus !== 'COMPLETED' && (
                    <button
                      onClick={() => onOpenRefundModal(ret)}
                      className="px-2 py-1 text-xs text-white bg-yellow-600 hover:bg-yellow-700 rounded"
                    >
                      确认退款
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {returns.length === 0 && (
            <tr>
              <td colSpan={9} className="px-6 py-8 text-center text-gray-500">暂无数据</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
