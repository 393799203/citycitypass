import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Camera, FileText } from 'lucide-react';

interface ImageUploaderProps {
  onUpload: (imageUrl: string) => void;
  onCancel: () => void;
}

export default function ImageUploader({ onUpload, onCancel }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    if (preview) {
      setLoading(true);
      // 模拟上传过程
      setTimeout(() => {
        onUpload(preview);
        setLoading(false);
      }, 1000);
    }
  };

  const handleCameraCapture = () => {
    // 模拟摄像头捕获
    const cameraImage = 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=product%20barcode%20label%20for%20茅台酒&image_size=square';
    setPreview(cameraImage);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-gray-700">上传图片</h4>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 预览区域 */}
      {preview ? (
        <div className="border border-gray-200 rounded-lg p-2 flex flex-col items-center">
          <img
            src={preview}
            alt="Preview"
            className="max-h-40 object-contain"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleUpload}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-3 h-3" />
              )}
              确认上传
            </button>
            <button
              onClick={() => setPreview(null)}
              className="px-3 py-1 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              重新选择
            </button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 px-6 py-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ImageIcon className="w-8 h-8 text-gray-400" />
              <span className="text-gray-600">选择图片</span>
            </button>
            <div className="text-center text-sm text-gray-500">
              支持 JPG、PNG、PDF 格式
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
