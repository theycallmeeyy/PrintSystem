import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  Eye, FileText, ZoomIn, ZoomOut, RotateCw, Edit3, Check, Type, Plus, ChevronLeft, ChevronRight, Trash2
} from 'lucide-react';

const LEGACY_PAGE_BREAK = '\n\n[Page Break]\n\n';

function getDocumentPages(formatting) {
  if (Array.isArray(formatting.customDocumentPages)) {
    return formatting.customDocumentPages.length ? formatting.customDocumentPages : [''];
  }
  return formatting.customDocumentText
    ? formatting.customDocumentText.split(LEGACY_PAGE_BREAK)
    : [''];
}

export default function DocumentPreview({
  file,
  files = [],
  formatting = {},
  job = {},
  onTextChange,
  onPageCountChange,
  className = ''
}) {
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState('raw');
  const [activeSide, setActiveSide] = useState('front'); // 'front' | 'back'
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [localFileUrl, setLocalFileUrl] = useState('');
  const [isLoadingDocx, setIsLoadingDocx] = useState(false);
  const [docxPreviewError, setDocxPreviewError] = useState('');

  const customPages = getDocumentPages(formatting);
  const customPagesKey = JSON.stringify(customPages);
  const pageCount = Math.max(1, Number(job.pagesPerCopy) || 1, customPages.length);
  const editableRef = useRef(null);
  const documentTextRef = useRef('');
  const customPagesRef = useRef(customPages);
  const docxPreviewRef = useRef(null);
  const availableFiles = files.length > 0 ? files : (file ? [file] : []);
  const selectedFile = availableFiles[activeFileIndex] || availableFiles[0] || null;
  const selectedFileExtension = selectedFile?.originalName?.split('.').pop()?.toLowerCase();
  const isImageFile = selectedFile && (
    selectedFile.mimetype?.startsWith('image/') ||
    /\.(jpg|jpeg|png|webp|svg|gif)$/i.test(selectedFile.originalName || '')
  );
  const isPdfFile = selectedFile && (
    selectedFile.mimetype === 'application/pdf' || selectedFileExtension === 'pdf'
  );
  const isDocxFile = selectedFile && selectedFileExtension === 'docx';
  const fileUrl = selectedFile?.url || localFileUrl;

  useEffect(() => {
    setActiveFileIndex(index => Math.min(index, Math.max(availableFiles.length - 1, 0)));
  }, [availableFiles.length]);

  useEffect(() => {
    if (!(selectedFile instanceof File)) {
      setLocalFileUrl('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setLocalFileUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  useEffect(() => {
    setActivePage(current => Math.min(current, pageCount - 1));
  }, [pageCount]);

  useEffect(() => {
    customPagesRef.current = customPages;
  }, [customPagesKey]);

  useLayoutEffect(() => {
    const pageText = customPagesRef.current[activePage] || '';
    documentTextRef.current = pageText;
    if (editableRef.current) {
      editableRef.current.innerText = pageText;
    }
  }, [activePage]);

  useEffect(() => {
    if (!isDocxFile || viewMode !== 'raw' || !fileUrl || !docxPreviewRef.current) {
      setIsLoadingDocx(false);
      setDocxPreviewError('');
      return undefined;
    }

    const controller = new AbortController();
    const container = docxPreviewRef.current;
    container.replaceChildren();
    setIsLoadingDocx(true);
    setDocxPreviewError('');

    async function renderDocxPreview() {
      try {
        const response = await fetch(fileUrl, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Could not load the Word document (${response.status}).`);
        }
        const documentData = await response.arrayBuffer();
        if (!controller.signal.aborted) {
          const { renderAsync } = await import('docx-preview');
          await renderAsync(documentData, container, container, {
            breakPages: true,
            ignoreWidth: false,
            ignoreHeight: false
          });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setDocxPreviewError(error.message || 'Could not preview this Word document.');
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingDocx(false);
      }
    }

    renderDocxPreview();
    return () => controller.abort();
  }, [fileUrl, isDocxFile, viewMode]);

  const {
    fontFamily = 'Arial',
    fontSize = '11pt',
    fontStyle = 'regular',
    margins = { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0, unit: 'in' },
    orientation = 'portrait',
    columns = 1,
    alignment = 'left',
    lineSpacing = 1.15
  } = formatting;

  const isLandscape = orientation === 'landscape';

  const getAspectRatioStyle = () => {
    const size = job.paperSizeId || 'A4';
    let ratio = '1 / 1.414'; // A4 portrait

    if (size === 'Letter') {
      ratio = isLandscape ? '1.294 / 1' : '1 / 1.294';
    } else if (size === 'Legal') {
      ratio = isLandscape ? '1.647 / 1' : '1 / 1.647';
    } else if (size === 'Custom' && job.customDimensions) {
      const w = parseFloat(job.customDimensions.width) || 8.5;
      const h = parseFloat(job.customDimensions.height) || 11;
      ratio = isLandscape ? `${Math.max(w, h)} / ${Math.min(w, h)}` : `${Math.min(w, h)} / ${Math.max(w, h)}`;
    } else {
      ratio = isLandscape ? '1.414 / 1' : '1 / 1.414';
    }
    return { aspectRatio: ratio };
  };

  const getMarginPadding = () => {
    const unit = margins.unit || 'in';
    const toPercentX = (val) => {
      const num = parseFloat(val) || 1.0;
      return unit === 'mm' ? `${(num / 210) * 100}%` : `${(num / 8.5) * 100}%`;
    };
    const toPercentY = (val) => {
      const num = parseFloat(val) || 1.0;
      return unit === 'mm' ? `${(num / 297) * 100}%` : `${(num / 11) * 100}%`;
    };

    return {
      paddingTop: toPercentY(margins.top),
      paddingBottom: toPercentY(margins.bottom),
      paddingLeft: toPercentX(margins.left),
      paddingRight: toPercentX(margins.right),
    };
  };

  const savePageText = (newText) => {
    const pages = [...customPagesRef.current];
    while (pages.length < pageCount) pages.push('');
    pages[activePage] = newText;
    customPagesRef.current = pages;
    documentTextRef.current = newText;
    onTextChange?.(pages);
  };

  const handleInputDirect = (e) => {
    savePageText(e.currentTarget.innerText);
  };

  const handleSaveModalText = (newVal) => {
    savePageText(newVal);
    documentTextRef.current = newVal;
    if (editableRef.current) {
      editableRef.current.innerText = newVal;
    }
    setIsEditingModalOpen(false);
  };

  const handleAddPage = () => {
    const pages = [...customPagesRef.current];
    while (pages.length < pageCount) pages.push('');
    pages.push('');
    customPagesRef.current = pages;
    onTextChange?.(pages);
    onPageCountChange?.(pageCount + 1);
    documentTextRef.current = '';
    setActivePage(pageCount);
  };

  const handleDeletePage = () => {
    if (pageCount <= 1) return;

    const pages = [...customPagesRef.current];
    while (pages.length < pageCount) pages.push('');
    pages.splice(activePage, 1);
    customPagesRef.current = pages;
    const nextPageCount = pageCount - 1;
    const nextActivePage = Math.min(activePage, nextPageCount - 1);

    onTextChange?.(pages);
    onPageCountChange?.(nextPageCount);
    documentTextRef.current = pages[nextActivePage] || '';
    setActivePage(nextActivePage);
  };

  return (
    <div className={`bg-slate-900/95 border border-slate-800 rounded-2xl overflow-hidden shadow-xl text-white ${className}`}>
      {/* Header Toolbar */}
      <div className="bg-slate-800/90 px-4 py-3 border-b border-slate-700/60 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Document Layout Preview
          </span>
          <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full font-mono">
            {job.paperSizeId || 'A4'} • {orientation.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {job.printSideId === 'double' && viewMode === 'simulation' && (
            <button
              type="button"
              onClick={() => setActiveSide(s => s === 'front' ? 'back' : 'front')}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-sky-300 font-medium transition text-[11px]"
              title="Flip to other side"
            >
              <RotateCw className="w-3 h-3" />
              <span>{activeSide === 'front' ? 'Side A (Front)' : 'Side B (Back)'}</span>
            </button>
          )}

          {/* Edit Text Content Button */}
          {(viewMode === 'simulation' || !selectedFile) && (
            <>
              <div className="inline-flex items-center gap-1 rounded-lg bg-slate-700/80 p-0.5 border border-slate-600">
                <button
                  type="button"
                  onClick={() => setActivePage(page => Math.max(0, page - 1))}
                  disabled={activePage === 0}
                  className="p-1 rounded hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous paper"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-1 text-[10px] font-mono text-slate-200">
                  Paper {activePage + 1} of {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setActivePage(page => Math.min(pageCount - 1, page + 1))}
                  disabled={activePage >= pageCount - 1}
                  className="p-1 rounded hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next paper"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {onPageCountChange && (
                <>
                  <button
                    type="button"
                    onClick={handleAddPage}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition text-[11px]"
                    title="Add another paper to your document"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Paper</span>
                  </button>
                  {pageCount > 1 && (
                    <button
                      type="button"
                      onClick={handleDeletePage}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition text-[11px]"
                      title={`Delete paper ${activePage + 1}`}
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete Paper</span>
                    </button>
                  )}
                </>
              )}
              {onTextChange && (
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-600/90 hover:bg-brand-600 text-white font-medium transition text-[11px] shadow-xs"
                  title="Edit or paste text on this paper"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit Text</span>
                </button>
              )}
            </>
          )}

          {selectedFile && (
            <div className="inline-flex rounded-lg bg-slate-700/80 p-0.5 border border-slate-600">
              <button
                type="button"
                onClick={() => setViewMode('simulation')}
                className={`px-2 py-1 rounded-md transition font-medium text-[11px] ${
                  viewMode === 'simulation' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                Edit Layout
              </button>
              <button
                type="button"
                onClick={() => setViewMode('raw')}
                className={`px-2 py-1 rounded-md transition font-medium text-[11px] ${
                  viewMode === 'raw' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                }`}
              >
                Original File
              </button>
            </div>
          )}

          {availableFiles.length > 1 && (
            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-700/80 p-0.5 border border-slate-600">
              <button
                type="button"
                onClick={() => setActiveFileIndex(index => Math.max(0, index - 1))}
                disabled={activeFileIndex === 0}
                className="p-1 rounded hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous uploaded file"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-1 text-[10px] font-mono text-slate-200">
                File {activeFileIndex + 1} of {availableFiles.length}
              </span>
              <button
                type="button"
                onClick={() => setActiveFileIndex(index => Math.min(availableFiles.length - 1, index + 1))}
                disabled={activeFileIndex >= availableFiles.length - 1}
                className="p-1 rounded hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next uploaded file"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 bg-slate-700/60 rounded-lg p-1 border border-slate-600/70">
            <button
              type="button"
              onClick={() => setZoom(z => Math.max(0.6, z - 0.1))}
              className="p-1 hover:bg-slate-600 rounded text-slate-300 hover:text-white transition"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-[11px] font-mono font-medium text-slate-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom(z => Math.min(1.4, z + 0.1))}
              className="p-1 hover:bg-slate-600 rounded text-slate-300 hover:text-white transition"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Preview Canvas Area */}
      <div className="p-6 bg-slate-950/70 min-h-[380px] max-h-[520px] overflow-auto flex items-center justify-center relative">
        <div
          className="transition-all duration-300 transform origin-center"
          style={{ transform: `scale(${zoom})` }}
        >
          {viewMode === 'raw' && selectedFile ? (
            <div className="bg-white rounded-lg shadow-2xl p-3 max-w-[min(80vw,560px)] text-slate-900 border border-slate-200">
              {isImageFile ? (
                <div className="space-y-2">
                  <img
                    src={fileUrl}
                    alt={selectedFile.originalName || 'Uploaded design'}
                    className="max-h-[440px] max-w-full mx-auto object-contain"
                  />
                  <div className="text-xs text-slate-500 truncate">
                    {selectedFile.originalName} · Original upload
                  </div>
                </div>
              ) : isPdfFile ? (
                <iframe
                  src={`${fileUrl}#toolbar=1&navpanes=0&view=FitH`}
                  title={`Preview of ${selectedFile.originalName}`}
                  className="w-[min(75vw,520px)] h-[440px] border-0"
                />
              ) : isDocxFile ? (
                <div className="w-[min(75vw,520px)] h-[440px] overflow-auto">
                  {isLoadingDocx && <p className="p-4 text-sm text-slate-600">Loading Word document preview…</p>}
                  {docxPreviewError && (
                    <p role="alert" className="p-4 text-sm text-red-700">{docxPreviewError}</p>
                  )}
                  <div ref={docxPreviewRef} />
                </div>
              ) : (
                <div className="p-8 text-center space-y-3">
                  <FileText className="w-10 h-10 mx-auto text-brand-600" />
                  <h4 className="font-semibold text-slate-800 text-sm">{selectedFile.originalName}</h4>
                  <p className="text-xs text-slate-500">This file type cannot be previewed in the browser.</p>
                  {fileUrl && (
                    <a href={fileUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-700 underline">
                      Open original file
                    </a>
                  )}
                </div>
              )}
              {isDocxFile && (
                <p className="mt-2 text-xs text-slate-500 truncate">{selectedFile.originalName} · Word preview</p>
              )}
            </div>
          ) : (
            /* Interactive Simulation Sheet */
            <div
              className="bg-white text-slate-900 shadow-2xl relative transition-all duration-300 rounded-sm flex flex-col overflow-hidden"
              style={{
                width: isLandscape ? '380px' : '290px',
                minHeight: isLandscape ? '270px' : '390px',
                ...getAspectRatioStyle()
              }}
            >
              <div
                className="w-full h-full flex flex-col"
                style={getMarginPadding()}
              >
                {isImageFile && selectedFile && (
                  <img
                    src={fileUrl}
                    alt="Customer-provided upload"
                    className="w-full max-h-[320px] object-contain"
                  />
                )}
                <div
                  ref={editableRef}
                  contentEditable={Boolean(onTextChange)}
                  dir="ltr"
                  suppressContentEditableWarning={true}
                  onInput={handleInputDirect}
                  onBlur={handleInputDirect}
                  className={`min-h-full whitespace-pre-wrap leading-relaxed outline-none ${
                    onTextChange ? 'cursor-text' : ''
                  }`}
                  title={onTextChange ? 'Type your document text here' : undefined}
                  style={{
                    columnCount: columns,
                    columnGap: '14px',
                    direction: 'ltr',
                    unicodeBidi: 'normal',
                    fontFamily: fontFamily,
                    fontSize: fontSize === '14pt' ? '11px' : fontSize === '16pt' ? '13px' : '9px',
                    fontWeight: fontStyle === 'bold' ? 'bold' : 'normal',
                    fontStyle: fontStyle === 'italic' ? 'italic' : 'normal',
                    textAlign: alignment,
                    lineHeight: lineSpacing
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900 px-4 py-2.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 truncate">
          <Edit3 className="w-3.5 h-3.5 text-brand-400 shrink-0" />
          <span className="text-slate-300">
            Only text you enter on the page is included with your submitted order.
          </span>
        </div>
      </div>

      {/* Edit Content Modal / Drawer */}
      {isEditingModalOpen && (
        <EditTextModal
          initialText={documentTextRef.current}
          isOpen={isEditingModalOpen}
          onClose={() => setIsEditingModalOpen(false)}
          onSave={handleSaveModalText}
        />
      )}
    </div>
  );
}

// Quick Text Editor Modal for long copy or pasting documents
function EditTextModal({ initialText, isOpen, onClose, onSave }) {
  const [text, setText] = useState(initialText);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 text-slate-900 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Edit Document Text Content</h3>
              <p className="text-[11px] text-slate-500">Type or paste text to flow into your customized layout</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <textarea
          dir="ltr"
          rows={8}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste or write your document copy here..."
          className="w-full p-3.5 rounded-2xl border border-slate-300 text-xs text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand-500 font-sans"
        />

        <div className="mt-4 flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-400">
            {text.length} characters • {text.trim().split(/\s+/).filter(Boolean).length} words
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave(text)}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply to Layout</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
