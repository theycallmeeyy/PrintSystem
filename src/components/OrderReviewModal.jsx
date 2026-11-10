import React from 'react';
import { X, CheckCircle2, FileText, User, Printer, Sliders, DollarSign, AlertCircle } from 'lucide-react';

export default function OrderReviewModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  orderData,
  pricingCalculation
}) {
  if (!isOpen) return null;

  const { customer, job, formatting, files, isRush, isDelivery, deliveryAddress, paymentMethod } = orderData;
  const { costs, calculationMeta, lineItems } = pricingCalculation || {};
  const symbol = pricingCalculation?.currencySymbol || '₱';

  const formatPHP = (num) => {
    return `${symbol}${(num || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-500/20 border border-brand-400/30 flex items-center justify-center text-brand-400">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Review Your Print Order</h3>
              <p className="text-xs text-slate-400">Please verify your printing specifications and pricing before submitting</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6 text-sm">
          {/* Customer Details */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-2 text-xs uppercase tracking-wider">
              <User className="w-4 h-4 text-brand-600" />
              Customer Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Full Name:</span>
                <span className="font-semibold text-slate-800">{customer.name || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Contact Phone:</span>
                <span className="font-semibold text-slate-800">{customer.phone || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Email Address:</span>
                <span className="font-semibold text-slate-800">{customer.email || 'Not provided'}</span>
              </div>
            </div>
            {customer.notes && (
              <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-xs">
                <span className="text-slate-500 font-medium">Special Instructions:</span>
                <p className="text-slate-700 italic mt-0.5">{customer.notes}</p>
              </div>
            )}
          </div>

          {/* Job Specifications & File */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Print Specs */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-2">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                <Printer className="w-4 h-4 text-brand-600" />
                Print Job Specifications
              </h4>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Job Service:</span>
                  <span className="font-semibold text-slate-800">{lineItems?.jobType?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paper Size:</span>
                  <span className="font-semibold text-slate-800">{lineItems?.paperSize?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paper Material:</span>
                  <span className="font-semibold text-slate-800">{lineItems?.paperMaterial?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Color Mode:</span>
                  <span className="font-semibold text-slate-800">{lineItems?.colorMode?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Print Sides:</span>
                  <span className="font-semibold text-slate-800">{lineItems?.printSides?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity / Copies:</span>
                  <span className="font-semibold text-slate-800">
                    {calculationMeta?.isPerSheetProduct
                      ? `${calculationMeta?.productQuantity} units`
                      : `${calculationMeta?.pagesPerCopy} pages × ${calculationMeta?.copies} copies`}
                  </span>
                </div>
                <div className="flex justify-between font-medium text-brand-700 pt-1 border-t border-slate-100">
                  <span>Calculated Physical Sheets:</span>
                  <span className="font-bold font-mono">{calculationMeta?.physicalSheets} sheets</span>
                </div>
              </div>
            </div>

            {/* Document Formatting Preferences */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-2">
              <h4 className="font-semibold text-slate-900 flex items-center gap-2 text-xs uppercase tracking-wider">
                <Sliders className="w-4 h-4 text-brand-600" />
                Formatting & Customization
              </h4>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Orientation:</span>
                  <span className="font-semibold text-slate-800 capitalize">{formatting.orientation}</span>
                </div>
                <div className="flex justify-between">
                  <span>Columns:</span>
                  <span className="font-semibold text-slate-800">{formatting.columns} Column{formatting.columns > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span>Font Family:</span>
                  <span className="font-semibold text-slate-800">{formatting.fontFamily}</span>
                </div>
                <div className="flex justify-between">
                  <span>Font Size & Style:</span>
                  <span className="font-semibold text-slate-800 capitalize">{formatting.fontSize} • {formatting.fontStyle}</span>
                </div>
                <div className="flex justify-between">
                  <span>Alignment & Spacing:</span>
                  <span className="font-semibold text-slate-800 capitalize">{formatting.alignment} • {formatting.lineSpacing}x</span>
                </div>
                <div className="flex justify-between">
                  <span>Margins:</span>
                  <span className="font-semibold text-slate-800 font-mono">
                    T:{formatting.margins.top} B:{formatting.margins.bottom} L:{formatting.margins.left} R:{formatting.margins.right} {formatting.margins.unit}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Uploaded File */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-xs">
                  {files && files.length > 0 ? files[0].originalName : 'No file uploaded (print specification only)'}
                </p>
                {files && files.length > 0 && (
                  <p className="text-[11px] text-slate-500 font-mono">
                    {(files[0].size / 1024).toFixed(1)} KB • {files[0].mimetype || 'Document'}
                  </p>
                )}
              </div>
            </div>
            <span className="text-[11px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
              Original Preserved
            </span>
          </div>

          {/* Pricing & Fees Breakdown */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <h4 className="font-semibold text-slate-900 flex items-center gap-2 mb-3 text-xs uppercase tracking-wider">
              <DollarSign className="w-4 h-4 text-brand-600" />
              Financial Breakdown
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Base Printing Cost:</span>
                <span className="font-mono font-medium text-slate-900">{formatPHP(costs?.printingCost)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Paper & Material:</span>
                <span className="font-mono font-medium text-slate-900">{formatPHP(costs?.materialCost)}</span>
              </div>
              {costs?.finishingCost > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Finishing Services:</span>
                  <span className="font-mono font-medium text-slate-900">{formatPHP(costs?.finishingCost)}</span>
                </div>
              )}
              {isRush && (
                <div className="flex justify-between text-amber-700">
                  <span>Rush Priority Service (+25%):</span>
                  <span className="font-mono font-medium">{formatPHP(costs?.rushFee)}</span>
                </div>
              )}
              {isDelivery && (
                <div className="flex justify-between text-slate-600">
                  <span>Delivery ({deliveryAddress}):</span>
                  <span className="font-mono font-medium text-slate-900">{formatPHP(costs?.deliveryFee)}</span>
                </div>
              )}
              {costs?.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount Applied ({costs?.appliedDiscountDesc}):</span>
                  <span className="font-mono font-medium">-{formatPHP(costs?.discountAmount)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline font-bold text-slate-900 text-sm">
                <span>Grand Total (Philippine Peso):</span>
                <span className="text-lg font-black text-brand-600 font-mono">
                  {formatPHP(costs?.grandTotal)}
                </span>
              </div>
            </div>
          </div>

          {/* Status info note */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              Once submitted, your order receives a unique tracking number and enters the print queue as <strong className="text-red-700">🔴 New / Pending</strong>. You can follow live updates as staff moves it to <strong className="text-amber-700">🟡 In Progress</strong> and <strong className="text-emerald-700">🟢 Finished</strong>.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition text-sm"
          >
            Modify Specifications
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold transition flex items-center gap-2 shadow-md hover:shadow-lg text-sm"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting Order...' : 'Confirm & Submit Order'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

