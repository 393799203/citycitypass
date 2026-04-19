import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { PurchaseOrder } from '../../types/purchase';

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: '待确认', color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { label: '已确认', color: 'bg-blue-100 text-blue-700' },
  PARTIAL: { label: '部分到货', color: 'bg-orange-100 text-orange-700' },
  ARRIVED: { label: '已到货', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: '已取消', color: 'bg-gray-100 text-gray-500' },
};

interface PurchaseOrderListProps {
  orders: PurchaseOrder[];
  loading: boolean;
  listKeyword: string;
  filterStatus: string;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (order: PurchaseOrder) => void;
  onPurchaseInbound: (order: PurchaseOrder) => void;
  canWrite?: boolean;
}

export default function PurchaseOrderList({
  orders,
  loading,
  listKeyword,
  filterStatus,
  page,
  totalPages,
  onPageChange,
  onConfirm,
  onCancel,
  onDelete,
  onEdit,
  onPurchaseInbound,
  canWrite = false,
}: PurchaseOrderListProps) {
  const navigate = useNavigate();

  const filteredOrders = orders.filter(order =>
    order.orderNo.toLowerCase().includes(listKeyword.toLowerCase()) ||
    order.supplier?.name?.toLowerCase().includes(listKeyword.toLowerCase())
  );

  return (
    <div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr className="text-center">
              <th className="px-4 py-3 text-base font-medium text-gray-500">采购单号</th>
              <th className="px-4 py-3 text-base font-medium text-gray-500">供应商</th>
              <th className="px-4 py-3 text-base font-medium text-gray-500">SKU数</th>
              <th className="px-4 py-3 text-base font-medium text-gray-500">总金额</th>
              <th className="px-4 py-3 text-base font-medium text-gray-500">下单日期</th>
              <th className="px-4 py-3 text-base font-medium text-gray-500">期望到货</th>
              <th className="px-4 py-3 text-base font-medium text-gray-500">状态</th>
              <th className="px-4 py-3 text-base font-medium text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  暂无采购记录
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-base font-mono text-center">
                    <button
                      onClick={() => navigate(`/purchases/${order.id}`)}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {order.orderNo}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-base text-center">{order.supplier?.name}</td>
                  <td className="px-4 py-3 text-base text-center">{order.items?.length || 0}</td>
                  <td className="px-4 py-3 text-base text-center">¥{order.totalAmount || 0}</td>
                  <td className="px-4 py-3 text-base text-center">{format(new Date(order.orderDate), 'yyyy-MM-dd')}</td>
                  <td className="px-4 py-3 text-base text-center">{order.expectedDate ? format(new Date(order.expectedDate), 'yyyy-MM-dd') : '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${STATUS_MAP[order.status]?.color}`}>
                      {STATUS_MAP[order.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {order.status === 'PENDING' && canWrite && (
                        <>
                          <button
                            onClick={() => onEdit(order)}
                            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => onConfirm(order.id)}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            确认
                          </button>
                          <button
                            onClick={() => onDelete(order.id)}
                            className="px-2 py-1 text-xs text-red-600 hover:underline"
                          >
                            删除
                          </button>
                        </>
                      )}
                      {order.status === 'CONFIRMED' && canWrite && (
                        <>
                          {order.inboundOrders?.find((io: any) => io.status !== 'CANCELLED') ? (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                              已关联入库单
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => onPurchaseInbound(order)}
                                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                采购入库
                              </button>
                              <button
                                onClick={() => onCancel(order.id)}
                                className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                              >
                                取消
                              </button>
                            </>
                          )}
                        </>
                      )}
                      {(order.status === 'PARTIAL' || order.status === 'ARRIVED') && order.inboundOrders?.find((io: any) => io.status !== 'CANCELLED') && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                          已关联入库单
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-gray-500">
            第 {page} / {totalPages} 页
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
