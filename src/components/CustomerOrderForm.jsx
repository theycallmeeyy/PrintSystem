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
import { toClientLocalIsoTimestamp } from '../utils/clientDateTime';

export default function CustomerOrderForm({
  pricingConfig,
  privacyConsent,
  onOrderCreated,
  onTrackOrder
}) {
  // Active wizard step (1: Upload & Layout, 2: Paper & Quantity, 3: Details & Review)
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
    pageBorder: 'none',
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

  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [previewFileIndex, setPreviewFileIndex] = useState(0);
  const [activeServiceSlide, setActiveServiceSlide] = useState(0);
  const [activePaperSizeSlide, setActivePaperSizeSlide] = useState(0);
  const [activeMaterialSlide, setActiveMaterialSlide] = useState(0);

  // Real-time calculated pricing
  const [pricingCalculation, setPricingCalculation] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [formError, setFormError] = useState(null);
  const [submittedOrder, setSubmittedOrder] = useState(null);

  const fileInputRef = useRef(null);
  const documentPreviewRef = useRef(null);
  const serviceCarouselRef = useRef(null);
  const paperSizeCarouselRef = useRef(null);
  const materialCarouselRef = useRef(null);

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

  const uploadSelectedFiles = async (files) => {
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

  const handleFileUpload = (e) => {
    uploadSelectedFiles(e.target.files);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDraggingFiles(false);
    uploadSelectedFiles(e.dataTransfer.files);
  };

  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const scrollToService = (index) => {
    const serviceCount = pricingConfig?.jobTypes?.length || 0;
    if (!serviceCount || !serviceCarouselRef.current) return;

    const nextIndex = Math.max(0, Math.min(serviceCount - 1, index));
    const card = serviceCarouselRef.current.children[nextIndex];
    if (!card) return;

    serviceCarouselRef.current.scrollTo({ left: card.offsetLeft, behavior: 'smooth' });
    setActiveServiceSlide(nextIndex);
  };

  const handleServiceCarouselScroll = () => {
    const carousel = serviceCarouselRef.current;
    if (!carousel) return;

    const carouselCenter = carousel.scrollLeft + carousel.clientWidth / 2;
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    Array.from(carousel.children).forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(carouselCenter - cardCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    setActiveServiceSlide(nearestIndex);
  };

  const scrollToPaperSize = (index) => {
    const paperSizes = pricingConfig?.paperSizes || [];
    const carousel = paperSizeCarouselRef.current;
    if (!paperSizes.length || !carousel) return;

    const nextIndex = Math.max(0, Math.min(paperSizes.length - 1, index));
    const card = carousel.children[nextIndex];
    if (!card) return;

    carousel.scrollTo({ left: card.offsetLeft, behavior: 'smooth' });
    setActivePaperSizeSlide(nextIndex);
  };

  const handlePaperSizeCarouselScroll = () => {
    const carousel = paperSizeCarouselRef.current;
    if (!carousel) return;

    const carouselCenter = carousel.scrollLeft + carousel.clientWidth / 2;
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    Array.from(carousel.children).forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(carouselCenter - cardCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    setActivePaperSizeSlide(nearestIndex);
  };

  const scrollToMaterial = (index) => {
    const materials = pricingConfig?.paperMaterials || [];
    const carousel = materialCarouselRef.current;
    if (!materials.length || !carousel) return;

    const nextIndex = Math.max(0, Math.min(materials.length - 1, index));
    const card = carousel.children[nextIndex];
    if (!card) return;

    carousel.scrollTo({ left: card.offsetLeft, behavior: 'smooth' });
    setActiveMaterialSlide(nextIndex);
  };

  const handleMaterialCarouselScroll = () => {
    const carousel = materialCarouselRef.current;
    if (!carousel) return;

    const carouselCenter = carousel.scrollLeft + carousel.clientWidth / 2;
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    Array.from(carousel.children).forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(carouselCenter - cardCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    setActiveMaterialSlide(nearestIndex);
  };

  const handleApplyPromo = () => {
    if (!discountCode.trim()) {
      setAppliedPromo('');
      return;
    }
    setAppliedPromo(discountCode.trim().toUpperCase());
  };

  const validateStep = (step) => {
    setFormError(null);
    if (step === 3) {
      if (isDelivery && !deliveryAddress.trim()) {
        setFormError('Please provide a complete delivery address.');
        return false;
      }
    }
    return true;
  };

  const goToNextStep = () => {
    if (validateStep(activeStep)) {
      const nextStep = Math.min(3, activeStep + 1);
      setActiveStep(nextStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrevStep = () => {
    setFormError(null);
    const previousStep = Math.max(1, activeStep - 1);
    setActiveStep(previousStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReviewOrder = () => {
    if (!privacyConsent?.accepted) {
      setFormError('Please accept the build3x privacy agreement before submitting your order.');
      return;
    }
    if (!validateStep(4)) return;
    setIsReviewModalOpen(true);
  };

  const handleSubmitOrder = async () => {
    if (!privacyConsent?.accepted) {
      setFormError('Please accept the build3x privacy agreement before submitting your order.');
      setIsReviewModalOpen(false);
      return;
    }

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
        paymentMethod,
        privacyConsent: {
          ...privacyConsent,
          orderSubmittedAtClient: toClientLocalIsoTimestamp(new Date())
        }
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
  const showRightRail = activeStep === 3;

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
          Estimated Total: <strong className="text-slate-800 font-mono text-sm">{submittedOrder.pricingSnapshot?.costs?.grandTotal?.toFixed(2)}<span className="font-sans">₱</span></strong>. You can follow live updates with the colored status indicator without refreshing.
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
    { number: 1, title: 'Upload & Layout', subtitle: 'Add a file & preview' },
    { number: 2, title: 'Paper & Quantity', subtitle: 'Sizes, stock & sheets' },
    { number: 3, title: 'Details & Review', subtitle: 'Contact & submit' },
  ];
  const jobTypes = pricingConfig?.jobTypes || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Modern dropdown sidebar step navigation */}
      <div className="mb-8">
        <div className="bg-white rounded-[28px] border border-slate-200/90 shadow-[0_14px_30px_rgba(15,23,42,0.06)] overflow-hidden">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(open => !open)}
            className="w-full flex items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-white px-4 py-4 sm:px-5 text-left transition hover:bg-slate-50"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-600 text-sm font-black text-white shadow-lg shadow-brand-500/25">
                {activeStep}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Current step</p>
                <p className="truncate text-base font-bold text-slate-900">{steps[activeStep - 1].title}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-500">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">Menu</span>
              <ChevronRight className={`h-4 w-4 transition-transform ${isSidebarOpen ? 'rotate-90' : ''}`} />
            </div>
          </button>

          {isSidebarOpen && (
            <div className="border-t border-slate-200/80 bg-slate-50/60 p-3 sm:p-4">
              <div className="space-y-2">
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
                        }
                      }}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
                        isActive
                          ? 'border-brand-200 bg-brand-50 text-brand-900 shadow-[inset_0_0_0_1px_rgba(14,165,233,0.1)]'
                          : isPast
                          ? 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100'
                          : 'border-transparent bg-transparent text-slate-400 hover:bg-white hover:text-slate-600'
                      }`}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black shrink-0 ${
                        isActive
                          ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                          : isPast
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}>
                        {isPast ? <Check className="h-4 w-4 stroke-[2.5]" /> : step.number}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`block text-sm font-bold truncate ${isActive ? 'text-brand-900' : 'text-slate-800'}`}>
                            {step.title}
                          </span>
                          {isPast && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-emerald-700">Done</span>}
                        </div>
                        <span className="mt-0.5 block text-[11px] text-slate-400 truncate">
                          {step.subtitle}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
        {/* Left Column: Active Step Form */}
        <div className={`${showRightRail ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-6`}>

          {/* STEP 1: UPLOAD & LAYOUT */}
          {activeStep === 1 && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              {/* Job Service Selection */}
              <div className="order-3 bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Choose a print service</h2>
                    <p className="text-xs text-slate-500 mt-0.5">What type of document or product would you like to print today?</p>
                  </div>
                  {jobTypes.length > 1 && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => scrollToService(activeServiceSlide - 1)}
                        disabled={activeServiceSlide === 0}
                        aria-label="Previous print service"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => scrollToService(activeServiceSlide + 1)}
                        disabled={activeServiceSlide >= jobTypes.length - 1}
                        aria-label="Next print service"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div
                  ref={serviceCarouselRef}
                  onScroll={handleServiceCarouselScroll}
                  className="relative -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  aria-label="Print services"
                >
                  {jobTypes.map((j, index) => {
                    const isSelected = job.jobTypeId === j.id;
                    const selectedPaperSize = pricingConfig?.paperSizes?.find(size => size.id === job.paperSizeId);
                    const configuredDocumentRate = selectedPaperSize?.documentRates?.[job.colorModeId];
                    const displayRate = j.id === 'document' && Number.isFinite(configuredDocumentRate)
                      ? <>{configuredDocumentRate.toFixed(2)}<span className="font-sans">₱</span> / page print</>
                      : <>{j.baseRatePerPage?.toFixed(2)}<span className="font-sans">₱</span> {j.isPerSheetProduct ? '/ item' : '/ page'}</>;
                    return (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => {
                          setJob(prev => ({ ...prev, jobTypeId: j.id }));
                          setActiveServiceSlide(index);
                        }}
                        className={`relative flex min-h-36 w-[84%] shrink-0 snap-start flex-col justify-center rounded-2xl border p-4 text-left transition-all duration-200 sm:w-[48%] lg:w-[32%] ${
                          isSelected
                            ? 'border-brand-500 bg-gradient-to-br from-brand-50 to-white text-brand-900 shadow-[0_8px_24px_rgba(2,132,199,0.12)] ring-1 ring-brand-400/50'
                            : 'border-slate-200 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md'
                        }`}
                        aria-pressed={isSelected}
                      >
                        {isSelected && (
                          <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm">
                            ✓
                          </span>
                        )}
                        <span className="block pr-6 text-sm font-bold text-slate-900">{j.name}</span>
                        <span className="mt-1 block line-clamp-2 min-h-9 text-xs leading-relaxed text-slate-500">{j.description}</span>
                        <span className="mt-3 block text-xs font-bold text-brand-700">
                          {displayRate}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {jobTypes.length > 1 && (
                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex items-center gap-1.5" aria-label="Choose print service slide">
                      {jobTypes.map((service, index) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => scrollToService(index)}
                          aria-label={`Show ${service.name}`}
                          aria-current={activeServiceSlide === index ? 'true' : undefined}
                          className={`h-1.5 rounded-full transition-all ${
                            activeServiceSlide === index ? 'w-6 bg-brand-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-medium tabular-nums text-slate-400">
                      {activeServiceSlide + 1} / {jobTypes.length}
                    </span>
                  </div>
                )}
              </div>

              {/* File Upload Box */}
              <div className="order-1 bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 text-xs font-black text-brand-700 ring-1 ring-brand-100">01</span>
                      <h2 className="text-base font-bold text-slate-900">Upload a design or document</h2>
                    </div>
                    <p className="ml-[42px] text-xs text-slate-500 mt-0.5">Start by adding the file you want us to print. Your original stays unchanged.</p>
                  </div>
                  <span className="hidden sm:inline-flex text-[11px] bg-slate-100 text-slate-600 font-mono px-2.5 py-1 rounded-full">
                    Max 1000MB per file
                  </span>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Select or drop design and document files to upload"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragEnter={e => {
                    e.preventDefault();
                    setIsDraggingFiles(true);
                  }}
                  onDragOver={e => {
                    e.preventDefault();
                    setIsDraggingFiles(true);
                  }}
                  onDragLeave={e => {
                    e.preventDefault();
                    setIsDraggingFiles(false);
                  }}
                  onDrop={handleFileDrop}
                  className={`group cursor-pointer rounded-2xl border-2 border-dashed p-7 sm:p-9 text-center transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-brand-100 ${
                    isDraggingFiles
                      ? 'border-brand-500 bg-brand-50 shadow-inner'
                      : 'border-slate-300 bg-slate-50/70 hover:border-brand-400 hover:bg-brand-50/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp,.svg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-14 h-14 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-3 text-brand-600 group-hover:-translate-y-0.5 group-hover:shadow-md transition-all">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-sm sm:text-base text-slate-800">
                    {isUploading ? 'Uploading your files…' : isDraggingFiles ? 'Drop your files to upload' : 'Choose a file or drag it here'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5">
                    Supports PDF, Word (DOCX/DOC), JPEG, PNG, WEBP, SVG
                  </p>
                  <p className="sm:hidden text-[10px] text-slate-400 mt-2">Maximum 1000MB per file</p>
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
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewFileIndex(idx);
                            documentPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className="flex min-w-0 flex-1 items-center gap-2.5 truncate text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                          aria-label={`Preview ${f.originalName}`}
                        >
                          <FileText className="w-5 h-5 text-brand-600 shrink-0" />
                          <div className="truncate">
                            <p className="font-bold text-slate-800 truncate">{f.originalName}</p>
                            <p className="text-slate-400 text-[11px] font-mono">
                              {(f.size / 1024).toFixed(1)} KB • {f.mimetype || 'Document'}
                            </p>
                          </div>
                        </button>
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

              {/* Document layout preview */}
              <div ref={documentPreviewRef} className="order-2 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm scroll-mt-6">
                <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-black text-indigo-700 ring-1 ring-indigo-100">02</span>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-slate-900">Document layout preview</h2>
                    <p className="mt-0.5 text-xs text-slate-500">Preview your file, then use the compact tools below the page to adjust your editable layout.</p>
                  </div>
                </div>
                <div className="p-3 sm:p-4">
                  <DocumentPreview
                    file={uploadedFiles.length > 0 ? uploadedFiles[0] : null}
                    files={uploadedFiles}
                    selectedFileIndex={previewFileIndex}
                    onSelectedFileIndexChange={setPreviewFileIndex}
                    formatting={formatting}
                    job={job}
                    paperSizes={pricingConfig?.paperSizes || []}
                    onPaperSizeChange={paperSizeId => setJob(prev => ({ ...prev, paperSizeId }))}
                    onTextChange={(pages, pageRuns) => setFormatting(prev => ({
                      ...prev,
                      customDocumentPages: pages,
                      customDocumentPageRuns: pageRuns
                    }))}
                    onFormattingChange={setFormatting}
                    onPageCountChange={pageCount => setJob(prev => ({ ...prev, pagesPerCopy: pageCount }))}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PAPER & QUANTITIES */}
          {activeStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Paper Size & Dimensions</h2>
                    <p className="mt-0.5 text-xs text-slate-500">Select a standard paper size or customize dimensions. Swipe to explore.</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => scrollToPaperSize(activePaperSizeSlide - 1)}
                      disabled={activePaperSizeSlide === 0}
                      aria-label="Previous paper size"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollToPaperSize(activePaperSizeSlide + 1)}
                      disabled={activePaperSizeSlide >= (pricingConfig?.paperSizes?.length || 1) - 1}
                      aria-label="Next paper size"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div
                  ref={paperSizeCarouselRef}
                  onScroll={handlePaperSizeCarouselScroll}
                  className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  aria-label="Paper size options"
                >
                  {(pricingConfig?.paperSizes || []).map((s, index) => {
                    const isSelected = job.paperSizeId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setJob(prev => ({ ...prev, paperSizeId: s.id }));
                          setActivePaperSizeSlide(index);
                        }}
                        aria-pressed={isSelected}
                        className={`min-h-[82px] w-[38%] shrink-0 snap-start rounded-2xl border px-3 py-2.5 text-center transition-all sm:w-[25%] lg:w-[18%] ${
                          isSelected
                            ? 'border-brand-600 bg-brand-50 font-bold text-brand-900 shadow-xs ring-1 ring-brand-500'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="block text-xs font-bold">{s.id}</span>
                        <span className="block text-[10px] text-slate-500 mt-0.5">
                          {s.surcharge > 0 ? <>+{s.surcharge.toFixed(2)}<span className="font-sans">₱</span></> : 'Standard'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {(pricingConfig?.paperSizes?.length || 0) > 1 && (
                  <div className="-mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-1.5" aria-label="Choose paper size slide">
                      {pricingConfig.paperSizes.map((paperSize, index) => (
                        <button
                          key={paperSize.id}
                          type="button"
                          onClick={() => scrollToPaperSize(index)}
                          aria-label={`Show ${paperSize.id} paper size`}
                          aria-current={activePaperSizeSlide === index ? 'true' : undefined}
                          className={`h-1.5 rounded-full transition-all ${
                            activePaperSizeSlide === index ? 'w-6 bg-brand-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-medium tabular-nums text-slate-400">
                      {activePaperSizeSlide + 1} / {pricingConfig.paperSizes.length}
                    </span>
                  </div>
                )}

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
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Paper Material & Stock</h3>
                      <p className="text-xs text-slate-500">Charged per physical sheet consumed. Swipe to explore.</p>
                    </div>
                    {(pricingConfig?.paperMaterials?.length || 0) > 1 && (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => scrollToMaterial(activeMaterialSlide - 1)}
                          disabled={activeMaterialSlide === 0}
                          aria-label="Previous paper material"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollToMaterial(activeMaterialSlide + 1)}
                          disabled={activeMaterialSlide >= (pricingConfig?.paperMaterials?.length || 1) - 1}
                          aria-label="Next paper material"
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div
                    ref={materialCarouselRef}
                    onScroll={handleMaterialCarouselScroll}
                    className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    aria-label="Paper material options"
                  >
                    {(pricingConfig?.paperMaterials || []).map((m, index) => {
                      const isSelected = job.paperMaterialId === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setJob(prev => ({ ...prev, paperMaterialId: m.id }));
                            setActiveMaterialSlide(index);
                          }}
                          aria-pressed={isSelected}
                          className={`flex min-h-[92px] w-[84%] shrink-0 snap-start items-center justify-between rounded-2xl border p-3 text-left transition-all sm:w-[48%] ${
                            isSelected
                              ? 'border-brand-600 bg-brand-50/80 ring-1 ring-brand-500 text-brand-900 shadow-xs'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <span className="block text-xs font-bold">{m.name}</span>
                            <span className="block text-[11px] text-slate-500">{m.description}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-900 pl-2 shrink-0">
                            +{m.pricePerSheet?.toFixed(2)}<span className="font-sans">₱</span>/sh
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {(pricingConfig?.paperMaterials?.length || 0) > 1 && (
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5" aria-label="Choose paper material slide">
                        {pricingConfig.paperMaterials.map((material, index) => (
                          <button
                            key={material.id}
                            type="button"
                            onClick={() => scrollToMaterial(index)}
                            aria-label={`Show ${material.name}`}
                            aria-current={activeMaterialSlide === index ? 'true' : undefined}
                            className={`h-1.5 rounded-full transition-all ${
                              activeMaterialSlide === index ? 'w-6 bg-brand-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-medium tabular-nums text-slate-400">
                        {activeMaterialSlide + 1} / {pricingConfig.paperMaterials.length}
                      </span>
                    </div>
                  )}
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
                                ? <>{documentRate.toFixed(2)}<span className="font-sans">₱</span>/page print</>
                                : c.surchargePerPage > 0 ? <>+{c.surchargePerPage.toFixed(2)}<span className="font-sans">₱</span>/p</> : 'Standard'}
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

          {/* STEP 3: DETAILS, REVIEW & SUBMIT */}
          {activeStep === 3 && (
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
                        <span className="text-[11px] text-slate-500">Doorstep delivery (+80.00₱). Leave unchecked for in-store pickup.</span>
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

            {activeStep < 3 && (
              <button
                type="button"
                onClick={goToNextStep}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2"
              >
                <span>Continue to {steps[activeStep].title}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {showRightRail && (
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-20">
            <PricingSummary
              pricingCalculation={pricingCalculation}
              isReviewMode={false}
              onReviewOrder={handleReviewOrder}
              onSubmitOrder={handleSubmitOrder}
              isSubmitting={isSubmitting}
              error={formError}
            />
          </div>
        )}
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
          paymentMethod,
          privacyConsent
        }}
        canSubmitOrder={privacyConsent?.accepted === true}
        pricingCalculation={pricingCalculation}
      />
    </div>
  );
}
