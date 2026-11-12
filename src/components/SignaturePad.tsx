import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, Check, PenTool } from 'lucide-react';

interface SignaturePadProps {
  onSave: (dataUrl: string) => void;
  onCancel?: () => void;
  title?: string;
  signeeName?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  onSave,
  onCancel,
  title = 'ลงลายมือชื่อดิจิทัล',
  signeeName
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!hasDrawn) {
      // If nothing drawn, generate a text signature placeholder
      const offscreen = document.createElement('canvas');
      offscreen.width = 300;
      offscreen.height = 100;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.font = '24px Sarabun, sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.fillText(signeeName || 'ผู้ลงนามอิเล็กทรอนิกส์', 20, 55);
        onSave(offscreen.toDataURL());
      }
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xl max-w-md w-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <PenTool className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 text-sm">{title}</h4>
            {signeeName && <p className="text-xs text-slate-500">สำหรับ: {signeeName}</p>}
          </div>
        </div>
        <button
          onClick={clearCanvas}
          className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50"
        >
          <RotateCcw className="w-3 h-3" /> ล้าง
        </button>
      </div>

      <div className="relative border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 overflow-hidden touch-none mb-3">
        <canvas
          ref={canvasRef}
          className="w-full h-36 block cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs select-none">
            ใช้นิ้วหรือปากกาเพื่อลงชื่อตรงนี้
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            ยกเลิก
          </button>
        )}
        <button
          onClick={handleSave}
          className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 shadow-sm transition"
        >
          <Check className="w-3.5 h-3.5" /> ยืนยันลายเซ็น
        </button>
      </div>
    </div>
  );
};
