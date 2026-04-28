import { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { QrCode, Download, RefreshCw, Loader2, ShoppingCart } from 'lucide-react';
import api from '../api';
import { useOwnerStore } from '../stores/owner';

export default function QRCodePage() {
  const { currentOwnerId, currentOwnerName } = useOwnerStore();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateQRCode = async () => {
    if (!currentOwnerId) {
      toast.error('请先选择主体');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get('/qrcode/shopping');
      
      if (response.data.success && response.data.data.qrCode) {
        setQrCodeUrl(response.data.data.qrCode);
        toast.success('二维码生成成功');
      } else {
        throw new Error('二维码数据格式错误');
      }
    } catch (error: any) {
      console.error('生成二维码失败:', error);
      toast.error(error.response?.data?.message || '生成二维码失败');
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `购物二维码_${currentOwnerName || '未知主体'}_${new Date().toISOString().split('T')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('二维码已下载');
  };

  const printQRCode = () => {
    if (!qrCodeUrl) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('无法打开打印窗口');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>打印二维码 - ${currentOwnerName || '购物二维码'}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .container {
              text-align: center;
              padding: 20px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .subtitle {
              font-size: 16px;
              color: #666;
              margin-bottom: 20px;
            }
            .qrcode {
              width: 300px;
              height: 300px;
            }
            .footer {
              margin-top: 20px;
              font-size: 14px;
              color: #999;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="title">${currentOwnerName || '购物二维码'}</div>
            <div class="subtitle">扫码下单，便捷购物</div>
            <img src="${qrCodeUrl}" class="qrcode" alt="购物二维码" />
            <div class="footer">生成时间: ${new Date().toLocaleString()}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">二维码管理</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex flex-col items-center space-y-6">
          <div className="text-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">购物二维码</h2>
            <p className="text-sm text-gray-500">
              生成购物二维码，客户扫码即可进入购物页面下单
            </p>
          </div>

          {!currentOwnerId && (
            <div className="w-full max-w-md p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700 text-center">
                请先在顶部选择一个主体，才能生成该主体的购物二维码
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={generateQRCode}
              disabled={!currentOwnerId || loading}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-colors ${
                currentOwnerId && !loading
                  ? 'bg-primary-600 hover:bg-primary-700'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <QrCode className="w-5 h-5" />
              )}
              {loading ? '生成中...' : '生成购物二维码'}
            </button>

            {qrCodeUrl && (
              <>
                <button
                  onClick={downloadQRCode}
                  className="flex items-center gap-2 px-6 py-3 border border-primary-600 text-primary-600 rounded-lg font-medium hover:bg-primary-50 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  下载二维码
                </button>
                <button
                  onClick={printQRCode}
                  className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5" />
                  打印二维码
                </button>
              </>
            )}
          </div>

          {qrCodeUrl && (
            <div className="mt-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">{currentOwnerName || '购物二维码'}</h3>
                <p className="text-sm text-gray-500 mt-1">扫码下单，便捷购物</p>
              </div>
              <div className="flex justify-center">
                <img
                  src={qrCodeUrl}
                  alt="购物二维码"
                  className="w-64 h-64 rounded-lg shadow-md"
                />
              </div>
              <div className="text-center mt-4 text-xs text-gray-400">
                生成时间: {new Date().toLocaleString()}
              </div>
            </div>
          )}

          {!qrCodeUrl && currentOwnerId && (
            <div className="mt-8 p-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <div className="text-center">
                <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">点击上方按钮生成购物二维码</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">使用说明</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <p>选择主体后，点击"生成购物二维码"按钮</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <p>下载或打印二维码，分发给客户</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <p>客户使用微信或支付宝扫码，即可进入购物页面</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
            <p>客户在购物页面选择商品并下单，订单将自动创建</p>
          </div>
        </div>
      </div>
    </div>
  );
}
