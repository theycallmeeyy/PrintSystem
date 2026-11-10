import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, FileText, X, Check, RefreshCw, Sliders, Layout,
  Layers, Package, Sparkles, AlertCircle, FileCheck, ArrowRight,
  ArrowLeft, CheckCircle2, Truck, Zap, Tag, ShieldCheck, Eye, Printer,
  HelpCircle, ChevronRight
} from 'lucide-react';
import DocumentPreview from './DocumentPreview';
import PricingSummary from './PricingSummary';
import OrderReviewModal from './OrderReviewModal';
import { calculatePricePreview, createOrder, uploadFiles } from '../services/api';

export default function CustomerOrderForm({
  pricingConfig,
  onOrderCreated,
  onTrackOrder
}) {
  // Active Wizard Step (1: Service & File, 2: Paper & Print, 3: Formatting, 4: Review & Contact)
  const [activeStep, setActiveStep] = useState(1);

  // Form state
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });

  const [job, setJob] = useState({
    jobTypeId: 'document',
    paperSizeId: 'A4',
    customDimensions: { width: 8.5, height: 11, unit: 'in' },
    paperMaterialId: 'bond-70',
    colorModeId: 'bw',
    printSideId: 'single',
    pagesPerCopy: 1,
    copies: 1,
    productQuantity: 100,
    selectedFinishing: []
  });

  const [formatting, setFormatting] = useState({
    fontFamily: 'Arial',
    fontSize: '11pt',
    fontStyle: 'regular',
    margins: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0, unit: 'in' },
    orientation: 'portrait',
    columns: 1,
    alignment: 'left',
    lineSpacing: 1.15,
    customDocumentPages: ['']
  });

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isRush, setIsRush] = useState(false);
  const [isDelivery, setIsDelivery] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Preview & Mobile Tab state ('preview' | 'summary')
  const [mobileSideTab, setMobileSideTab] = useState('summary');

  // Real-time calculated pricing
  const [pricingCalculation, setPricingCalculation] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [submittedOrder, setSubmittedOrder] = useState(null);

  const fileInputRef = useRef(null);

  // Recalculate price whenever parameters change
  useEffect(() => {
    let active = true;

    async function updateCalculation() {
      setIsCalculating(true);
      try {
        const payload = {
          jobTypeId: job.jobTypeId,
          paperSizeId: job.paperSizeId,
          paperMaterialId: job.paperMaterialId,
          colorModeId: job.colorModeId,
          printSideId: job.printSideId,
          pagesPerCopy: job.pagesPerCopy,
          copies: job.copies,
          productQuantity: job.productQuantity,
          selectedFinishing: job.selectedFinishing,
          isRush,
          isDelivery,
          discountCode: appliedPromo
        };

        const calc = await calculatePricePreview(payload);
        if (active) {
          setPricingCalculation(calc);
          setFormError(null);
        }
      } catch (err) {
        console.error('Price calculation error:', err);
      } finally {
        if (active) setIsCalculating(false);
      }
    }

    updateCalculation();
    return () => { active = false; };
  }, [job, isRush, isDelivery, appliedPromo, pricingConfig]);

  // Handle file uploads
  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setFormError(null);

    try {
      const res = await uploadFiles(files);
      if (res.files && res.files.length > 0) {
        setUploadedFiles(prev => [...prev, ...res.files]);
        if (res.files[0].mimetype?.startsWith('image/')) {
          setJob(j => ({ ...j, pagesPerCopy: 1 }));
        }
      }
    } catch (err) {
      setFormError(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleApplyPromo = () => {
    if (!discountCode.trim()) {
      setAppliedPromo('');
      return;
    }
    setAppliedPromo(discountCode.trim().toUpperCase());
  };

  const applyMarginPreset = (preset) => {
    if (preset === 'normal') {
      setFormatting(f => ({ ...f, margins: { top: 1.0, bottom: 1.0, left: 1.0, right: 1.0, unit: 'in' } }));
    } else if (preset === 'narrow') {
      setFormatting(f => ({ ...f, margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5, unit: 'in' } }));
    } else if (preset === 'wide') {
      setFormatting(f => ({ ...f, margins: { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5, unit: 'in' } }));
    }
  };

  const validateStep = (step) => {
    setFormError(null);
    if (step === 4) {
      if (isDelivery && !deliveryAddress.trim()) {
        setFormError('Please provide a complete delivery address.');
        return false;
      }
    }
    return true;
  };

  const goToNextStep = () => {
    if (validateStep(activeStep)) {
      const nextStep = Math.min(4, activeStep + 1);
      setActiveStep(nextStep);
      setMobileSideTab(nextStep === 3 ? 'preview' : 'summary');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrevStep = () => {
    setFormError(null);
    const previousStep = Math.max(1, activeStep - 1);
    setActiveStep(previousStep);
    setMobileSideTab(previousStep === 3 ? 'preview' : 'summary');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReviewOrder = () => {
    if (!validateStep(4)) return;
    setIsReviewModalOpen(true);
  };

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);
    setFormError(null);

    try {
      const orderPayload = {
        customer,
        job,
        formatting,
        files: uploadedFiles,
        isRush,
        isDelivery,
        deliveryAddress: isDelivery ? deliveryAddress : '',
        discountCode: appliedPromo,
        paymentMethod
      };

      const created = await createOrder(orderPayload);
      setIsReviewModalOpen(false);
      setSubmittedOrder(created);

      // Save to local storage for quick tracking
      try {
        const stored = JSON.parse(localStorage.getItem('printplus_recent_orders') || '[]');
        const updated = [created.id, ...stored.filter(id => id !== created.id)].slice(0, 5);
        localStorage.setItem('printplus_recent_orders', JSON.stringify(updated));
      } catch (e) {
        console.warn('Storage notice:', e);
      }

      if (onOrderCreated) onOrderCreated(created);
    } catch (err) {
      setFormError(err.message || 'Failed to submit order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPerSheetProduct = pricingCalculation?.calculationMeta?.isPerSheetProduct;
  const grandTotal = pricingCalculation?.costs?.grandTotal || 0;

  // Render Order Success Screen
  if (submittedOrder) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-xl text-center animate-in fade-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <FileCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Order Submitted Successfully!</h2>
        <p className="text-slate-600 mt-2 text-sm">
          Thank you, <strong className="text-slate-800">{submittedOrder.customer.name}</strong>. Your print job has been placed in our shop queue.
        </p>

        <div className="my-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl max-w-sm mx-auto shadow-inner">
          <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">Order Reference Number</span>
          <span className="text-2xl font-black font-mono text-brand-600 block mt-1">
            {submittedOrder.id}
          </span>
          <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-slate-200">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 pulse-dot-red" />
            <span className="text-xs font-semibold text-red-700">New / Pending (Awaiting Processing)</span>
          </div>
        </div>

        <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
          Estimated Total: <strong className="text-slate-800 font-mono text-sm">₱{submittedOrder.pricingSnapshot?.costs?.grandTotal?.toFixed(2)}</strong>. You can follow live updates with the colored status indicator without refreshing.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onTrackOrder && onTrackOrder(submittedOrder.id)}
            className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-md transition text-sm flex items-center gap-2"
          >
            <span>Track Order Live</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSubmittedOrder(null);
              setUploadedFiles([]);
              setCustomer({ name: '', phone: '', email: '', notes: '' });
              setActiveStep(1);
            }}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition text-sm"
          >
            Create Another Order
          </button>
        </div>
      </div>
    );
  }

  const steps = [
    { number: 1, title: 'Service & File', subtitle: 'Choose job & upload' },
    { number: 2, title: 'Paper & Quantity', subtitle: 'Sizes, stock & sheets' },
    { number: 3, title: 'Formatting', subtitle: 'Layout & margins' },
    { number: 4, title: 'Details & Review', subtitle: 'Contact & submit' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Top Stepper Navigation (Modern & Intuitive) */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {steps.map(step => {
              const isActive = activeStep === step.number;
              const isPast = activeStep > step.number;
              return (
                <button
                  key={step.number}
                  type="button"
                  onClick={() => {
                    if (step.number < activeStep || validateStep(activeStep)) {
                      setActiveStep(step.number);
                      setMobileSideTab(step.number === 3 ? 'preview' : 'summary');
                    }
                  }}
                  className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-xl text-left transition-all ${
                    isActive
                      ? 'bg-brand-50 border border-brand-200 text-brand-900 shadow-xs'
                      : isPast
                      ? 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      : 'text-slate-400 hover:text-slate-600 opacity-75'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-xs'
                      : isPast
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {isPast ? <Check className="w-4 h-4 stroke-[2.5]" /> : step.number}
                  </div>
                  <div className="truncate">
                    <span className={`block text-xs font-bold leading-tight ${isActive ? 'text-brand-900' : 'text-slate-800'}`}>
                      {step.title}
                    </span>
                    <span className="block text-[10px] text-slate-400 truncate hidden sm:block">
                      {step.subtitle}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {formError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs sm:text-sm flex items-center gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{formError}</span>
        </div>
      )}

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        {/* Left Column: Active Step Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">

          {/* STEP 1: SERVICE & FILE UPLOAD */}
          {activeStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Job Service Selection */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-base font-bold text-slate-900">1. Select Print Job Service</h2>
                  <p className="text-xs text-slate-500 mt-0.5">What type of document or product would you like to print today?</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {(pricingConfig?.jobTypes || []).map(j => {
                    const isSelected = job.jobTypeId === j.id;
                    const selectedPaperSize = pricingConfig?.paperSizes?.find(size => size.id === job.paperSizeId);
                    const configuredDocumentRate = selectedPaperSize?.documentRates?.[job.colorModeId];
                    const displayRate = j.id === 'document' && Number.isFinite(configuredDocumentRate)
                      ? `₱${configuredDocumentRate.toFixed(2)} / page print`
                      : `₱${j.baseRatePerPage?.toFixed(2)} ${j.isPerSheetProduct ? '/ item' : '/ page'}`;
                    return (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => setJob({ ...job, jobTypeId: j.id })}
                        className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                          isSelected
                            ? 'border-brand-600 bg-brand-50/70 ring-2 ring-brand-500/20 text-brand-900 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70 text-slate-700'
                        }`}
                      >
                        {isSelected && (
                          <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-brand-600 text-white flex items-center justify-center text-[10px]">
                            ✓
                          </span>
                        )}
                        <span className="font-bold text-xs block text-slate-900">{j.name}</span>
                        <span className="text-[11px] text-slate-500 block line-clamp-1 mt-0.5">{j.description}</span>
                        <span className="text-[11px] font-mono text-brand-700 font-bold block mt-1.5">
                          {displayRate}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* File Upload Box */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">2. Upload Design or Document</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Original files are stored securely without alteration.</p>
                  </div>
                  <span className="text-[11px] bg-slate-100 text-slate-600 font-mono px-2 py-0.5 rounded-full">
                    Max 1000MB per file
                  </span>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-slate-50/60 hover:bg-brand-50/20 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp,.svg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-12 h-12 bg-white rounded-2xl shadow-xs border border-slate-200 flex items-center justify-center mx-auto mb-3 text-brand-600 group-hover:scale-105 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-sm text-slate-800">
                    {isUploading ? 'Uploading file...' : 'Click to select or drag & drop files here'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports PDF, Word (DOCX/DOC), JPEG, PNG, WEBP, SVG
                  </p>
                </div>

                {/* Uploaded Files preview list */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                      Uploaded File ({uploadedFiles.length})
                    </span>
                    {uploadedFiles.map((f, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FileText className="w-5 h-5 text-brand-600 shrink-0" />
                          <div className="truncate">
                            <p className="font-bold text-slate-800 truncate">{f.originalName}</p>
                            <p className="text-slate-400 text-[11px] font-mono">
                              {(f.size / 1024).toFixed(1)} KB • {f.mimetype || 'Document'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-brand-600 hover:text-brand-700 font-semibold px-2 py-1 rounded hover:bg-white text-xs transition"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFile(idx)}
                            className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PAPER & QUANTITIES */}
          {activeStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Paper Size & Dimensions</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Select a standard paper standard or customize dimensions.</p>
                </div>

                {/* Paper Sizes */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {(pricingConfig?.paperSizes || []).map(s => {
                    const isSelected = job.paperSizeId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setJob({ ...job, paperSizeId: s.id })}
                        className={`py-2.5 px-2 rounded-2xl border text-center transition-all ${
                          isSelected
                            ? 'border-brand-600 bg-brand-50 font-bold text-brand-900 shadow-xs ring-1 ring-brand-500'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="block text-xs font-bold">{s.id}</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          {s.surcharge > 0 ? `+₱${s.surcharge.toFixed(2)}` : 'Standard'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {job.paperSizeId === 'Custom' && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Width</label>
                      <input
                        type="number"
                        step="0.1"
                        value={job.customDimensions?.width || 8.5}
                        onChange={e => setJob({
                          ...job,
                          customDimensions: { ...job.customDimensions, width: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Height</label>
                      <input
                        type="number"
                        step="0.1"
                        value={job.customDimensions?.height || 11}
                        onChange={e => setJob({
                          ...job,
                          customDimensions: { ...job.customDimensions, height: parseFloat(e.target.value) || 0 }
                        })}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Unit</label>
                      <select
                        value={job.customDimensions?.unit || 'in'}
                        onChange={e => setJob({
                          ...job,
                          customDimensions: { ...job.customDimensions, unit: e.target.value }
                        })}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300"
                      >
                        <option value="in">Inches (in)</option>
                        <option value="mm">Millimeters (mm)</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Paper Material */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="mb-3">
                    <h3 className="text-sm font-bold text-slate-900">Paper Material & Stock</h3>
                    <p className="text-xs text-slate-500">Charged per physical sheet consumed.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(pricingConfig?.paperMaterials || []).map(m => {
                      const isSelected = job.paperMaterialId === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setJob({ ...job, paperMaterialId: m.id })}
                          className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                            isSelected
                              ? 'border-brand-600 bg-brand-50/80 ring-1 ring-brand-500 text-brand-900 shadow-xs'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div>
                            <span className="block text-xs font-bold">{m.name}</span>
                            <span className="block text-[11px] text-slate-500">{m.description}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-900 pl-2 shrink-0">
                            +₱{m.pricePerSheet?.toFixed(2)}/sh
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Mode & Sides (Duplex) */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-2">Color Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(pricingConfig?.colorModes || []).map(c => {
                        const isSelected = job.colorModeId === c.id;
                        const documentRate = pricingConfig?.paperSizes
                          ?.find(size => size.id === job.paperSizeId)
                          ?.documentRates?.[c.id];
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setJob({ ...job, colorModeId: c.id })}
                            className={`py-2 px-3 rounded-xl border text-center transition-all ${
                              isSelected
                                ? 'border-brand-600 bg-brand-50 font-bold text-brand-900 ring-1 ring-brand-500'
                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span className="block text-xs font-bold">{c.name.split(' ')[0]}</span>
                            <span className="block text-[10px] text-slate-500">
                              {job.jobTypeId === 'document' && Number.isFinite(documentRate)
                                ? `₱${documentRate.toFixed(2)}/page print`
                                : c.surchargePerPage > 0 ? `+₱${c.surchargePerPage.toFixed(2)}/p` : 'Standard'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-2">Print Sides (Duplex)</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(pricingConfig?.printSides || []).map(s => {
                        const isSelected = job.printSideId === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setJob({ ...job, printSideId: s.id })}
                            className={`py-2 px-3 rounded-xl border text-center transition-all ${
                              isSelected
                                ? 'border-brand-600 bg-brand-50 font-bold text-brand-900 ring-1 ring-brand-500'
                                : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span className="block text-xs font-bold">
                              {s.sidesPerSheet === 1 ? 'Single-Sided' : 'Double-Sided'}
                            </span>
                            <span className="block text-[10px] text-slate-500">
                              {s.sidesPerSheet === 2 ? '10% Duplex Discount' : '1 sheet per page'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Quantities & Sheet calculation */}
                <div className="pt-2 border-t border-slate-100">
                  {isPerSheetProduct ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1.5">
                        Product Quantity (Units)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={job.productQuantity}
                        onChange={e => setJob({ ...job, productQuantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        className="w-full sm:w-48 px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold font-mono"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Number of Pages in Document
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={job.pagesPerCopy}
                          onChange={e => setJob({ ...job, pagesPerCopy: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold font-mono"
                        />
                        <span className="text-[11px] text-slate-400 mt-1 block">Total printed pages. You can also add writable pages from the document preview.</span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Number of Copies
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={job.copies}
                          onChange={e => setJob({ ...job, copies: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold font-mono"
                        />
                        <span className="text-[11px] text-slate-400 mt-1 block">Total finished sets requested</span>
                      </div>
                    </div>
                  )}

                  {/* Real-time Sheet Formula Pill */}
                  <div className="mt-4 p-4 bg-brand-50/80 rounded-2xl border border-brand-100 text-xs text-brand-900 flex items-center justify-between gap-4">
                    <div>
                      <span className="font-bold block">Paper Optimization Calculation:</span>
                      <span className="text-slate-600 block mt-0.5 text-[11px]">
                        Ceiling({job.pagesPerCopy}p ÷ {job.printSideId === 'double' ? '2 sides' : '1 side'}) × {job.copies} {job.copies === 1 ? 'copy' : 'copies'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xl font-black font-mono text-brand-700 block">
                        {pricingCalculation?.calculationMeta?.physicalSheets || 1}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Physical Sheets</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FORMATTING & FINISHING */}
          {activeStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Document Formatting */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-5">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Document Layout & Typographic Preferences</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Configure how you'd like our commercial print technicians to calibrate your document layout.</p>
                </div>

                {/* Orientation & Columns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-2">Orientation</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['portrait', 'landscape'].map(o => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => setFormatting({ ...formatting, orientation: o })}
                          className={`py-2 px-3 rounded-xl border text-center capitalize transition-all text-xs font-bold ${
                            formatting.orientation === o
                              ? 'border-brand-600 bg-brand-50 text-brand-900 ring-1 ring-brand-500 shadow-xs'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-2">Columns</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setFormatting({ ...formatting, columns: c })}
                          className={`py-2 px-2 rounded-xl border text-center transition-all text-xs font-bold ${
                            formatting.columns === c
                              ? 'border-brand-600 bg-brand-50 text-brand-900 ring-1 ring-brand-500 shadow-xs'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          {c} Col{c > 1 ? 's' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Typography: Family, Size, Style */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">Font Family</label>
                    <select
                      value={formatting.fontFamily}
                      onChange={e => setFormatting({ ...formatting, fontFamily: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                    >
                      <option value="Arial">Arial (Sans-serif)</option>
                      <option value="Times New Roman">Times New Roman (Serif)</option>
                      <option value="Calibri">Calibri (Standard)</option>
                      <option value="Roboto">Roboto (Modern)</option>
                      <option value="Georgia">Georgia (Editorial)</option>
                      <option value="Courier New">Courier New (Mono)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">Font Size</label>
                    <select
                      value={formatting.fontSize}
                      onChange={e => setFormatting({ ...formatting, fontSize: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                    >
                      <option value="10pt">10 pt (Compact)</option>
                      <option value="11pt">11 pt (Standard)</option>
                      <option value="12pt">12 pt (Academic)</option>
                      <option value="14pt">14 pt (Large Print)</option>
                      <option value="16pt">16 pt (Display)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">Font Style</label>
                    <select
                      value={formatting.fontStyle}
                      onChange={e => setFormatting({ ...formatting, fontStyle: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                    >
                      <option value="regular">Regular</option>
                      <option value="bold">Bold</option>
                      <option value="italic">Italic</option>
                    </select>
                  </div>
                </div>

                {/* Margins */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800">
                      Margins ({formatting.margins.unit})
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Presets:</span>
                      <button
                        type="button"
                        onClick={() => applyMarginPreset('normal')}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                      >
                        Normal 1"
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMarginPreset('narrow')}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                      >
                        Narrow 0.5"
                      </button>
                      <button
                        type="button"
                        onClick={() => applyMarginPreset('wide')}
                        className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                      >
                        Wide 1.5"
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {['top', 'bottom', 'left', 'right'].map(side => (
                      <div key={side}>
                        <label className="block text-[10px] text-slate-500 capitalize mb-0.5">{side}</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.2"
                          max="3.0"
                          value={formatting.margins[side]}
                          onChange={e => setFormatting({
                            ...formatting,
                            margins: { ...formatting.margins, [side]: parseFloat(e.target.value) || 0.5 }
                          })}
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 text-center font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alignment & Line Spacing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">Text Alignment</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['left', 'center', 'right', 'justify'].map(a => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setFormatting({ ...formatting, alignment: a })}
                          className={`py-1.5 px-2 rounded-lg border text-center capitalize text-xs ${
                            formatting.alignment === a
                              ? 'border-brand-600 bg-brand-50 font-bold text-brand-900 ring-1 ring-brand-500'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">Line Spacing</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1.0, 1.15, 1.5, 2.0].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setFormatting({ ...formatting, lineSpacing: s })}
                          className={`py-1.5 px-2 rounded-lg border text-center text-xs ${
                            formatting.lineSpacing === s
                              ? 'border-brand-600 bg-brand-50 font-bold text-brand-900 ring-1 ring-brand-500'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* STEP 4: DETAILS, REVIEW & SUBMIT */}
          {activeStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Customer Contact Information */}
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Customer Contact & Fulfillment</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Please provide your details so we can reach you when your order is ready.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Full Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Maria Santos"
                      value={customer.name}
                      onChange={e => setCustomer({ ...customer, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 0917-555-0123"
                      value={customer.phone}
                      onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address (For receipts & status notifications)
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. maria.santos@email.ph"
                      value={customer.email}
                      onChange={e => setCustomer({ ...customer, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Special Instructions for Print Shop (Optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g., Please double check alignment or package with care..."
                      value={customer.notes}
                      onChange={e => setCustomer({ ...customer, notes: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Rush & Delivery Toggles */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isRush}
                        onChange={e => setIsRush(e.target.checked)}
                        className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                      />
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">Rush Priority Service</span>
                        <span className="text-[11px] text-slate-500">Same-day expedited printing (+25%)</span>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isDelivery}
                        onChange={e => setIsDelivery(e.target.checked)}
                        className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                      />
                      <div>
                        <span className="font-bold text-xs text-slate-900 block">Courier Delivery (Optional)</span>
                        <span className="text-[11px] text-slate-500">Doorstep delivery (+₱80.00). Leave unchecked for in-store pickup.</span>
                      </div>
                    </div>
                  </label>
                </div>

                {isDelivery && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Delivery Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Unit #, Street, Barangay, City, Metro Manila"
                      value={deliveryAddress}
                      onChange={e => setDeliveryAddress(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                )}

                {/* Promo Code & Payment method */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Discount Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. PRINT10"
                        value={discountCode}
                        onChange={e => setDiscountCode(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 uppercase font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 transition"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Payment Preference
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                    >
                      <option value="cash">Cash on Pickup / COD</option>
                      <option value="gcash">GCash</option>
                      <option value="maya">Maya</option>
                      <option value="bank_transfer">Bank Transfer (BDO / BPI)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {activeStep > 1 ? (
              <button
                type="button"
                onClick={goToPrevStep}
                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : <div />}

            {activeStep < 4 ? (
              <button
                type="button"
                onClick={goToNextStep}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2"
              >
                <span>Continue to {steps[activeStep].title}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReviewOrder}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Order Now</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Live Preview & Real-Time Price Summary (5 cols) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
          {/* Mobile Tab Switcher (Preview vs Price Breakdown) */}
          <div className="flex lg:hidden bg-slate-200 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setMobileSideTab('summary')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                mobileSideTab === 'summary' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Order Cost (₱{grandTotal.toFixed(2)})
            </button>
            <button
              type="button"
              onClick={() => setMobileSideTab('preview')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                mobileSideTab === 'preview' ? 'bg-white text-brand-700 shadow-xs' : 'text-slate-600'
              }`}
            >
              Document Layout Simulation
            </button>
          </div>

          {/* Desktop shows both, Mobile toggles */}
          <div className={`space-y-6 ${mobileSideTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
            <DocumentPreview
              file={uploadedFiles.length > 0 ? uploadedFiles[0] : null}
              files={uploadedFiles}
              formatting={formatting}
              job={job}
              onTextChange={(pages) => setFormatting(prev => ({ ...prev, customDocumentPages: pages }))}
              onPageCountChange={(pageCount) => setJob(prev => ({
                ...prev,
                pagesPerCopy: pageCount
              }))}
            />
          </div>

          <div className={`${mobileSideTab === 'summary' ? 'block' : 'hidden lg:block'}`}>
            <PricingSummary
              pricingCalculation={pricingCalculation}
              isReviewMode={false}
              onReviewOrder={handleReviewOrder}
              onSubmitOrder={handleSubmitOrder}
              isSubmitting={isSubmitting}
              error={formError}
            />
          </div>
        </div>
      </div>

      {/* Full Pre-Submission Review Modal */}
      <OrderReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        onSubmit={handleSubmitOrder}
        isSubmitting={isSubmitting}
        orderData={{
          customer,
          job,
          formatting,
          files: uploadedFiles,
          isRush,
          isDelivery,
          deliveryAddress,
          paymentMethod
        }}
        pricingCalculation={pricingCalculation}
      />
    </div>
  );
}
