import React from 'react';
import { X, Download, ZoomIn } from 'lucide-react';
import { AttachedFile } from '../types';
import { formatFileSize } from '../lib/crypto';

interface ImageLightboxModalProps {
  file: AttachedFile | null;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  file,
  onClose,
}) => {
  if (!file) return null;

  return (
    <div
      id="image-lightbox-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150 select-none"
    >
      <div
        className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Controls */}
        <div className="w-full flex items-center justify-between py-2 text-white text-xs">
          <div className="flex items-center gap-2 truncate max-w-xs">
            <span className="font-semibold truncate">{file.name}</span>
            <span className="text-slate-400">({formatFileSize(file.size)})</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={file.dataUrl}
              download={file.name}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
              title="Unduh Gambar"
            >
              <Download className="w-4 h-4" />
              <span>Unduh</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Preview */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 flex items-center justify-center max-h-[80vh]">
          <img
            src={file.dataUrl}
            alt={file.name}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[80vh] object-contain rounded-2xl"
          />
        </div>
      </div>
    </div>
  );
};
