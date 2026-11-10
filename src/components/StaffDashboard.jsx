import React, { useState, useEffect } from 'react';
import {
  Search, Filter, Eye, RefreshCw, CheckCircle, Clock, AlertCircle,
  FileText, Download, Edit3, DollarSign, User, Phone, Mail, Printer,
  Layers, Sliders, ChevronDown, Check, ArrowUpDown
} from 'lucide-react';
import StatusIndicator from './StatusIndicator';
import DocumentPreview from './DocumentPreview';
import JobTicketModal from './JobTicketModal';
import { fetchOrders, updateOrderStatus, reviseOrderQuote, updatePayment } from '../services/api';
import { getSocket } from '../services/socket';

export default function StaffDashboard({ onNavigateToPricing, canManagePricing = false, staffUser }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);

  // Status update states
  const [statusNote, setStatusNote] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Quote revision modal state
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [revisedAmount, setRevisedAmount] = useState('');
  const [quoteReason, setQuoteReason] = useState('');
  const [staffName, setStaffName] = useState(staffUser?.name || 'Shop Manager');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  // Ticket Modal state
  const [ticketOrder, setTicketOrder] = useState(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // Payment update state
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Export orders to CSV
  const exportToCSV = () => {
    if (orders.length === 0) return;
    const headers = ['Order ID', 'Date', 'Customer Name', 'Phone', 'Email', 'Service', 'Paper Size', 'Material', 'Color', 'Duplex', 'Sheets', 'Grand Total (PHP)', 'Status', 'Payment Status'];
    const rows = orders.map(o => [
      o.id,
      new Date(o.createdAt).toISOString(),
      `"${(o.customer?.name || '').replace(/"/g, '""')}"`,
      `"${o.customer?.phone || ''}"`,
      `"${o.customer?.email || ''}"`,
      `"${o.job?.jobTypeName || ''}"`,
      `"${o.job?.paperSizeId || ''}"`,
      `"${o.job?.paperMaterialName || ''}"`,
      `"${o.job?.colorModeId || ''}"`,
      `"${o.job?.printSideId || ''}"`,
      o.pricingSnapshot?.calculationMeta?.physicalSheets || 1,
      o.pricingSnapshot?.costs?.grandTotal || 0,
      o.status,
      o.paymentStatus || 'unpaid'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PrintPlus_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Load orders from API
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await fetchOrders({ status: statusFilter, search: searchQuery });
      setOrders(data);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, searchQuery]);

  // Set up real-time socket updates
  useEffect(() => {
    const socket = getSocket();

    const handleOrderCreated = (newOrder) => {
      console.log('[Staff Socket] New order arrived:', newOrder.id);
      setOrders(prev => [newOrder, ...prev.filter(o => o.id !== newOrder.id)]);
    };

    const handleStatusChanged = ({ orderId, status, order }) => {
      console.log(`[Staff Socket] Order ${orderId} status changed to ${status}`);
      setOrders(prev => prev.map(o => o.id === orderId ? order : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(order);
      }
    };

    const handleOrderUpdated = (updatedOrder) => {
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
      if (selectedOrder && selectedOrder.id === updatedOrder.id) {
        setSelectedOrder(updatedOrder);
      }
    };

    socket.on('order:created', handleOrderCreated);
    socket.on('order:status_changed', handleStatusChanged);
    socket.on('order:updated', handleOrderUpdated);
    socket.on('order:quote_revised', handleOrderUpdated);
    socket.on('order:quote_accepted', handleOrderUpdated);

    return () => {
      socket.off('order:created', handleOrderCreated);
      socket.off('order:status_changed', handleStatusChanged);
      socket.off('order:updated', handleOrderUpdated);
      socket.off('order:quote_revised', handleOrderUpdated);
      socket.off('order:quote_accepted', handleOrderUpdated);
    };
  }, [selectedOrder]);

  // Quick status update
  const handleQuickStatusChange = async (orderId, newStatus) => {
    try {
      const res = await updateOrderStatus(orderId, newStatus, `Staff updated to ${newStatus}`);
      setOrders(prev => prev.map(o => o.id === orderId ? res.order : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(res.order);
      }
    } catch (err) {
      alert(`Error updating status: ${err.message}`);
    }
  };

  // Inspect order details
  const openInspectModal = (order) => {
    setSelectedOrder(order);
    setStatusNote('');
    setPaymentStatus(order.paymentStatus || 'unpaid');
    setPaymentMethod(order.paymentMethod || 'cash');
    setIsInspectModalOpen(true);
  };

  // Save status with custom note inside modal
  const handleSaveModalStatus = async (newStatus) => {
    if (!selectedOrder) return;
    setIsUpdatingStatus(true);
    try {
      const res = await updateOrderStatus(selectedOrder.id, newStatus, statusNote);
      setSelectedOrder(res.order);
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? res.order : o));
      setStatusNote('');
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Save payment details
  const handleSavePayment = async () => {
    if (!selectedOrder) return;
    try {
      const res = await updatePayment(selectedOrder.id, { paymentStatus, paymentMethod });
      setSelectedOrder(res.order);
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? res.order : o));
      alert('Payment details updated successfully');
    } catch (err) {
      alert(`Payment error: ${err.message}`);
    }
  };

  // Submit revised quotation
  const handleSubmitRevisedQuote = async () => {
    if (!selectedOrder || !revisedAmount) return;
    setIsSubmittingQuote(true);
    try {
      const res = await reviseOrderQuote(selectedOrder.id, {
        revisedAmount: parseFloat(revisedAmount),
        reason: quoteReason,
        staffName
      });
      setSelectedOrder(res.order);
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? res.order : o));
      setIsQuoteModalOpen(false);
      setRevisedAmount('');
      setQuoteReason('');
    } catch (err) {
      alert(`Error revising quote: ${err.message}`);
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  const formatPHP = (num) => {
    return `₱${(num || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // Stats calculation
  const totalOrdersCount = orders.length;
  const newOrdersCount = orders.filter(o => o.status === 'new').length;
  const inProgressCount = orders.filter(o => o.status === 'in-progress').length;
  const finishedCount = orders.filter(o => o.status === 'finished').length;
  const totalRevenue = orders.reduce((sum, o) => sum + (o.pricingSnapshot?.costs?.grandTotal || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {staffUser?.role === 'super_admin' ? 'Super Admin Order Management' : staffUser?.role === 'admin' ? 'Admin Order Management' : 'Staff Order Management'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time control queue for processing customer print jobs and quotations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={exportToCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition text-xs font-semibold flex items-center gap-1.5"
            title="Export all orders to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            type="button"
            onClick={loadOrders}
            className="p-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 transition"
            title="Refresh Orders"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {canManagePricing && (
            <button
              type="button"
              onClick={onNavigateToPricing}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <DollarSign className="w-4 h-4 text-brand-400" />
              <span>Configure Printing Prices</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mb-8">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block">Total Orders</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block font-mono">{totalOrdersCount}</span>
        </div>

        <div className="bg-red-50/70 p-4 rounded-2xl border border-red-200 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 pulse-dot-red" />
            <span className="text-red-800 text-xs font-bold uppercase tracking-wider">New / Pending</span>
          </div>
          <span className="text-2xl font-black text-red-700 mt-1 block font-mono">{newOrdersCount}</span>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 pulse-dot-yellow" />
            <span className="text-amber-800 text-xs font-bold uppercase tracking-wider">In Progress</span>
          </div>
          <span className="text-2xl font-black text-amber-700 mt-1 block font-mono">{inProgressCount}</span>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 pulse-dot-green" />
            <span className="text-emerald-800 text-xs font-bold uppercase tracking-wider">Finished</span>
          </div>
          <span className="text-2xl font-black text-emerald-700 mt-1 block font-mono">{finishedCount}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider block">Queue Value</span>
          <span className="text-xl font-black text-brand-600 mt-1 block font-mono">{formatPHP(totalRevenue)}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'new', label: '🔴 New / Pending' },
            { id: 'in-progress', label: '🟡 In Progress' },
            { id: 'finished', label: '🟢 Finished' }
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                statusFilter === f.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Query */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search order #, customer, file..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <th className="py-3.5 px-4">Order Number & Status</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Print Service</th>
                <th className="py-3.5 px-4">Sheets / Qty</th>
                <th className="py-3.5 px-4">Grand Total</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4 text-center">Quick Move</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No orders matching the current filter.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const meta = order.pricingSnapshot?.calculationMeta;
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Order Number & Colored Status Dot Indicator */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-2">
                          <StatusIndicator status={order.status} size="sm" showLabel={false} />
                          <span className="font-bold text-slate-900">{order.id}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-900 block truncate max-w-[140px]">
                          {order.customer?.name}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[140px]">
                          {order.customer?.phone || order.customer?.email || 'No contact'}
                        </span>
                      </td>

                      {/* Print Service & Specs */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block truncate max-w-[160px]">
                          {order.job?.jobTypeName}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          {order.job?.paperSizeId} • {order.job?.colorModeId === 'color' ? 'Full Color' : 'B&W'} • {order.job?.printSideId === 'double' ? 'Duplex' : '1-Side'}
                        </span>
                      </td>

                      {/* Sheets & Quantities */}
                      <td className="py-3.5 px-4 font-mono">
                        {meta?.isPerSheetProduct ? (
                          <span className="font-semibold text-slate-800">{meta?.productQuantity} units</span>
                        ) : (
                          <div>
                            <span className="font-bold text-brand-700">{meta?.physicalSheets} sheets</span>
                            <span className="text-[10px] text-slate-400 block">{meta?.pagesPerCopy}p × {meta?.copies}c</span>
                          </div>
                        )}
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 font-mono">
                        <span className="font-black text-slate-900 text-sm">
                          {formatPHP(order.pricingSnapshot?.costs?.grandTotal)}
                        </span>
                        {order.quoteAdjustment && (
                          <span className="text-[10px] text-amber-600 block font-semibold">
                            Quote Revised
                          </span>
                        )}
                      </td>

                      {/* Payment */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          order.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.paymentStatus === 'partial'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {order.paymentStatus || 'unpaid'}
                        </span>
                        <span className="text-[10px] text-slate-400 block capitalize mt-0.5">
                          {order.paymentMethod || 'cash'}
                        </span>
                      </td>

                      {/* Quick Status Action Buttons */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs">
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange(order.id, 'new')}
                            title="Set to New / Pending"
                            className={`p-1.5 rounded transition ${
                              order.status === 'new' ? 'bg-red-500 text-white' : 'text-slate-400 hover:text-red-500'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange(order.id, 'in-progress')}
                            title="Set to In Progress"
                            className={`p-1.5 rounded transition ${
                              order.status === 'in-progress' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-amber-500'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickStatusChange(order.id, 'finished')}
                            title="Set to Finished"
                            className={`p-1.5 rounded transition ${
                              order.status === 'finished' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-emerald-500'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                          </button>
                        </div>
                      </td>

                      {/* Inspect Action */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setTicketOrder(order);
                              setIsTicketModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="Print Work Order Ticket"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openInspectModal(order)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-brand-600 text-white font-semibold rounded-lg transition inline-flex items-center gap-1 shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Inspection Modal */}
      {isInspectModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <StatusIndicator status={selectedOrder.status} size="md" showLabel={true} />
                <div>
                  <h3 className="font-bold text-lg font-mono">
                    {selectedOrder.id}
                  </h3>
                  <p className="text-xs text-slate-400">Order Inspection & Management</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTicketOrder(selectedOrder);
                    setIsTicketModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Job Ticket</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsQuoteModalOpen(true)}
                  className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 hover:bg-amber-500/30 text-xs font-bold rounded-lg transition flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Revise Quotation</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsInspectModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6 text-xs">
              {/* Order Status Control Strip */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-slate-900 text-sm block">Current Order Status</span>
                  <p className="text-slate-500 text-[11px]">Updating status will push real-time updates to customer</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleSaveModalStatus('new')}
                    className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition ${
                      selectedOrder.status === 'new'
                        ? 'bg-red-500 text-white shadow-sm ring-2 ring-red-200'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>New / Pending</span>
                  </button>

                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleSaveModalStatus('in-progress')}
                    className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition ${
                      selectedOrder.status === 'in-progress'
                        ? 'bg-amber-500 text-white shadow-sm ring-2 ring-amber-200'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>In Progress</span>
                  </button>

                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => handleSaveModalStatus('finished')}
                    className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition ${
                      selectedOrder.status === 'finished'
                        ? 'bg-emerald-500 text-white shadow-sm ring-2 ring-emerald-200'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Finished</span>
                  </button>
                </div>
              </div>

              {/* Status Note Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Optional staff update note (e.g., 'Sheet printed, currently binding...')"
                  value={statusNote}
                  onChange={e => setStatusNote(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              {/* Document Layout Preview & Customer Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2 text-[11px]">
                    Customer Design File & Simulation
                  </h4>
                  <DocumentPreview
                    file={selectedOrder.files && selectedOrder.files.length > 0 ? selectedOrder.files[0] : null}
                    formatting={selectedOrder.formatting || {}}
                    job={selectedOrder.job || {}}
                  />
                </div>

                <div className="space-y-4">
                  {/* Customer Information */}
                  <div className="border border-slate-200 rounded-2xl p-4 space-y-1.5">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                      Customer Contact
                    </h4>
                    <p><strong className="text-slate-800">Name:</strong> {selectedOrder.customer?.name}</p>
                    <p><strong className="text-slate-800">Phone:</strong> {selectedOrder.customer?.phone || 'Not provided'}</p>
                    <p><strong className="text-slate-800">Email:</strong> {selectedOrder.customer?.email || 'Not provided'}</p>
                    {selectedOrder.customer?.notes && (
                      <p className="pt-2 text-slate-600 italic border-t border-slate-100">
                        "{selectedOrder.customer?.notes}"
                      </p>
                    )}
                  </div>

                  {/* Formatting Preferences */}
                  <div className="border border-slate-200 rounded-2xl p-4 space-y-1">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                      Customer Formatting Specifications
                    </h4>
                    <p><strong className="text-slate-800">Orientation:</strong> {selectedOrder.formatting?.orientation}</p>
                    <p><strong className="text-slate-800">Columns:</strong> {selectedOrder.formatting?.columns} Column(s)</p>
                    <p><strong className="text-slate-800">Typography:</strong> {selectedOrder.formatting?.fontFamily} ({selectedOrder.formatting?.fontSize}, {selectedOrder.formatting?.fontStyle})</p>
                    <p><strong className="text-slate-800">Alignment:</strong> {selectedOrder.formatting?.alignment} • {selectedOrder.formatting?.lineSpacing}x spacing</p>
                    <p><strong className="text-slate-800">Margins:</strong> Top: {selectedOrder.formatting?.margins?.top}", Bottom: {selectedOrder.formatting?.margins?.bottom}", Left: {selectedOrder.formatting?.margins?.left}", Right: {selectedOrder.formatting?.margins?.right}"</p>
                  </div>

                  {/* Payment Recording */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-2">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Payment Tracking
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold block mb-1">Status</label>
                        <select
                          value={paymentStatus}
                          onChange={e => setPaymentStatus(e.target.value)}
                          className="w-full p-1.5 rounded-lg border border-slate-300 text-xs"
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="partial">Partial</option>
                          <option value="paid">Paid in Full</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-semibold block mb-1">Method</label>
                        <select
                          value={paymentMethod}
                          onChange={e => setPaymentMethod(e.target.value)}
                          className="w-full p-1.5 rounded-lg border border-slate-300 text-xs"
                        >
                          <option value="cash">Cash</option>
                          <option value="gcash">GCash</option>
                          <option value="maya">Maya</option>
                          <option value="bank_transfer">Bank Transfer</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSavePayment}
                      className="mt-2 w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
                    >
                      Update Payment Status
                    </button>
                  </div>
                </div>
              </div>

              {/* Pricing Breakdown Snapshot */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2">
                  Captured Financial Snapshot
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Base Print Cost:</span>
                    <span className="font-mono font-semibold">{formatPHP(selectedOrder.pricingSnapshot?.costs?.printingCost)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Paper Material:</span>
                    <span className="font-mono font-semibold">{formatPHP(selectedOrder.pricingSnapshot?.costs?.materialCost)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Finishing Services:</span>
                    <span className="font-mono font-semibold">{formatPHP(selectedOrder.pricingSnapshot?.costs?.finishingCost)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Grand Total:</span>
                    <span className="font-mono font-bold text-brand-700 text-sm">
                      {formatPHP(selectedOrder.pricingSnapshot?.costs?.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsInspectModalOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl text-xs"
              >
                Done Inspecting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revised Quotation Modal */}
      {isQuoteModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 text-xs">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Revise Order Price Quotation
            </h3>
            <p className="text-slate-500 mb-4">
              Order {selectedOrder.id} • Current Total: {formatPHP(selectedOrder.pricingSnapshot?.costs?.grandTotal)}
            </p>

            <div className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Revised Total Amount (PHP ₱) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 250.00"
                  value={revisedAmount}
                  onChange={e => setRevisedAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Quotation Reason / Adjustment Note <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Custom paper size surcharge or manual trimming required"
                  value={quoteReason}
                  onChange={e => setQuoteReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Staff Sign-off</label>
                <input
                  type="text"
                  value={staffName}
                  onChange={e => setStaffName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsQuoteModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingQuote || !revisedAmount}
                onClick={handleSubmitRevisedQuote}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs"
              >
                {isSubmittingQuote ? 'Sending...' : 'Send Revised Quote to Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Job Ticket Modal */}
      <JobTicketModal
        order={ticketOrder}
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
      />
    </div>
  );
}
