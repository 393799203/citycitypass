import React from 'react';
import { X, CheckCircle, FileText } from 'lucide-react';

interface DocumentPreviewProps {
  document: any;
  onConfirm: (document: any) => void;
  onCancel: () => void;
}

export default function DocumentPreview({ document, onConfirm, onCancel }: DocumentPreviewProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-gray-700">单据预览</h4>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-blue-600" />
          <h5 className="font-medium">{document.type || '订单'}</h5>
        </div>

        <div className="space-y-2 text-sm">
          {document.items?.map((item: any, index: number) => (
            <div key={index} className="flex justify-between py-2 border-b border-gray-200">
              <div>
                <div className="font-medium">{item.productName}</div>
                <div className="text-gray-500">{item.spec} / {item.packaging}</div>
              </div>
              <div className="text-right">
                <div>{item.quantity} 件</div>
                <div className="text-gray-500">¥{item.price || 0}</div>
              </div>
            </div>
          ))}

          {!document.items && (
            <div className="text-center text-gray-500 py-4">
              暂无商品信息
            </div>
          )}

          <div className="mt-4 pt-2 border-t border-gray-200">
            <div className="flex justify-between font-medium">
              <span>总金额</span>
              <span>¥{document.total || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          取消
        </button>
        <button
          onClick={() => onConfirm(document)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <CheckCircle className="w-4 h-4 inline mr-1" />
          确认创建
        </button>
      </div>
    </div>
  );
}
