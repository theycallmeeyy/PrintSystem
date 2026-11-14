import React from 'react';
import { X, Printer, Download, CheckSquare, Calendar, User, Phone, MapPin, DollarSign, FileText } from 'lucide-react';
import StatusIndicator from './StatusIndicator';

export default function JobTicketModal({ order, isOpen, onClose }) {
  if (!isOpen || !order) return null;

  const { customer, job, formatting, files, isRush, isDelivery, deliveryAddress, paymentStatus, paymentMethod, pricingSnapshot } = order;
  const costs = pricingSnapshot?.costs || {};
  const meta = pricingSnapshot?.calculationMeta || {};
  const lineItems = pricingSnapshot?.lineItems || {};

  const handlePrint = () => {
    window.print();
  };

  const formatPHP = (num) => {
    const amount = (num || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return <>{amount}<span className="font-sans">₱</span></>;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Container */}
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Screen Controls Header (Hidden during actual print) */}
        <div className="print:hidden bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5 text-brand-400" />
            <div>
              <h3 className="font-bold text-sm">Print Shop Job Ticket & Work Order</h3>
              <p className="text-[11px] text-slate-400">Attach to physical print job stack or provide to customer as receipt</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Ticket</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Ticket Area */}
        <div className="p-8 print:p-0 max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible text-slate-900 bg-white">
          {/* Ticket Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-5 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-2xl tracking-tight text-slate-900">PRINT PLUS</span>
                <span className="text-xs bg-slate-900 text-white font-bold px-2 py-0.5 rounded font-mono">
                  JOB TICKET
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">Commercial Printing & Digital Finishing Services</p>
              <p className="text-[10px] text-slate-400">Tel: (02) 8888-PRINT • printplus.shop</p>
            </div>

            <div className="text-right">
              <span className="text-2xl font-black font-mono tracking-tight text-slate-900 block">
                {order.id}
              </span>
              <div className="mt-1 flex items-center justify-end gap-1.5">
                <StatusIndicator status={order.status} size="sm" showLabel={true} />
              </div>
              <span className="text-[10px] text-slate-500 block mt-1 font-mono">
                {new Date(order.createdAt).toLocaleString('en-PH')}
              </span>
            </div>
          </div>

          {/* Customer & Delivery Section */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 mb-5 text-xs">
            <div>
              <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block mb-1">
                Customer Information
              </span>
              <p className="font-bold text-slate-900 text-sm">{customer.name}</p>
              <p className="text-slate-600">{customer.phone || 'No phone'}</p>
              <p className="text-slate-600">{customer.email || 'No email'}</p>
            </div>

            <div>
              <span className="font-bold text-slate-500 text-[10px] uppercase tracking-wider block mb-1">
                Fulfillment & Method
              </span>
              <p className="font-semibold text-slate-900">
                {isDelivery ? '🚚 Courier Doorstep Delivery' : '🏪 In-Store Shop Pickup'}
              </p>
              {isDelivery && deliveryAddress && (
                <p className="text-slate-600 text-[11px] mt-0.5">{deliveryAddress}</p>
              )}
              {isRush && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[10px]">
                  ⚡ RUSH SAME-DAY PRIORITY
                </span>
              )}
            </div>
          </div>

          {/* Operator Technical Specifications */}
          <div className="border border-slate-200 rounded-xl p-4 mb-5 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-1.5">
              Press & Paper Specifications
            </h4>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[10px]">Job Service:</span>
                <span className="font-bold text-slate-800">{lineItems?.jobType?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Paper Size:</span>
                <span className="font-bold text-slate-800">{lineItems?.paperSize?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Stock Material:</span>
                <span className="font-bold text-slate-800">{lineItems?.paperMaterial?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Color Mode:</span>
                <span className="font-bold text-slate-800">{lineItems?.colorMode?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Duplex / Sides:</span>
                <span className="font-bold text-slate-800">{lineItems?.printSides?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Quantity / Copies:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {meta.isPerSheetProduct ? `${meta.productQuantity} items` : `${meta.pagesPerCopy} pages × ${meta.copies} copies`}
                </span>
              </div>
            </div>

            {/* Calculated Physical Sheets Box */}
            <div className="p-2.5 bg-brand-50 rounded-lg border border-brand-100 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-brand-900 block">Required Physical Sheets:</span>
                <span className="text-slate-600 text-[10px]">
                  Formula: Ceiling({meta.pagesPerCopy || 1} ÷ {lineItems?.printSides?.sidesPerSheet || 1}) × {meta.copies || 1}
                </span>
              </div>
              <span className="text-xl font-black font-mono text-brand-700">
                {meta.physicalSheets} SHEETS
              </span>
            </div>
          </div>

          {/* Formatting Directives for Technicians */}
          <div className="border border-slate-200 rounded-xl p-4 mb-5 text-xs space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-1.5">
              Formatting Directives
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-700">
              <div>
                <span className="text-slate-400 block text-[10px]">Orientation:</span>
                <span className="font-semibold capitalize">{formatting?.orientation}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Columns:</span>
                <span className="font-semibold">{formatting?.columns} Column(s)</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Typography:</span>
                <span className="font-semibold">{formatting?.fontFamily} ({formatting?.fontSize})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Margins:</span>
                <span className="font-semibold font-mono">
                  T:{formatting?.margins?.top}" B:{formatting?.margins?.bottom}" L:{formatting?.margins?.left}" R:{formatting?.margins?.right}"
                </span>
              </div>
            </div>
            {customer.notes && (
              <div className="p-2 bg-amber-50 rounded border border-amber-200 text-amber-900 text-[11px] mt-2">
                <strong>Customer Notes:</strong> "{customer.notes}"
              </div>
            )}
          </div>

          {/* Post-Print Finishing Checklist for Shop Technicians */}
          <div className="border border-slate-200 rounded-xl p-4 mb-5 text-xs space-y-2">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-1.5">
              Finishing Services Checklist
            </h4>
            {lineItems?.finishing && lineItems.finishing.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {lineItems.finishing.map(f => (
                  <div key={f.id} className="flex items-center gap-2 p-1.5 bg-slate-50 rounded border border-slate-200 font-medium text-slate-800">
                    <span className="w-4 h-4 border-2 border-slate-400 rounded flex items-center justify-center bg-white" />
                    <span>{f.name} ({f.unitDesc})</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-[11px]">No additional finishing services requested.</p>
            )}
          </div>

          {/* Pricing & Billing Line Items */}
          <div className="border border-slate-200 rounded-xl p-4 mb-5 text-xs space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-100 pb-1.5">
              Billing & Payment Summary
            </h4>
            <div className="flex justify-between text-slate-600">
              <span>Base Printing:</span>
              <span className="font-mono">{formatPHP(costs.printingCost)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Paper & Stock Material:</span>
              <span className="font-mono">{formatPHP(costs.materialCost)}</span>
            </div>
            {costs.finishingCost > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Finishing Services:</span>
                <span className="font-mono">{formatPHP(costs.finishingCost)}</span>
              </div>
            )}
            {costs.rushFee > 0 && (
              <div className="flex justify-between text-amber-800 font-medium">
                <span>Rush Surcharge:</span>
                <span className="font-mono">{formatPHP(costs.rushFee)}</span>
              </div>
            )}
            {costs.deliveryFee > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Delivery Charge:</span>
                <span className="font-mono">{formatPHP(costs.deliveryFee)}</span>
              </div>
            )}
            {costs.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Discount ({costs.appliedDiscountDesc}):</span>
                <span className="font-mono">-{formatPHP(costs.discountAmount)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-300 flex justify-between items-baseline font-black text-sm text-slate-900">
              <span>GRAND TOTAL:</span>
              <span className="text-base font-mono font-black">{formatPHP(costs.grandTotal)}</span>
            </div>
            <div className="pt-1 flex justify-between text-[11px] text-slate-500">
              <span>Payment Status: <strong className="uppercase font-mono text-slate-800">{paymentStatus || 'UNPAID'}</strong> ({paymentMethod || 'CASH'})</span>
              <span>All amounts in Philippine Peso (₱)</span>
            </div>
          </div>

          {/* Signatures & Release Stamp */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t-2 border-dashed border-slate-300 text-[10px] text-slate-500">
            <div>
              <p className="font-semibold mb-6">Printed By (Tech):</p>
              <div className="border-b border-slate-400" />
            </div>
            <div>
              <p className="font-semibold mb-6">Quality Inspected By:</p>
              <div className="border-b border-slate-400" />
            </div>
            <div>
              <p className="font-semibold mb-6">Customer / Received By:</p>
              <div className="border-b border-slate-400" />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="print:hidden bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>Print Job Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
}
