import React from 'react';
import { CheckCircle } from 'lucide-react';

interface ReturnFlowProps {
  status: string;
  items: any[];
}

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

const returnStatusFlow = [
  { key: 'RETURN_REQUESTED', label: '申请退货' },
  { key: 'RETURN_SHIPPED', label: '买家发货' },
  { key: 'RETURN_RECEIVING', label: '仓库收货' },
  { key: 'RETURN_QUALIFIED', label: '验收(全)' },
  { key: 'RETURN_PARTIAL_QUALIFIED', label: '验收(部分)' },
  { key: 'RETURN_STOCK_IN', label: '入库' },
  { key: 'REFUNDED', label: '退款完成' },
];

export default function ReturnFlow({ status, items }: ReturnFlowProps) {
  // 检查是否有商品验收不合格
  const hasRejectedItems = items?.some((item: any) => (item.rejectedQuantity || 0) > 0) || false;
  // 如果有不合格商品，即使状态是 RETURN_QUALIFIED，也显示为部分合格
  const effectiveStatus = hasRejectedItems && status === 'RETURN_QUALIFIED' ? 'RETURN_PARTIAL_QUALIFIED' : status;
  const statusConfig = STATUS_CONFIG[effectiveStatus] || { label: effectiveStatus, color: 'text-gray-600', bgColor: 'bg-gray-50' };

  const getReturnStepStatus = (stepKey: string) => {
    if (!effectiveStatus) return 'pending';
    if (effectiveStatus === 'CANCELLED') return 'cancelled';
    
    // 检查是否所有商品都合格
    const allItemsQualified = items?.every((item: any) => item.qualifiedQuantity === item.quantity) || false;
    // 检查是否有商品合格
    const hasQualifiedItems = items?.some((item: any) => item.qualifiedQuantity > 0) || false;
    
    // 特殊处理验收步骤
    if (stepKey === 'RETURN_QUALIFIED') {
      // 当所有商品都合格时，显示为 completed 或 current
      if (allItemsQualified) {
        if (effectiveStatus === 'RETURN_QUALIFIED' || effectiveStatus === 'RETURN_STOCK_IN' || effectiveStatus === 'REFUNDED') {
          return 'completed';
        } else if (effectiveStatus === 'RETURN_RECEIVING') {
          return 'current';
        } else {
          return 'pending';
        }
      } else if (effectiveStatus === 'RETURN_RECEIVING') {
        // 当状态是 RETURN_RECEIVING 时，显示为 current
        return 'current';
      } else {
        return 'pending';
      }
    }
    
    if (stepKey === 'RETURN_PARTIAL_QUALIFIED') {
      // 当有商品合格但不是所有商品都合格时，显示为 completed 或 current
      if (hasQualifiedItems && !allItemsQualified) {
        if (effectiveStatus === 'RETURN_PARTIAL_QUALIFIED' || effectiveStatus === 'RETURN_STOCK_IN' || effectiveStatus === 'REFUNDED') {
          return 'completed';
        } else if (effectiveStatus === 'RETURN_RECEIVING') {
          return 'current';
        } else {
          return 'pending';
        }
      } else if (effectiveStatus === 'RETURN_RECEIVING') {
        // 当状态是 RETURN_RECEIVING 时，显示为 current
        return 'current';
      } else {
        return 'pending';
      }
    }
    
    // 特殊处理入库步骤
    if (stepKey === 'RETURN_STOCK_IN') {
      if (effectiveStatus === 'RETURN_QUALIFIED' || effectiveStatus === 'RETURN_PARTIAL_QUALIFIED') {
        return 'current';
      } else if (effectiveStatus === 'RETURN_STOCK_IN' || effectiveStatus === 'REFUNDED') {
        return 'completed';
      } else {
        return 'pending';
      }
    }
    
    // 特殊处理退款完成步骤
    if (stepKey === 'REFUNDED') {
      if (effectiveStatus === 'REFUNDED') {
        return 'completed';
      } else if (effectiveStatus === 'RETURN_STOCK_IN') {
        return 'current';
      } else {
        return 'pending';
      }
    }
    
    // 其他步骤的处理
    const currentIndex = returnStatusFlow.findIndex(s => s.key === effectiveStatus);
    const stepIndex = returnStatusFlow.findIndex(s => s.key === stepKey);
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'completed';
    if (stepIndex === currentIndex + 1) return 'current';
    return 'pending';
  };

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-6">退货流程</h2>
      <div className="relative">
        {/* 节点 */}
        {/* 连接线 */}
        <svg className="absolute top-4 left-0 w-full h-32 pointer-events-none" viewBox="0 0 100 32">
          {/* 申请退货到买家发货 */}
          <line 
            x1="-28" y1="11" x2="-8" y2="11" 
            stroke={getReturnStepStatus('RETURN_SHIPPED') === 'completed' || getReturnStepStatus('RETURN_SHIPPED') === 'current' ? '#10B981' : '#E5E7EB'} 
            strokeWidth="0.5"
          />
          
          {/* 买家发货到仓库收货 */}
          <line 
            x1="6" y1="11" x2="26" y2="11" 
            stroke={getReturnStepStatus('RETURN_RECEIVING') === 'completed' || getReturnStepStatus('RETURN_RECEIVING') === 'current' ? '#10B981' : '#E5E7EB'} 
            strokeWidth="0.5"
          />
          
          {/* 仓库收货到验收全部 */}
          <line 
            x1="40" y1="11" x2="40" y2="0" 
            stroke={getReturnStepStatus('RETURN_QUALIFIED') === 'completed' || getReturnStepStatus('RETURN_QUALIFIED') === 'current' ? '#10B981' : '#E5E7EB'} 
            strokeWidth="0.5"
          />
          <line 
            x1="40" y1="0" x2="60" y2="0" 
            stroke={getReturnStepStatus('RETURN_QUALIFIED') === 'completed' || getReturnStepStatus('RETURN_QUALIFIED') === 'current' ? '#10B981' : '#E5E7EB'} 
            strokeWidth="0.5"
          />
          
          {/* 仓库收货到验收部分 */}
          <line 
            x1="40" y1="11" x2="40" y2="22" 
            stroke={getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'completed' || getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'current' ? '#10B981' : '#E5E7EB'} 
            strokeWidth="0.5"
          />
          <line 
            x1="40" y1="22" x2="60" y2="22" 
            stroke={getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'completed' || getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'current' ? '#10B981' : '#E5E7EB'} 
            strokeWidth="0.5"
          />
          
          {/* 验收全部到入库 */}
          <line 
            x1="74" y1="0" x2="94" y2="0" 
            stroke={(getReturnStepStatus('RETURN_QUALIFIED') === 'completed' && (getReturnStepStatus('RETURN_STOCK_IN') === 'completed' || getReturnStepStatus('RETURN_STOCK_IN') === 'current')) ? '#10B981' : '#E5E7EB'} 
            strokeWidth="0.5"
          />
          <line 
            x1="94" y1="0" x2="94" y2="11" 
            stroke={(getReturnStepStatus('RETURN_QUALIFIED') === 'completed' && (getReturnStepStatus('RETURN_STOCK_IN') === 'completed' || getReturnStepStatus('RETURN_STOCK_IN') === 'current')) ? '#10B981' : '#E5E7EB'} 
            strokeWidth="0.5"
          />
          
          {/* 验收部分到入库 */}
          <line 
            x1="74" y1="22" x2="94" y2="22" 
            stroke={(getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'completed' && (getReturnStepStatus('RETURN_STOCK_IN') === 'completed' || getReturnStepStatus('RETURN_STOCK_IN') === 'current')) ? '#10B981' : '#E5E7EB'} 
            strokeWidth="0.5"
          />
          <line 
            x1="94" y1="22" x2="94" y2="11" 
            stroke={(getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'completed' && (getReturnStepStatus('RETURN_STOCK_IN') === 'completed' || getReturnStepStatus('RETURN_STOCK_IN') === 'current')) ? '#10B981' : '#E5E7EB'} 
            strokeWidth="0.5"
          />
          
          {/* 入库到退款完成 */}
          <line 
            x1="108" y1="11" x2="128" y2="11" 
            stroke={getReturnStepStatus('REFUNDED') === 'completed' || getReturnStepStatus('REFUNDED') === 'current' ? '#10B981' : '#E5E7EB'} 
            strokeWidth="0.5"
          />
        </svg>
        
        {/* 节点 */}
        <div className="flex items-center justify-between">
          {/* 显示到仓库收货步骤 */}
          {returnStatusFlow.slice(0, 3).map((step, index) => {
            const stepStatus = getReturnStepStatus(step.key);
            return (
              <div key={step.key} className="flex flex-col items-center w-1/5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  stepStatus === 'completed' ? 'bg-green-500 text-white' :
                  stepStatus === 'current' ? 'bg-orange-500 text-white' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {stepStatus === 'completed' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : stepStatus === 'current' ? (
                    <div className="w-4 h-4 border-2 border-white rounded-full animate-pulse" />
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div className={`text-xs font-medium ${
                    stepStatus === 'completed' || stepStatus === 'current' ? 'text-gray-800' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* 显示验收步骤（垂直排列） */}
          <div className="flex flex-col items-center w-1/5">
            {/* 验收全部 */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                getReturnStepStatus('RETURN_QUALIFIED') === 'completed' ? 'bg-green-500 text-white' :
                getReturnStepStatus('RETURN_QUALIFIED') === 'current' ? 'bg-orange-500 text-white' :
                'bg-gray-100 text-gray-400'
              }`}>
                {getReturnStepStatus('RETURN_QUALIFIED') === 'completed' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : getReturnStepStatus('RETURN_QUALIFIED') === 'current' ? (
                  <div className="w-4 h-4 border-2 border-white rounded-full animate-pulse" />
                ) : (
                  <span className="text-xs font-medium">4</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <div className={`text-xs font-medium ${
                  getReturnStepStatus('RETURN_QUALIFIED') === 'completed' || getReturnStepStatus('RETURN_QUALIFIED') === 'current' ? 'text-gray-800' : 'text-gray-400'
                }`}>
                  验收(全)
                </div>
              </div>
          </div>
          
          {/* 垂直间距 */}
          <div className="h-8" />
          
          {/* 验收部分 */}
          <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'completed' ? 'bg-green-500 text-white' :
                getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'current' ? 'bg-orange-500 text-white' :
                'bg-gray-100 text-gray-400'
              }`}>
                {getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'completed' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'current' ? (
                  <div className="w-4 h-4 border-2 border-white rounded-full animate-pulse" />
                ) : (
                  <span className="text-xs font-medium">5</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <div className={`text-xs font-medium ${
                  getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'completed' || getReturnStepStatus('RETURN_PARTIAL_QUALIFIED') === 'current' ? 'text-gray-800' : 'text-gray-400'
                }`}>
                  验收(部分)
                </div>
              </div>
            </div>
          </div>
          
          {/* 显示入库和退款完成步骤 */}
          {returnStatusFlow.slice(5).map((step, index) => {
            const stepStatus = getReturnStepStatus(step.key);
            return (
              <div key={step.key} className="flex flex-col items-center w-1/5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  stepStatus === 'completed' ? 'bg-green-500 text-white' :
                  stepStatus === 'current' ? 'bg-orange-500 text-white' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {stepStatus === 'completed' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : stepStatus === 'current' ? (
                    <div className="w-4 h-4 border-2 border-white rounded-full animate-pulse" />
                  ) : (
                    <span className="text-xs font-medium">{index + 6}</span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div className={`text-xs font-medium ${
                    stepStatus === 'completed' || stepStatus === 'current' ? 'text-gray-800' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}