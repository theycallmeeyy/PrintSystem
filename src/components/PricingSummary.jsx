import React from 'react';
import { Tag, Zap, Truck, CheckCircle2, ShieldCheck, HelpCircle } from 'lucide-react';

export default function PricingSummary({
  pricingCalculation,
  isReviewMode = false,
  onReviewOrder,
  onSubmitOrder,
  isSubmitting = false,
  error = null,
  className = ''
}) {
  if (!pricingCalculation || !pricingCalculation.costs) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <p className="text-slate-400 text-sm text-center">Calculating estimate...</p>
      </div>
    );
  }

  const { costs, calculationMeta, lineItems } = pricingCalculation;
  const symbol = pricingCalculation.currencySymbol || '₱';

  const formatPHP = (num) => {
    return `${symbol}${(num || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-lg shadow-slate-100/50 p-6 flex flex-col justify-between ${className}`}>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Order Cost Breakdown</h3>
            <p className="text-xs text-slate-500">Live dynamic calculation in Philippine Peso</p>
          </div>
          <span className="bg-brand-50 text-brand-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-brand-100">
            Auto-Updated
          </span>
        </div>

        {/* Calculation Metrics Pill */}
        <div className="my-4 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1.5">
          <div className="flex justify-between text-slate-600">
            <span>Job Type:</span>
            <span className="font-semibold text-slate-800">{lineItems.jobType?.name}</span>
          </div>
          {calculationMeta.isPerSheetProduct ? (
            <div className="flex justify-between text-slate-600">
              <span>Product Quantity:</span>
              <span className="font-semibold text-slate-800">{calculationMeta.productQuantity} units</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-slate-600">
                <span>Pages & Copies:</span>
                <span className="font-semibold text-slate-800">
                  {calculationMeta.pagesPerCopy} pages × {calculationMeta.copies} {calculationMeta.copies === 1 ? 'copy' : 'copies'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Sides per Sheet:</span>
                <span className="font-semibold text-slate-800">
                  {lineItems.printSides?.name}
                </span>
              </div>
              <div className="flex justify-between text-brand-700 font-medium pt-1 border-t border-slate-200/60">
                <span>Required Physical Sheets:</span>
                <span className="font-bold font-mono">
                  {calculationMeta.physicalSheets} sheet{calculationMeta.physicalSheets === 1 ? '' : 's'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Detailed Itemized Line Items */}
        <div className="space-y-2.5 py-2 text-sm">
          {/* Base Printing Cost */}
          <div className="flex items-center justify-between text-slate-700">
            <span className="flex items-center gap-1.5">
              <span>Base Printing Cost</span>
              <span className="text-[11px] text-slate-400">
                ({calculationMeta.isPerSheetProduct ? `${calculationMeta.productQuantity} items` : `${calculationMeta.totalBillableImpressions} impressions`})
              </span>
            </span>
            <span className="font-semibold text-slate-900 font-mono">
              {formatPHP(costs.printingCost)}
            </span>
          </div>

          {/* Paper and Material Cost */}
          <div className="flex items-center justify-between text-slate-700">
            <span className="flex items-center gap-1.5">
              <span>Paper & Material Cost</span>
              <span className="text-[11px] text-slate-400">
                ({lineItems.paperMaterial?.name} × {calculationMeta.physicalSheets} sheets)
              </span>
            </span>
            <span className="font-semibold text-slate-900 font-mono">
              {formatPHP(costs.materialCost)}
            </span>
          </div>

          {/* Additional Finishing Services */}
          {costs.finishingCost > 0 && (
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-medium text-slate-800">Finishing Services:</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {formatPHP(costs.finishingCost)}
                </span>
              </div>
              {lineItems.finishing?.map(f => (
                <div key={f.id} className="flex items-center justify-between pl-3 text-xs text-slate-500">
                  <span>• {f.name} ({f.unitDesc})</span>
                  <span className="font-mono">{formatPHP(f.total)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Setup Fee if applicable */}
          {costs.setupFee > 0 && (
            <div className="flex items-center justify-between text-slate-700">
              <span>Shop Setup Fee</span>
              <span className="font-semibold text-slate-900 font-mono">
                {formatPHP(costs.setupFee)}
              </span>
            </div>
          )}

          {/* Rush Fee if applicable */}
          {costs.rushFee > 0 && (
            <div className="flex items-center justify-between text-amber-700 bg-amber-50/70 px-2.5 py-1.5 rounded-lg border border-amber-100">
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <Zap className="w-3.5 h-3.5" />
                <span>Rush Priority Service (+25%)</span>
              </span>
              <span className="font-bold font-mono text-xs">
                {formatPHP(costs.rushFee)}
              </span>
            </div>
          )}

          {/* Delivery Fee if applicable */}
          {costs.deliveryFee > 0 && (
            <div className="flex items-center justify-between text-slate-700">
              <span className="flex items-center gap-1.5 text-xs">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                <span>Standard Delivery Fee</span>
              </span>
              <span className="font-semibold text-slate-900 font-mono">
                {formatPHP(costs.deliveryFee)}
              </span>
            </div>
          )}

          <div className="border-t border-slate-200/80 my-2 pt-2" />

          {/* Subtotal */}
          <div className="flex items-center justify-between text-slate-800 font-medium">
            <span>Subtotal</span>
            <span className="font-bold font-mono text-slate-900">
              {formatPHP(costs.subtotal)}
            </span>
          </div>

          {/* Discounts */}
          {costs.discountAmount > 0 && (
            <div className="flex items-center justify-between text-emerald-600 bg-emerald-50/80 px-2.5 py-1.5 rounded-lg border border-emerald-100">
              <span className="flex items-center gap-1 text-xs font-medium">
                <Tag className="w-3.5 h-3.5" />
                <span>Discount ({costs.appliedDiscountDesc})</span>
              </span>
              <span className="font-bold font-mono text-xs">
                -{formatPHP(costs.discountAmount)}
              </span>
            </div>
          )}

          {/* Tax */}
          {costs.taxAmount > 0 && (
            <div className="flex items-center justify-between text-slate-600 text-xs">
              <span>Value-Added Tax (VAT {costs.taxRatePercent}%)</span>
              <span className="font-mono">{formatPHP(costs.taxAmount)}</span>
            </div>
          )}
        </div>

        {/* Grand Total Box */}
        <div className="mt-4 p-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl text-white shadow-inner">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-300 font-semibold">
                Grand Total
              </span>
              <p className="text-[11px] text-slate-400">Estimated until staff inspection</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono tracking-tight text-white">
                {formatPHP(costs.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {error}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
        {!isReviewMode ? (
          <button
            type="button"
            onClick={onReviewOrder}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
          >
            <span>Order Now</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmitOrder}
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{isSubmitting ? 'Submitting Order...' : 'Confirm & Submit Order'}</span>
          </button>
        )}

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Locked price snapshot saved upon submission</span>
        </div>
      </div>
    </div>
  );
}
