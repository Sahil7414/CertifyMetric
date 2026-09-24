import React, { useEffect } from 'react';
import { getFileUrl } from '../api';

export default function DocumentPreviewModal({
  isOpen,
  file: fileProp,
  document: docProp,
  onClose
}) {
  const targetFile = fileProp || docProp;
  const showModal = isOpen !== undefined ? isOpen : Boolean(targetFile);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    if (showModal) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'auto';
      };
    }
  }, [showModal, onClose]);

  if (!showModal || !targetFile) return null;
  const file = targetFile;

  const fileName = file.file_name || file.name || 'Document File';
  const rawPath = file.file_path || file.path || file.url || `/api/documents/preview/${encodeURIComponent(fileName)}`;
  const fileUrl = getFileUrl(rawPath);
  const category = file.category || file.type || 'Statutory Attachment';
  const uploader = file.uploaded_by || file.uploader || 'Authorized System User';
  const dateStr = file.created_at || file.uploaded_at ? new Date(file.created_at || file.uploaded_at).toLocaleString() : null;

  const isImage = (file.file_type && file.file_type.startsWith('image/')) ||
                  /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName || rawPath);

  const isPdf = (file.file_type === 'application/pdf') ||
                /\.(pdf)$/i.test(fileName || rawPath) ||
                (!isImage);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
      />

      {/* Main Preview Container */}
      <div className="relative z-50 w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="bg-[#002046] text-white px-6 py-4 flex items-center justify-between shrink-0 border-b border-[#001733]">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 shrink-0">
              <span className="material-symbols-outlined text-xl">
                {isImage ? 'photo' : 'picture_as_pdf'}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-white truncate" title={fileName}>
                {fileName}
              </h3>
              <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-300 mt-0.5">
                <span className="px-2 py-0.2 rounded bg-amber-400/20 text-amber-300 font-semibold uppercase text-[9.5px]">
                  {category}
                </span>
                <span>•</span>
                <span>Uploaded by: <strong className="text-white">{uploader}</strong></span>
                {dateStr && (
                  <>
                    <span>•</span>
                    <span>{dateStr}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {fileUrl && (
              <>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg text-xs transition-all inline-flex items-center gap-1.5"
                  title="Open in new window"
                >
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                  <span className="hidden sm:inline">Open</span>
                </a>
                <a
                  href={fileUrl}
                  download={fileName}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg text-xs transition-all inline-flex items-center gap-1.5"
                  title="Download file"
                >
                  <span className="material-symbols-outlined text-base">download</span>
                  <span className="hidden sm:inline">Download</span>
                </a>
              </>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close preview (ESC)"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Content Body with Internal Scrollbar */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/5 min-h-[300px] flex items-center justify-center">
          {isImage && fileUrl ? (
            <div className="max-w-full max-h-[70vh] flex items-center justify-center overflow-auto rounded-xl bg-slate-900/10 p-2 shadow-inner">
              <img
                src={fileUrl}
                alt={fileName}
                className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-md"
              />
            </div>
          ) : isPdf && fileUrl ? (
            <iframe
              src={fileUrl}
              title={fileName}
              className="w-full h-[70vh] rounded-xl border border-slate-300 bg-white shadow-sm"
            />
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-3xl">description</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{fileName}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Preview is not directly embeddable for this file format ({file.file_type || 'binary document'}).
                </p>
              </div>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-container shadow-xs inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">open_in_new</span>
                  Open File in New Tab
                </a>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span className="text-[11px]">Statutory Document Evidence • Secured Verification Record</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
