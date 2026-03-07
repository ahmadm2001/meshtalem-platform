'use client';
import { useRef, useState } from 'react';
import { Upload, Link as LinkIcon, X, Loader2 } from 'lucide-react';

interface Props {
  value: string;
  onChange: (url: string) => void;
  index: number;
  required?: boolean;
  onRemove?: () => void;
  showRemove?: boolean;
}

export default function ImageUploader({ value, onChange, index, required, onRemove, showRemove }: Props) {
  const [mode, setMode] = useState<'url' | 'upload'>('url');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'meshtalem';
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'meshtalem_products';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('يرجى اختيار ملف صورة فقط');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('حجم الصورة كبير جداً (الحد الأقصى 10MB)');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'meshtalem/products');

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        // Fallback: convert to base64 if Cloudinary fails
        const reader = new FileReader();
        reader.onload = (ev) => {
          onChange(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
        return;
      }

      const data = await res.json();
      onChange(data.secure_url);
    } catch {
      // Fallback: convert to base64
      const reader = new FileReader();
      reader.onload = (ev) => {
        onChange(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      {/* Mode Toggle */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mode === 'url' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          رابط URL
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${mode === 'upload' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Upload className="w-3.5 h-3.5" />
          رفع من الجهاز
        </button>
      </div>

      {/* Input Area */}
      <div className="flex gap-2 items-center">
        {mode === 'url' ? (
          <div className="flex-1 relative">
            <input
              type="url"
              value={value.startsWith('data:') ? '' : value}
              onChange={(e) => onChange(e.target.value)}
              className={`input-field pl-9 text-sm ${required ? 'border-red-200 focus:border-red-400' : ''}`}
              placeholder={`رابط الصورة ${index + 1}${required ? ' (مطلوب)' : ' (اختياري)'}`}
              dir="ltr"
            />
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        ) : (
          <div className="flex-1">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
              id={`img-upload-${index}`}
            />
            <label
              htmlFor={`img-upload-${index}`}
              className={`flex items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl py-3 cursor-pointer transition-colors ${
                value ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-300 bg-gray-50 text-gray-500 hover:border-primary-400 hover:bg-primary-50'
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">جاري الرفع...</span>
                </>
              ) : value ? (
                <>
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">تم رفع الصورة ✓ (انقر للتغيير)</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">اختر صورة من الجهاز أو الكاميرا</span>
                </>
              )}
            </label>
          </div>
        )}

        {showRemove && (
          <button type="button" onClick={onRemove} className="p-2 text-red-400 hover:bg-red-50 rounded-lg shrink-0">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Preview */}
      {value && (
        <div className="flex items-center gap-2">
          <img
            src={value}
            alt={`صورة ${index + 1}`}
            className="h-20 w-20 object-cover rounded-lg border border-gray-200"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              حذف
            </button>
          )}
        </div>
      )}
    </div>
  );
}
