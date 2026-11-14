import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  Eye, FileText, ZoomIn, ZoomOut, RotateCw, Edit3, Check, Type, Plus, ChevronLeft, ChevronRight, Trash2,
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Columns, Ruler, Square, Bold, Italic
} from 'lucide-react';
import { API_ORIGIN } from '../services/api';

const LEGACY_PAGE_BREAK = '\n\n[Page Break]\n\n';
const EMPTY_RUNS = [];
const SUPPORTED_FONTS = ['Arial', 'Roboto', 'Times New Roman', 'Calibri', 'Georgia', 'Courier New'];
const SUPPORTED_SIZES = ['10pt', '11pt', '12pt', '14pt', '16pt'];

function getDocumentPages(formatting) {
  if (Array.isArray(formatting.customDocumentPages)) {
    return formatting.customDocumentPages.length ? formatting.customDocumentPages : [''];
  }
  return formatting.customDocumentText
    ? formatting.customDocumentText.split(LEGACY_PAGE_BREAK)
    : [''];
}

function getStyledTextRuns(root, defaults) {
  const runs = [];

  const appendText = (text, style) => {
    if (!text) return;
    const lastRun = runs[runs.length - 1];
    if (
      lastRun &&
      lastRun.fontFamily === style.fontFamily &&
      lastRun.fontSize === style.fontSize &&
      lastRun.fontStyle === style.fontStyle
    ) {
      lastRun.text += text;
    } else {
      runs.push({ text, ...style });
    }
  };

  const visit = (node, inheritedStyle) => {
    if (node.nodeType === Node.TEXT_NODE) {
      appendText(node.textContent, inheritedStyle);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node;
    if (element.tagName === 'BR') {
      appendText('\n', inheritedStyle);
      return;
    }
    const rawFontFamily = (element.dataset.fontFamily || element.style.fontFamily).replace(/["']/g, '');
    const rawFontSize = element.dataset.fontSize || element.style.fontSize;
    const elementFontWeight = element.style.fontWeight;
    const elementFontStyle = element.style.fontStyle;
    const style = {
      fontFamily: SUPPORTED_FONTS.includes(rawFontFamily) ? rawFontFamily : inheritedStyle.fontFamily,
      fontSize: SUPPORTED_SIZES.includes(rawFontSize) ? rawFontSize : inheritedStyle.fontSize,
      fontStyle: ['regular', 'bold', 'italic'].includes(element.dataset.fontStyle)
        ? element.dataset.fontStyle
        : elementFontWeight === 'bold' || elementFontWeight === '700'
        ? 'bold'
        : elementFontStyle === 'italic' ? 'italic'
          : elementFontWeight === 'normal' || elementFontStyle === 'normal' ? 'regular' : inheritedStyle.fontStyle
    };
    const isBlock = ['DIV', 'P'].includes(element.tagName);
    if (isBlock && runs.length && !runs[runs.length - 1].text.endsWith('\n')) {
      appendText('\n', inheritedStyle);
    }
    Array.from(element.childNodes).forEach(child => visit(child, style));
    if (isBlock && runs.length && !runs[runs.length - 1].text.endsWith('\n')) {
      appendText('\n', inheritedStyle);
    }
  };

  Array.from(root.childNodes).forEach(child => visit(child, {
    fontFamily: defaults.fontFamily || 'Arial',
    fontSize: defaults.fontSize || '11pt',
    fontStyle: defaults.fontStyle || 'regular'
  }));
  if (runs.length && runs[runs.length - 1].text.endsWith('\n')) {
    runs[runs.length - 1].text = runs[runs.length - 1].text.replace(/\n+$/, '\n');
  }
  return runs;
}

function renderStyledTextRuns(root, text, runs, defaults, fontScale = 1) {
  root.replaceChildren();
  const contentRuns = Array.isArray(runs) && runs.length ? runs : [{
    text,
    fontFamily: defaults.fontFamily || 'Arial',
    fontSize: defaults.fontSize || '11pt',
    fontStyle: defaults.fontStyle || 'regular'
  }];
  if (!text && (!Array.isArray(runs) || runs.length === 0)) return;
  contentRuns.forEach(run => {
    const span = document.createElement('span');
    span.style.fontFamily = SUPPORTED_FONTS.includes(run.fontFamily) ? run.fontFamily : defaults.fontFamily || 'Arial';
    const safeFontSize = SUPPORTED_SIZES.includes(run.fontSize) ? run.fontSize : defaults.fontSize || '11pt';
    span.style.fontSize = `${(parseFloat(safeFontSize) || 11) * fontScale}px`;
    span.style.fontWeight = run.fontStyle === 'bold' ? 'bold' : 'normal';
    span.style.fontStyle = run.fontStyle === 'italic' ? 'italic' : 'normal';
    span.dataset.fontFamily = span.style.fontFamily;
    span.dataset.fontSize = safeFontSize;
    span.dataset.fontStyle = ['regular', 'bold', 'italic'].includes(run.fontStyle) ? run.fontStyle : 'regular';
    span.textContent = run.text || '';
    root.appendChild(span);
  });
}

export default function DocumentPreview({
  file,
  files = [],
  formatting = {},
  job = {},
  paperSizes = [],
  onPaperSizeChange,
  onTextChange,
  onPageCountChange,
  onFormattingChange,
  selectedFileIndex,
  onSelectedFileIndexChange,
  className = ''
}) {
  const [zoom, setZoom] = useState(1);
  const [viewMode, setViewMode] = useState('raw');
  const [activeSide, setActiveSide] = useState('front'); // 'front' | 'back'
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [activeFormattingPanel, setActiveFormattingPanel] = useState(null);
  const [internalActiveFileIndex, setInternalActiveFileIndex] = useState(0);
  const [localFileUrl, setLocalFileUrl] = useState('');
  const [isLoadingDocx, setIsLoadingDocx] = useState(false);
  const [docxPreviewError, setDocxPreviewError] = useState('');

  const customPages = getDocumentPages(formatting);
  const customPagesKey = JSON.stringify(customPages);
  const customPageRuns = formatting.customDocumentPageRuns?.[activePage] || EMPTY_RUNS;
  const pageCount = Math.max(1, Number(job.pagesPerCopy) || 1, customPages.length);
  const editableRef = useRef(null);
  const documentTextRef = useRef('');
  const customPagesRef = useRef(customPages);
  const customPageRunsRef = useRef(formatting.customDocumentPageRuns || []);
  const docxPreviewRef = useRef(null);
  const availableFiles = files.length > 0 ? files : (file ? [file] : []);
  const activeFileIndex = selectedFileIndex ?? internalActiveFileIndex;
  const setActiveFileIndex = (indexOrUpdater) => {
    const nextIndex = typeof indexOrUpdater === 'function'
      ? indexOrUpdater(activeFileIndex)
      : indexOrUpdater;
    if (onSelectedFileIndexChange) {
      onSelectedFileIndexChange(nextIndex);
    } else {
      setInternalActiveFileIndex(nextIndex);
    }
  };
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
  const fileUrl = selectedFile?.url
    ? (/^https?:\/\//i.test(selectedFile.url) || !API_ORIGIN
      ? selectedFile.url
      : `${API_ORIGIN}${selectedFile.url.startsWith('/') ? '' : '/'}${selectedFile.url}`)
    : localFileUrl;

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

  useEffect(() => {
    customPageRunsRef.current = formatting.customDocumentPageRuns || [];
  }, [formatting.customDocumentPageRuns]);

  useLayoutEffect(() => {
    const pageText = customPagesRef.current[activePage] || '';
    documentTextRef.current = pageText;
    if (editableRef.current) {
      renderStyledTextRuns(editableRef.current, pageText, customPageRunsRef.current[activePage], formatting, 0.8);
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
    lineSpacing = 1.15,
    pageBorder = 'none'
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

  const updateFormatting = (changesOrUpdater) => {
    if (!onFormattingChange) return;
    onFormattingChange(current => typeof changesOrUpdater === 'function'
      ? changesOrUpdater(current)
      : { ...current, ...changesOrUpdater });
  };

  const updateMargins = (changes) => {
    if (!onFormattingChange) return;
    onFormattingChange(current => ({
      ...current,
      margins: { ...current.margins, ...changes }
    }));
  };

  const openFormattingPanel = (panel) => {
    setViewMode('simulation');
    setActiveFormattingPanel(current => current === panel ? null : panel);
  };

  const marginPreset = (value) => {
    updateMargins({ top: value, bottom: value, left: value, right: value, unit: 'in' });
  };

  const savePageText = (newText, runs = []) => {
    const pages = [...customPagesRef.current];
    const pageRuns = [...customPageRunsRef.current];
    while (pages.length < pageCount) pages.push('');
    while (pageRuns.length < pageCount) pageRuns.push([]);
    pages[activePage] = newText;
    pageRuns[activePage] = runs;
    customPagesRef.current = pages;
    customPageRunsRef.current = pageRuns;
    documentTextRef.current = newText;
    onTextChange?.(pages, pageRuns);
  };

  const handleInputDirect = (e) => {
    savePageText(
      e.currentTarget.innerText,
      getStyledTextRuns(e.currentTarget, formatting)
    );
  };

  const handleSaveModalText = (newVal, runs) => {
    savePageText(newVal, runs);
    documentTextRef.current = newVal;
    if (editableRef.current) {
      renderStyledTextRuns(editableRef.current, newVal, runs, formatting, 0.8);
    }
    setIsEditingModalOpen(false);
  };

  const handleAddPage = () => {
    const pages = [...customPagesRef.current];
    const pageRuns = [...customPageRunsRef.current];
    while (pages.length < pageCount) pages.push('');
    while (pageRuns.length < pageCount) pageRuns.push([]);
    pages.push('');
    pageRuns.push([]);
    customPagesRef.current = pages;
    customPageRunsRef.current = pageRuns;
    onTextChange?.(pages, pageRuns);
    onPageCountChange?.(pageCount + 1);
    documentTextRef.current = '';
    setActivePage(pageCount);
  };

  const handleDeletePage = () => {
    if (pageCount <= 1) return;

    const pages = [...customPagesRef.current];
    const pageRuns = [...customPageRunsRef.current];
    while (pages.length < pageCount) pages.push('');
    while (pageRuns.length < pageCount) pageRuns.push([]);
    pages.splice(activePage, 1);
    pageRuns.splice(activePage, 1);
    customPagesRef.current = pages;
    const nextPageCount = pageCount - 1;
    const nextActivePage = Math.min(activePage, nextPageCount - 1);

    onTextChange?.(pages, pageRuns);
    customPageRunsRef.current = pageRuns;
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
                boxSizing: 'border-box',
                border: pageBorder === 'double'
                  ? '3px double #64748b'
                  : pageBorder === 'thin' ? '1px solid #94a3b8' : '1px solid transparent',
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
                    fontSize: `${(parseFloat(fontSize) || 11) * 0.8}px`,
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

      {onFormattingChange && (
        <div className="border-t border-slate-800 bg-slate-900 px-3 py-3 sm:px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-200">Quick document tools</p>
              <p className="text-[10px] text-slate-500">Format your editable layout; uploaded originals stay unchanged.</p>
            </div>
            <div className="flex items-center gap-1.5" role="toolbar" aria-label="Document formatting tools">
              {[
                { id: 'type', label: 'Font and size', Icon: Type },
                { id: 'layout', label: 'Orientation and columns', Icon: Columns },
                { id: 'alignment', label: 'Alignment and spacing', Icon: AlignLeft },
                { id: 'margins', label: 'Page margins', Icon: Ruler },
                { id: 'border', label: 'Page border', Icon: Square }
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => openFormattingPanel(id)}
                  aria-label={label}
                  aria-pressed={activeFormattingPanel === id}
                  title={label}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                    activeFormattingPanel === id
                      ? 'border-brand-400 bg-brand-500/20 text-brand-300'
                      : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          {activeFormattingPanel && (
            <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-800/80 p-3 sm:p-4 animate-in fade-in duration-150">
              {activeFormattingPanel === 'type' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="text-[11px] font-medium text-slate-300">
                    Font family
                    <select
                      value={fontFamily}
                      onChange={e => updateFormatting({ fontFamily: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white"
                    >
                      {['Arial', 'Times New Roman', 'Calibri', 'Roboto', 'Georgia', 'Courier New'].map(font => (
                        <option key={font} value={font}>{font}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-[11px] font-medium text-slate-300">
                    Font size
                    <select
                      value={fontSize}
                      onChange={e => updateFormatting({ fontSize: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white"
                    >
                      {['10pt', '11pt', '12pt', '14pt', '16pt'].map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </label>
                  <div>
                    <span className="text-[11px] font-medium text-slate-300">Text style</span>
                    <div className="mt-1.5 flex gap-1.5">
                      {[
                        { value: 'regular', label: 'Regular', Icon: Type },
                        { value: 'bold', label: 'Bold', Icon: Bold },
                        { value: 'italic', label: 'Italic', Icon: Italic }
                      ].map(({ value, label, Icon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateFormatting({ fontStyle: value })}
                          aria-label={label}
                          aria-pressed={fontStyle === value}
                          title={label}
                          className={`flex h-9 flex-1 items-center justify-center rounded-xl border ${
                            fontStyle === value
                              ? 'border-brand-400 bg-brand-500/20 text-brand-300'
                              : 'border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeFormattingPanel === 'layout' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {paperSizes.length > 0 && onPaperSizeChange && (
                    <label className="text-[11px] font-medium text-slate-300">
                      Paper size
                      <select
                        value={job.paperSizeId || ''}
                        onChange={e => onPaperSizeChange(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white"
                      >
                        {paperSizes.map(size => (
                          <option key={size.id} value={size.id}>{size.name || size.id}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <fieldset>
                    <legend className="text-[11px] font-medium text-slate-300">Orientation</legend>
                    <div className="mt-1.5 flex gap-1.5">
                      {['portrait', 'landscape'].map(value => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateFormatting({ orientation: value })}
                          aria-pressed={orientation === value}
                          className={`flex-1 rounded-xl border px-3 py-2 text-xs capitalize ${
                            orientation === value
                              ? 'border-brand-400 bg-brand-500/20 text-brand-300'
                              : 'border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset>
                    <legend className="text-[11px] font-medium text-slate-300">Columns</legend>
                    <div className="mt-1.5 flex gap-1.5">
                      {[1, 2, 3].map(value => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateFormatting({ columns: value })}
                          aria-pressed={columns === value}
                          className={`flex-1 rounded-xl border px-3 py-2 text-xs ${
                            columns === value
                              ? 'border-brand-400 bg-brand-500/20 text-brand-300'
                              : 'border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {value} col
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
              )}

              {activeFormattingPanel === 'alignment' && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <fieldset>
                    <legend className="text-[11px] font-medium text-slate-300">Text alignment</legend>
                    <div className="mt-1.5 flex gap-1.5">
                      {[
                        { value: 'left', label: 'Left', Icon: AlignLeft },
                        { value: 'center', label: 'Center', Icon: AlignCenter },
                        { value: 'right', label: 'Right', Icon: AlignRight },
                        { value: 'justify', label: 'Justify', Icon: AlignJustify }
                      ].map(({ value, label, Icon }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateFormatting({ alignment: value })}
                          aria-label={label}
                          aria-pressed={alignment === value}
                          title={label}
                          className={`flex h-9 flex-1 items-center justify-center rounded-xl border ${
                            alignment === value
                              ? 'border-brand-400 bg-brand-500/20 text-brand-300'
                              : 'border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <label className="text-[11px] font-medium text-slate-300">
                    Line spacing
                    <select
                      value={lineSpacing}
                      onChange={e => updateFormatting({ lineSpacing: Number(e.target.value) })}
                      className="mt-1.5 w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-xs text-white"
                    >
                      {[1, 1.15, 1.5, 2].map(value => (
                        <option key={value} value={value}>{value}x</option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {activeFormattingPanel === 'margins' && (
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-slate-300">Page margins (inches)</span>
                    <div className="flex gap-1.5">
                      {[['Normal', 1], ['Narrow', 0.5], ['Wide', 1.5]].map(([label, value]) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => marginPreset(value)}
                          className="rounded-lg border border-slate-600 bg-slate-900 px-2.5 py-1.5 text-[10px] font-medium text-slate-300 hover:bg-slate-700"
                        >
                          {label} {value}&quot;
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {['top', 'bottom', 'left', 'right'].map(side => (
                      <label key={side} className="text-[10px] capitalize text-slate-400">
                        {side}
                        <input
                          type="number"
                          min="0.2"
                          max="3"
                          step="0.1"
                          value={margins[side]}
                          onChange={e => updateMargins({ [side]: Math.max(0.2, Number(e.target.value) || 0.2), unit: 'in' })}
                          className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-900 px-2.5 py-2 text-xs text-white"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {activeFormattingPanel === 'border' && (
                <fieldset>
                  <legend className="text-[11px] font-medium text-slate-300">Page border</legend>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {[
                      { value: 'none', label: 'No border' },
                      { value: 'thin', label: 'Thin line' },
                      { value: 'double', label: 'Double line' }
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateFormatting({ pageBorder: value })}
                        aria-pressed={pageBorder === value}
                        className={`rounded-xl border px-3 py-2 text-xs ${
                          pageBorder === value
                            ? 'border-brand-400 bg-brand-500/20 text-brand-300'
                            : 'border-slate-600 bg-slate-900 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-slate-900 px-4 py-2.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 truncate">
          <Edit3 className="w-3.5 h-3.5 text-brand-400 shrink-0" />
          <span className="text-slate-300">
            Text typed here is saved with your order; uploaded originals remain unchanged.
          </span>
        </div>
      </div>

      {/* Edit Content Modal / Drawer */}
      {isEditingModalOpen && (
        <EditTextModal
          initialText={documentTextRef.current}
          initialRuns={customPageRuns}
          isOpen={isEditingModalOpen}
          onClose={() => setIsEditingModalOpen(false)}
          onSave={handleSaveModalText}
          formatting={formatting}
          onFormattingChange={updateFormatting}
          job={job}
          paperSizes={paperSizes}
          onPaperSizeChange={onPaperSizeChange}
        />
      )}
    </div>
  );
}

// Quick Text Editor Modal for long copy or pasting documents
function EditTextModal({
  initialText,
  initialRuns,
  isOpen,
  onClose,
  onSave,
  formatting,
  onFormattingChange,
  job,
  paperSizes,
  onPaperSizeChange
}) {
  const [text, setText] = useState(initialText);
  const [hasTextSelection, setHasTextSelection] = useState(false);
  const editorRef = useRef(null);
  const selectionRangeRef = useRef(null);

  useLayoutEffect(() => {
    if (isOpen && editorRef.current) {
      renderStyledTextRuns(editorRef.current, initialText, initialRuns, formatting);
      setText(initialText);
    }
  }, [isOpen, initialText, initialRuns, formatting.fontFamily, formatting.fontSize, formatting.fontStyle]);

  if (!isOpen) return null;

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      selectionRangeRef.current = range.cloneRange();
      setHasTextSelection(!range.collapsed);
    }
  };

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    setText(editorRef.current.innerText);
    saveSelection();
  };

  const handleApplyText = () => {
    if (!editorRef.current) return;
    const currentText = editorRef.current.innerText;
    const runs = getStyledTextRuns(editorRef.current, formatting);
    onSave(currentText, runs);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-5 sm:p-6 border border-slate-200 text-slate-900 animate-in fade-in zoom-in-95 duration-200">
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

        <EditDocumentToolbar
          formatting={formatting}
          onFormattingChange={onFormattingChange}
          job={job}
          paperSizes={paperSizes}
          onPaperSizeChange={onPaperSizeChange}
          editorRef={editorRef}
          selectionRangeRef={selectionRangeRef}
          onEditorInput={handleEditorInput}
          hasTextSelection={hasTextSelection}
        />

        <div
          ref={editorRef}
          dir="ltr"
          contentEditable
          suppressContentEditableWarning
          onInput={handleEditorInput}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onBlur={saveSelection}
          data-placeholder="Paste or write your document copy here..."
          className="mt-3 min-h-[220px] w-full whitespace-pre-wrap rounded-2xl border border-slate-300 p-3.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400"
          style={{
            textAlign: formatting.alignment,
            lineHeight: formatting.lineSpacing
          }}
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
              onClick={handleApplyText}
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

function EditDocumentToolbar({
  formatting,
  onFormattingChange,
  job,
  paperSizes,
  onPaperSizeChange,
  editorRef,
  selectionRangeRef,
  onEditorInput,
  hasTextSelection
}) {
  const [activePanel, setActivePanel] = useState(null);
  const [selectedFontFamily, setSelectedFontFamily] = useState('');
  const [selectedFontSize, setSelectedFontSize] = useState('');
  const [selectedFontStyle, setSelectedFontStyle] = useState('');
  const {
    orientation = 'portrait',
    columns = 1,
    alignment = 'left',
    lineSpacing = 1.15,
    margins = { top: 1, bottom: 1, left: 1, right: 1, unit: 'in' },
    pageBorder = 'none'
  } = formatting;

  const update = changes => onFormattingChange(current => ({ ...current, ...changes }));
  const updateMargin = changes => onFormattingChange(current => ({
    ...current,
    margins: { ...current.margins, ...changes }
  }));
  const captureSelection = () => {
    const root = editorRef.current;
    const selection = window.getSelection();
    if (root && selection?.rangeCount && root.contains(selection.anchorNode)) {
      selectionRangeRef.current = selection.getRangeAt(0).cloneRange();
    }
  };
  const applyStyleToSelection = (styleChanges) => {
    const root = editorRef.current;
    const savedRange = selectionRangeRef.current;
    if (!root || !savedRange || savedRange.collapsed || !root.contains(savedRange.commonAncestorContainer)) return;

    root.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(savedRange);

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    Object.entries(styleChanges).forEach(([property, value]) => {
      span.style[property] = value;
    });
    const updateStyleMetadata = element => {
      if (styleChanges.fontFamily) element.dataset.fontFamily = styleChanges.fontFamily;
      if (styleChanges.fontSize) element.dataset.fontSize = styleChanges.fontSize;
      if (styleChanges.fontWeight || styleChanges.fontStyle) {
        element.dataset.fontStyle = styleChanges.fontWeight === 'bold'
          ? 'bold'
          : styleChanges.fontStyle === 'italic' ? 'italic' : 'regular';
      }
    };
    updateStyleMetadata(span);
    const selectedContent = range.extractContents();
    span.appendChild(selectedContent);
    span.querySelectorAll('*').forEach(element => {
      Object.entries(styleChanges).forEach(([property, value]) => {
        element.style[property] = value;
      });
      updateStyleMetadata(element);
    });
    range.insertNode(span);

    const updatedRange = document.createRange();
    updatedRange.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(updatedRange);
    selectionRangeRef.current = updatedRange.cloneRange();
    onEditorInput();
  };
  const panels = [
    { id: 'type', label: 'Font and size', Icon: Type },
    { id: 'layout', label: 'Paper and columns', Icon: Columns },
    { id: 'alignment', label: 'Alignment and spacing', Icon: AlignLeft },
    { id: 'margins', label: 'Page margins', Icon: Ruler },
    { id: 'border', label: 'Page border', Icon: Square }
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-slate-700">Quick document tools</p>
          <p className="text-[10px] text-slate-500">Choose a tool to format your layout while you write.</p>
        </div>
        <div className="flex items-center gap-1.5" role="toolbar" aria-label="Document formatting tools">
          {panels.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActivePanel(current => current === id ? null : id)}
              aria-label={label}
              aria-expanded={activePanel === id}
              title={label}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                activePanel === id
                  ? 'border-brand-300 bg-brand-50 text-brand-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700'
              }`}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {activePanel && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          {activePanel === 'type' && (
            <>
            <p className={`mb-2 text-[10px] ${hasTextSelection ? 'text-emerald-700' : 'text-slate-500'}`}>
              {hasTextSelection
                ? 'Font changes will apply only to the selected text.'
                : 'Select text in the editor first. Font, size, and style will not change other text.'}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="text-[10px] font-semibold text-slate-500">
                Font family (select text first)
                <select
                  value={selectedFontFamily}
                  onPointerDown={captureSelection}
                  onChange={e => {
                    applyStyleToSelection({ fontFamily: e.target.value });
                    setSelectedFontFamily('');
                  }}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800"
                >
                  <option value="" disabled>Select font</option>
                  {['Arial', 'Roboto', 'Times New Roman', 'Calibri', 'Georgia', 'Courier New'].map(font => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </label>
              <label className="text-[10px] font-semibold text-slate-500">
                Font size (selected text)
                <select
                  value={selectedFontSize}
                  onPointerDown={captureSelection}
                  onChange={e => {
                    applyStyleToSelection({ fontSize: e.target.value });
                    setSelectedFontSize('');
                  }}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800"
                >
                  <option value="" disabled>Select size</option>
                  {['10pt', '11pt', '12pt', '14pt', '16pt'].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </label>
              <label className="text-[10px] font-semibold text-slate-500">
                Text style (selected text)
                <select
                  value={selectedFontStyle}
                  onPointerDown={captureSelection}
                  onChange={e => {
                    if (e.target.value === 'bold') {
                      applyStyleToSelection({ fontWeight: 'bold', fontStyle: 'normal' });
                    } else if (e.target.value === 'italic') {
                      applyStyleToSelection({ fontWeight: 'normal', fontStyle: 'italic' });
                    } else {
                      applyStyleToSelection({ fontWeight: 'normal', fontStyle: 'normal' });
                    }
                    setSelectedFontStyle('');
                  }}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800"
                >
                  <option value="" disabled>Select style</option>
                  <option value="regular">Regular</option>
                  <option value="bold">Bold</option>
                  <option value="italic">Italic</option>
                </select>
              </label>
            </div>
            </>
          )}

          {activePanel === 'layout' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {paperSizes?.length > 0 && onPaperSizeChange && (
                <label className="text-[10px] font-semibold text-slate-500">
                  Paper size
                  <select
                    value={job.paperSizeId || ''}
                    onChange={e => onPaperSizeChange(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800"
                  >
                    {paperSizes.map(size => <option key={size.id} value={size.id}>{size.name || size.id}</option>)}
                  </select>
                </label>
              )}
              <fieldset>
                <legend className="text-[10px] font-semibold text-slate-500">Orientation</legend>
                <div className="mt-1 flex gap-1">
                  {['portrait', 'landscape'].map(value => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update({ orientation: value })}
                      aria-pressed={orientation === value}
                      className={`flex-1 rounded-lg border px-2 py-2 text-[10px] capitalize ${
                        orientation === value ? 'border-brand-300 bg-brand-50 font-semibold text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-[10px] font-semibold text-slate-500">Columns</legend>
                <div className="mt-1 flex gap-1">
                  {[1, 2, 3].map(value => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update({ columns: value })}
                      aria-pressed={columns === value}
                      className={`flex-1 rounded-lg border px-2 py-2 text-xs ${
                        columns === value ? 'border-brand-300 bg-brand-50 font-semibold text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>
          )}

          {activePanel === 'alignment' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <fieldset>
                <legend className="text-[10px] font-semibold text-slate-500">Text alignment</legend>
                <div className="mt-1 flex gap-1">
                  {[
                    { value: 'left', label: 'Left', Icon: AlignLeft },
                    { value: 'center', label: 'Center', Icon: AlignCenter },
                    { value: 'right', label: 'Right', Icon: AlignRight },
                    { value: 'justify', label: 'Justify', Icon: AlignJustify }
                  ].map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update({ alignment: value })}
                      aria-label={label}
                      aria-pressed={alignment === value}
                      title={label}
                      className={`flex h-9 flex-1 items-center justify-center rounded-lg border ${
                        alignment === value ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="text-[10px] font-semibold text-slate-500">
                Line spacing
                <select
                  value={lineSpacing}
                  onChange={e => update({ lineSpacing: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800"
                >
                  {[1, 1.15, 1.5, 2].map(value => <option key={value} value={value}>{value}x</option>)}
                </select>
              </label>
            </div>
          )}

          {activePanel === 'margins' && (
            <div>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {[['Normal', 1], ['Narrow', 0.5], ['Wide', 1.5]].map(([label, value]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => updateMargin({ top: value, bottom: value, left: value, right: value, unit: 'in' })}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {label} {value}&quot;
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {['top', 'bottom', 'left', 'right'].map(side => (
                  <label key={side} className="text-[10px] capitalize text-slate-500">
                    {side}
                    <input
                      type="number"
                      min="0.2"
                      max="3"
                      step="0.1"
                      value={margins[side]}
                      onChange={e => updateMargin({ [side]: Math.max(0.2, Number(e.target.value) || 0.2), unit: 'in' })}
                      className="mt-1 block w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-800"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {activePanel === 'border' && (
            <fieldset>
              <legend className="text-[10px] font-semibold text-slate-500">Page border</legend>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {[
                  { value: 'none', label: 'No border' },
                  { value: 'thin', label: 'Thin line' },
                  { value: 'double', label: 'Double line' }
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => update({ pageBorder: value })}
                    aria-pressed={pageBorder === value}
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      pageBorder === value ? 'border-brand-300 bg-brand-50 font-semibold text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      )}
    </div>
  );
}
