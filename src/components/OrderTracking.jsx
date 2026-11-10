import React, { useState, useEffect } from 'react';
import {
  Search, Package, CheckCircle2, Clock, AlertTriangle,
  ArrowRight, RefreshCw, Printer, DollarSign, Calendar
} from 'lucide-react';
import StatusIndicator from './StatusIndicator';
import JobTicketModal from './JobTicketModal';
import { fetchOrderById, acceptOrderQuote } from '../services/api';
import { getSocket } from '../services/socket';

export default function OrderTracking({ initialOrderId = '', onNavigateToNewOrder }) {
  const [searchId, setSearchId] = useState(initialOrderId);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAcceptingQuote, setIsAcceptingQuote] = useState(false);
  const [quoteMessage, setQuoteMessage] = useState(null);
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('printplus_recent_orders') || '[]');
      setRecentOrders(stored);
    } catch (e) {}
  }, []);

  // Auto-search if initialOrderId provided
  useEffect(() => {
    if (initialOrderId) {
      setSearchId(initialOrderId);
      handleSearch(initialOrderId);
    }
  }, [initialOrderId]);

  // Real-time socket listener for status changes
  useEffect(() => {
    const socket = getSocket();

    const handleOrderUpdate = (updatedOrder) => {
      if (currentOrder && updatedOrder.id === currentOrder.id) {
        console.log('[Real-time] Order updated in tracking view:', updatedOrder);
        setCurrentOrder(updatedOrder);
      }
    };

    const handleStatusChanged = ({ orderId, status, order }) => {
      if (currentOrder && orderId === currentOrder.id) {
        console.log(`[Real-time] Status changed for ${orderId} -> ${status}`);
        setCurrentOrder(order);
      }
    };

    socket.on('order:updated', handleOrderUpdate);
    socket.on('order:status_changed', handleStatusChanged);
    socket.on('order:quote_revised', handleOrderUpdate);
    socket.on('order:quote_accepted', handleOrderUpdate);

    return () => {
      socket.off('order:updated', handleOrderUpdate);
      socket.off('order:status_changed', handleStatusChanged);
      socket.off('order:quote_revised', handleOrderUpdate);
      socket.off('order:quote_accepted', handleOrderUpdate);
    };
  }, [currentOrder]);

  const handleSearch = async (orderIdToSearch) => {
    const id = (orderIdToSearch || searchId).trim().toUpperCase();
    if (!id) return;

    setIsLoading(true);
    setError(null);
    setQuoteMessage(null);

    try {
      const order = await fetchOrderById(id);
      setCurrentOrder(order);
      // Join socket room for this specific order
      const socket = getSocket();
      socket.emit('join_room', `order:${order.id}`);
    } catch (err) {
      setError(`Order "${id}" could not be found. Please double-check your order number.`);
      setCurrentOrder(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRevisedQuote = async () => {
    if (!currentOrder) return;
    setIsAcceptingQuote(true);
    setQuoteMessage(null);
    try {
      const res = await acceptOrderQuote(currentOrder.id);
      setCurrentOrder(res.order);
      setQuoteMessage('You have accepted the revised quotation. Staff has been notified to proceed with printing!');
    } catch (err) {
      setError(err.message || 'Failed to accept quote');
    } finally {
      setIsAcceptingQuote(false);
    }
  };

  const formatPHP = (num) => {
    return `₱${(num || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Search Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Track Your Print Order
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Follow your print job in real time from submission to pickup.
        </p>

        {/* Search Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="mt-6 max-w-lg mx-auto flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="e.g. PO-2026-1001"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl transition text-sm flex items-center gap-1.5 shadow-sm"
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Track'}
          </button>
        </form>

        {/* User's Recent Orders (from localStorage) */}
        {recentOrders.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs">
            <span className="font-semibold text-slate-700">Your Recent Orders:</span>
            {recentOrders.map(recentId => (
              <button
                key={recentId}
                type="button"
                onClick={() => {
                  setSearchId(recentId);
                  handleSearch(recentId);
                }}
                className="font-mono font-bold text-slate-800 hover:text-brand-600 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-300 shadow-xs transition"
              >
                {recentId}
              </button>
            ))}
          </div>
        )}

        {/* Quick sample chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2.5 text-xs text-slate-400">
          <span>Demo Samples:</span>
          {['PO-2026-1001', 'PO-2026-1002', 'PO-2026-1003'].map(demoId => (
            <button
              key={demoId}
              type="button"
              onClick={() => {
                setSearchId(demoId);
                handleSearch(demoId);
              }}
              className="font-mono text-slate-500 hover:text-brand-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded transition"
            >
              {demoId}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      {/* Order Card Result */}
      {currentOrder && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden animate-in fade-in duration-300">
          {/* Card Header with Colored Status Indicator Dot beside order number */}
          <div className="bg-slate-900 p-6 text-white flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-brand-400">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl font-black font-mono tracking-tight">
                    {currentOrder.id}
                  </span>
                  {/* Real-Time Colored Status Dot beside Order Number */}
                  <StatusIndicator status={currentOrder.status} size="sm" showLabel={true} />
                </div>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Placed on {new Date(currentOrder.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs uppercase tracking-wider text-slate-400 block font-semibold">Total Price</span>
              <span className="text-2xl font-black font-mono text-white">
                {formatPHP(currentOrder.pricingSnapshot?.costs?.grandTotal)}
              </span>
            </div>
          </div>

          {/* Progress Timeline with Glowing Dots */}
          <div className="p-6 bg-slate-50/70 border-b border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
              Real-Time Order Progression
            </h3>

            <div className="grid grid-cols-3 gap-2 relative">
              {/* Connector line */}
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0" />

              {/* Step 1: New / Pending (Red) */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all ${
                  currentOrder.status === 'new'
                    ? 'bg-red-500 text-white ring-4 ring-red-100 pulse-dot-red'
                    : 'bg-emerald-500 text-white'
                }`}>
                  {currentOrder.status === 'new' ? '1' : '✓'}
                </div>
                <div className="mt-2">
                  <span className="text-xs font-bold text-slate-800 block">New / Pending</span>
                  <span className="text-[10px] text-slate-500">Order received in queue</span>
                </div>
              </div>

              {/* Step 2: In Progress (Yellow) */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all ${
                  currentOrder.status === 'in-progress'
                    ? 'bg-amber-500 text-white ring-4 ring-amber-100 pulse-dot-yellow'
                    : currentOrder.status === 'finished'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {currentOrder.status === 'finished' ? '✓' : '2'}
                </div>
                <div className="mt-2">
                  <span className="text-xs font-bold text-slate-800 block">In Progress</span>
                  <span className="text-[10px] text-slate-500">Printing & finishing</span>
                </div>
              </div>

              {/* Step 3: Finished (Green) */}
              <div className="flex flex-col items-center text-center relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm transition-all ${
                  currentOrder.status === 'finished'
                    ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 pulse-dot-green'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  3
                </div>
                <div className="mt-2">
                  <span className="text-xs font-bold text-slate-800 block">Finished</span>
                  <span className="text-[10px] text-slate-500">Ready for pickup</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quotation Adjustment Banner (if staff revised quotation) */}
          {currentOrder.quoteAdjustment && (
            <div className={`p-4 border-b ${
              currentOrder.quoteAdjustment.customerApproved
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">
                      {currentOrder.quoteAdjustment.customerApproved
                        ? 'Revised Quotation Accepted'
                        : 'Staff Revised Price Quotation'}
                    </h4>
                    <p className="text-xs mt-0.5">
                      Reason: <span className="font-medium">{currentOrder.quoteAdjustment.reason}</span>
                    </p>
                    <p className="text-xs font-mono mt-1">
                      Original: ₱{currentOrder.quoteAdjustment.originalGrandTotal?.toFixed(2)} → <strong className="font-bold text-sm">Revised: ₱{currentOrder.quoteAdjustment.revisedGrandTotal?.toFixed(2)}</strong>
                    </p>
                  </div>
                </div>

                {!currentOrder.quoteAdjustment.customerApproved ? (
                  <button
                    type="button"
                    onClick={handleAcceptRevisedQuote}
                    disabled={isAcceptingQuote}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isAcceptingQuote ? 'Approving...' : 'Accept Revised Quote'}</span>
                  </button>
                ) : (
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-300">
                    ✓ Approved by Customer
                  </span>
                )}
              </div>
              {quoteMessage && (
                <p className="mt-2 text-xs font-semibold text-emerald-700">{quoteMessage}</p>
              )}
            </div>
          )}

          {/* Order Details Grid */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            {/* Customer & Job Info */}
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-2xl p-4">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2.5">
                  Order Privacy
                </h4>
                <p className="text-xs text-slate-600">
                  Contact details are not shown here, and public tracking does not include file links. Use your order number to check print status and progress.
                </p>
              </div>

              <div className="border border-slate-200 rounded-2xl p-4">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2.5">Uploaded Design Files</h4>
                <p className="text-xs text-slate-600">Your original files remain attached to your order and are available to the print shop staff.</p>
              </div>
            </div>

            {/* Specifications & Financials */}
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-2xl p-4">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2.5">
                  Printing Specifications
                </h4>
                <div className="space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Job Type:</span>
                    <span className="font-semibold text-slate-800">{currentOrder.job?.jobTypeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paper Size:</span>
                    <span className="font-semibold text-slate-800">{currentOrder.job?.paperSizeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stock Material:</span>
                    <span className="font-semibold text-slate-800">{currentOrder.job?.paperMaterialName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Color / Sides:</span>
                    <span className="font-semibold text-slate-800">
                      {currentOrder.job?.colorModeName} • {currentOrder.job?.printSideName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Orientation & Margins:</span>
                    <span className="font-semibold text-slate-800 capitalize">
                      {currentOrder.formatting?.orientation} • {currentOrder.formatting?.columns} col
                    </span>
                  </div>
                  <div className="flex justify-between text-brand-700 font-bold pt-1.5 border-t border-slate-100">
                    <span>Calculated Sheets:</span>
                    <span className="font-mono">{currentOrder.pricingSnapshot?.calculationMeta?.physicalSheets} sheets</span>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                  Pricing Snapshot (Locked)
                </h4>
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Base Printing:</span>
                    <span className="font-mono">{formatPHP(currentOrder.pricingSnapshot?.costs?.printingCost)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Paper & Material:</span>
                    <span className="font-mono">{formatPHP(currentOrder.pricingSnapshot?.costs?.materialCost)}</span>
                  </div>
                  {currentOrder.pricingSnapshot?.costs?.finishingCost > 0 && (
                    <div className="flex justify-between">
                      <span>Finishing Services:</span>
                      <span className="font-mono">{formatPHP(currentOrder.pricingSnapshot?.costs?.finishingCost)}</span>
                    </div>
                  )}
                  {currentOrder.pricingSnapshot?.costs?.rushFee > 0 && (
                    <div className="flex justify-between text-amber-700">
                      <span>Rush Fee:</span>
                      <span className="font-mono">{formatPHP(currentOrder.pricingSnapshot?.costs?.rushFee)}</span>
                    </div>
                  )}
                  <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                    <span>Total Amount:</span>
                    <span className="font-mono text-brand-700">
                      {formatPHP(currentOrder.pricingSnapshot?.costs?.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Log / Status History */}
          {currentOrder.statusHistory && currentOrder.statusHistory.length > 0 && (
            <div className="p-6 bg-slate-50 border-t border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Order Activity History
              </h4>
              <div className="space-y-2">
                {currentOrder.statusHistory.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-800">
                        {item.note || `Status: ${item.status}`}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer Card Actions */}
          <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              ⚡ Real-time updates active. Any status transition updates instantly.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsTicketOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Receipt</span>
              </button>
              <button
                type="button"
                onClick={onNavigateToNewOrder}
                className="px-4 py-2 text-xs font-semibold text-brand-600 hover:text-brand-800 hover:bg-brand-50 rounded-xl transition"
              >
                + Create Another Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt / Job Ticket Modal */}
      <JobTicketModal
        order={currentOrder}
        isOpen={isTicketOpen}
        onClose={() => setIsTicketOpen(false)}
      />
    </div>
  );
}
