import React from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ReturnLogsProps {
  logs: any[];
}

export default function ReturnLogs({ logs }: ReturnLogsProps) {
  const { t } = useTranslation();

  const getActionLabels = (t: any): Record<string, string> => ({
    CREATE: t('return.logCreate'),
    SHIPPED: t('return.logShipped'),
    RECEIVE: t('return.logReceive'),
    QUALIFY: t('return.logQualify'),
    REJECT: t('return.logReject'),
    STOCK_IN: t('return.logStockIn'),
    REFUND: t('return.logRefund'),
    CANCEL: t('return.logCancel'),
  });

  const ACTION_LABELS = getActionLabels(t);

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-800">{t('return.operationLog')}</h3>
      </div>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {logs?.map((log: any) => (
          <div key={log.id} className="flex gap-3">
            <div className="w-16 text-xs text-gray-400 flex-shrink-0 pt-1">
              {new Date(log.createdAt).toLocaleDateString()}
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-700 text-sm">{ACTION_LABELS[log.action] || log.action}</div>
              <div className="text-xs text-gray-500 mt-0.5">{log.remark}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
