import React, { useState, useEffect } from 'react';
import {
  DollarSign, Save, RotateCcw, Plus, Trash2, CheckCircle2,
  AlertCircle, Sparkles, Layers, Sliders, Tag, Settings, Calculator
} from 'lucide-react';
import { fetchPricing, updatePricing, resetPricing } from '../services/api';

export default function StaffPricingManagement({ onPricingSaved }) {
  const [pricing, setPricing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('jobTypes'); // 'jobTypes' | 'sizes' | 'materials' | 'colorSides' | 'finishing' | 'fees'

  // New service draft state
  const [newJobType, setNewJobType] = useState({ id: '', name: '', description: '', baseRatePerPage: 2.0, isPerSheetProduct: false });
  const [newFinishing, setNewFinishing] = useState({ id: '', name: '', description: '', price: 20.0, pricingType: 'per-sheet' });

  useEffect(() => {
    loadPricingData();
  }, []);

  const loadPricingData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPricing();
      setPricing(data);
    } catch (err) {
      setNotification({ type: 'error', message: `Failed to load pricing: ${err.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePricing = async () => {
    setIsSaving(true);
    setNotification(null);
    try {
      const res = await updatePricing(pricing);
      setPricing(res.pricing);
      setNotification({ type: 'success', message: 'Pricing configuration saved! New rates are now active across the system in real time.' });
      if (onPricingSaved) onPricingSaved(res.pricing);
    } catch (err) {
      setNotification({ type: 'error', message: `Failed to save pricing: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all prices and services to default standard rates?')) return;
    setIsSaving(true);
    try {
      const res = await resetPricing();
      setPricing(res.pricing);
      setNotification({ type: 'success', message: 'Reset to standard factory default rates.' });
      if (onPricingSaved) onPricingSaved(res.pricing);
    } catch (err) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Add new job service
  const handleAddJobType = () => {
    if (!newJobType.name.trim()) return;
    const cleanId = newJobType.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const itemToAdd = {
      ...newJobType,
      id: cleanId,
      baseRatePerPage: parseFloat(newJobType.baseRatePerPage) || 1.0
    };
    setPricing({
      ...pricing,
      jobTypes: [...pricing.jobTypes, itemToAdd]
    });
    setNewJobType({ id: '', name: '', description: '', baseRatePerPage: 2.0, isPerSheetProduct: false });
  };

  const handleRemoveJobType = (id) => {
    setPricing({
      ...pricing,
      jobTypes: pricing.jobTypes.filter(j => j.id !== id)
    });
  };

  // Add new finishing service
  const handleAddFinishing = () => {
    if (!newFinishing.name.trim()) return;
    const cleanId = newFinishing.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const itemToAdd = {
      ...newFinishing,
      id: cleanId,
      price: parseFloat(newFinishing.price) || 5.0
    };
    setPricing({
      ...pricing,
      finishingServices: [...pricing.finishingServices, itemToAdd]
    });
    setNewFinishing({ id: '', name: '', description: '', price: 20.0, pricingType: 'per-sheet' });
  };

  const handleRemoveFinishing = (id) => {
    setPricing({
      ...pricing,
      finishingServices: pricing.finishingServices.filter(f => f.id !== id)
    });
  };

  if (isLoading || !pricing) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <p className="text-slate-500">Loading pricing configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Centralized Pricing Management
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure rates in Philippine Peso (₱). Historical orders retain their locked pricing snapshots.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition text-xs font-semibold flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSavePricing}
            disabled={isSaving}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition text-xs flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Pricing Rates'}</span>
          </button>
        </div>
      </div>

      {notification && (
        <div className={`mb-6 p-4 rounded-2xl text-sm flex items-center gap-2.5 ${
          notification.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6 overflow-x-auto pb-1 text-xs font-semibold">
        {[
          { id: 'jobTypes', label: '1. Print Job Services' },
          { id: 'sizes', label: '2. Paper Sizes' },
          { id: 'materials', label: '3. Materials & Stock' },
          { id: 'colorSides', label: '4. Color & Duplex Rates' },
          { id: 'finishing', label: '5. Finishing Services' },
          { id: 'fees', label: '6. Fees, Tax & Discounts' }
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 rounded-t-xl transition whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-white border-t border-x border-slate-200 text-brand-700 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Job Types */}
      {activeTab === 'jobTypes' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Print Job Services & Base Rates</h2>
            <p className="text-xs text-slate-500">Configure base rates per page impression or per unit.</p>
          </div>

          <div className="space-y-3">
            {pricing.jobTypes.map((job, idx) => (
              <div
                key={job.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 items-center text-xs"
              >
                <div className="sm:col-span-4">
                  <span className="font-bold text-slate-900 block text-sm">{job.name}</span>
                  <input
                    type="text"
                    value={job.description}
                    onChange={e => {
                      const updated = [...pricing.jobTypes];
                      updated[idx].description = e.target.value;
                      setPricing({ ...pricing, jobTypes: updated });
                    }}
                    className="w-full text-[11px] text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] text-slate-500 block mb-0.5">Base Rate (₱)</label>
                  <div className="flex items-center gap-1 font-mono font-semibold">
                    <span>₱</span>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={job.baseRatePerPage}
                      onChange={e => {
                        const updated = [...pricing.jobTypes];
                        updated[idx].baseRatePerPage = parseFloat(e.target.value) || 0;
                        setPricing({ ...pricing, jobTypes: updated });
                      }}
                      className="w-24 px-2 py-1 bg-white rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] text-slate-500 block mb-0.5">Calculation Model</label>
                  <select
                    value={job.isPerSheetProduct ? 'unit' : 'pages'}
                    onChange={e => {
                      const updated = [...pricing.jobTypes];
                      updated[idx].isPerSheetProduct = e.target.value === 'unit';
                      setPricing({ ...pricing, jobTypes: updated });
                    }}
                    className="px-2 py-1 bg-white rounded-lg border border-slate-300 text-xs"
                  >
                    <option value="pages">Multi-Page Document</option>
                    <option value="unit">Direct Unit Count (Flyers/Posters)</option>
                  </select>
                </div>

                <div className="sm:col-span-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemoveJobType(job.id)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                    title="Remove service"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Service Box */}
          <div className="p-4 bg-brand-50/50 rounded-2xl border border-brand-100 space-y-3">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-brand-600" />
              Add New Printing Service
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <input
                type="text"
                placeholder="Service Name (e.g. Stickers)"
                value={newJobType.name}
                onChange={e => setNewJobType({ ...newJobType, name: e.target.value })}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white"
              />
              <input
                type="text"
                placeholder="Description"
                value={newJobType.description}
                onChange={e => setNewJobType({ ...newJobType, description: e.target.value })}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white"
              />
              <input
                type="number"
                step="0.5"
                placeholder="Base Rate ₱"
                value={newJobType.baseRatePerPage}
                onChange={e => setNewJobType({ ...newJobType, baseRatePerPage: parseFloat(e.target.value) || 0 })}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
              />
              <button
                type="button"
                onClick={handleAddJobType}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition"
              >
                + Add Service
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Paper Sizes */}
      {activeTab === 'sizes' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Paper Sizes & Document Rates</h2>
            <p className="text-xs text-slate-500">Document Printing uses the configured per-page black-and-white or color rate. Paper material is charged separately.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pricing.paperSizes.map((size, idx) => (
              <div key={size.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{size.id}</span>
                  <span className="text-slate-500 text-[11px] truncate max-w-[180px]">{size.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Fixed Surcharge (₱)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={size.surcharge}
                      onChange={e => {
                        const updated = [...pricing.paperSizes];
                        updated[idx].surcharge = parseFloat(e.target.value) || 0;
                        setPricing({ ...pricing, paperSizes: updated });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Multiplier Scale</label>
                    <input
                      type="number"
                      step="0.1"
                      value={size.multiplier}
                      onChange={e => {
                        const updated = [...pricing.paperSizes];
                        updated[idx].multiplier = parseFloat(e.target.value) || 1.0;
                        setPricing({ ...pricing, paperSizes: updated });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs"
                    />
                  </div>
                </div>
                {size.documentRates && (
                  <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3">
                    {[
                      { id: 'bw', label: 'Document B&W rate / page' },
                      { id: 'color', label: 'Document color rate / page' }
                    ].map(rate => (
                      <div key={rate.id}>
                        <label className="text-[10px] text-slate-500 block mb-0.5">{rate.label} (₱)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={size.documentRates[rate.id]}
                          onChange={e => {
                            const updated = pricing.paperSizes.map((paperSize, paperIdx) => (
                              paperIdx === idx
                                ? {
                                    ...paperSize,
                                    documentRates: {
                                      ...paperSize.documentRates,
                                      [rate.id]: Math.max(0, parseFloat(e.target.value) || 0)
                                    }
                                  }
                                : paperSize
                            ));
                            setPricing({ ...pricing, paperSizes: updated });
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Paper Materials */}
      {activeTab === 'materials' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Paper Stocks & Material Pricing</h2>
            <p className="text-xs text-slate-500">Configured per physical sheet used in the print job.</p>
          </div>

          <div className="space-y-3">
            {pricing.paperMaterials.map((mat, idx) => (
              <div
                key={mat.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 text-sm block">{mat.name}</span>
                  <span className="text-[11px] text-slate-500">{mat.description}</span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-slate-600 font-medium">Rate / Physical Sheet:</label>
                  <div className="flex items-center gap-1 font-mono font-bold">
                    <span>₱</span>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={mat.pricePerSheet}
                      onChange={e => {
                        const updated = [...pricing.paperMaterials];
                        updated[idx].pricePerSheet = parseFloat(e.target.value) || 0;
                        setPricing({ ...pricing, paperMaterials: updated });
                      }}
                      className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Color & Sides */}
      {activeTab === 'colorSides' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Color Modes & Duplex Surcharges</h2>
            <p className="text-xs text-slate-500">Configure full color add-ons and double-sided printing discount factor.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Color Modes */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Color Modes</h3>
              {pricing.colorModes.map((cm, idx) => (
                <div key={cm.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <span className="font-bold text-slate-900 block">{cm.name}</span>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-slate-500">Surcharge / Page:</label>
                    <div className="flex items-center gap-1 font-mono">
                      <span>₱</span>
                      <input
                        type="number"
                        step="0.25"
                        value={cm.surchargePerPage}
                        onChange={e => {
                          const updated = [...pricing.colorModes];
                          updated[idx].surchargePerPage = parseFloat(e.target.value) || 0;
                          setPricing({ ...pricing, colorModes: updated });
                        }}
                        className="w-24 px-2 py-1 rounded-lg border border-slate-300 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Print Sides */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Print Sides & Duplex</h3>
              {pricing.printSides.map((ps, idx) => (
                <div key={ps.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <span className="font-bold text-slate-900 block">{ps.name}</span>
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-slate-500">Rate Factor:</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="1.5"
                      value={ps.discountFactor}
                      onChange={e => {
                        const updated = [...pricing.printSides];
                        updated[idx].discountFactor = parseFloat(e.target.value) || 1.0;
                        setPricing({ ...pricing, printSides: updated });
                      }}
                      className="w-24 px-2 py-1 rounded-lg border border-slate-300 font-mono text-xs"
                    />
                    <span className="text-[10px] text-slate-400">
                      ({((1 - ps.discountFactor) * 100).toFixed(0)}% discount)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Finishing Services */}
      {activeTab === 'finishing' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Post-Print Finishing Services</h2>
            <p className="text-xs text-slate-500">Lamination, binding, stapling, and precision cutting rates.</p>
          </div>

          <div className="space-y-3">
            {pricing.finishingServices.map((srv, idx) => (
              <div
                key={srv.id}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 items-center text-xs"
              >
                <div className="sm:col-span-5">
                  <span className="font-bold text-slate-900 block">{srv.name}</span>
                  <span className="text-[11px] text-slate-500">{srv.description}</span>
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] text-slate-500 block mb-0.5">Price (₱)</label>
                  <div className="flex items-center gap-1 font-mono font-semibold">
                    <span>₱</span>
                    <input
                      type="number"
                      step="1.0"
                      min="0"
                      value={srv.price}
                      onChange={e => {
                        const updated = [...pricing.finishingServices];
                        updated[idx].price = parseFloat(e.target.value) || 0;
                        setPricing({ ...pricing, finishingServices: updated });
                      }}
                      className="w-24 px-2 py-1 bg-white rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] text-slate-500 block mb-0.5">Pricing Unit</label>
                  <select
                    value={srv.pricingType}
                    onChange={e => {
                      const updated = [...pricing.finishingServices];
                      updated[idx].pricingType = e.target.value;
                      setPricing({ ...pricing, finishingServices: updated });
                    }}
                    className="px-2 py-1 bg-white rounded-lg border border-slate-300 text-xs"
                  >
                    <option value="per-sheet">Per Physical Sheet</option>
                    <option value="per-copy">Per Finished Copy</option>
                    <option value="fixed">Fixed Flat Fee</option>
                  </select>
                </div>

                <div className="sm:col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemoveFinishing(srv.id)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                    title="Remove service"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Finishing */}
          <div className="p-4 bg-brand-50/50 rounded-2xl border border-brand-100 space-y-3">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-brand-600" />
              Add Optional Finishing Service
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <input
                type="text"
                placeholder="Service Name"
                value={newFinishing.name}
                onChange={e => setNewFinishing({ ...newFinishing, name: e.target.value })}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white"
              />
              <input
                type="text"
                placeholder="Description"
                value={newFinishing.description}
                onChange={e => setNewFinishing({ ...newFinishing, description: e.target.value })}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white"
              />
              <input
                type="number"
                step="1"
                placeholder="Price ₱"
                value={newFinishing.price}
                onChange={e => setNewFinishing({ ...newFinishing, price: parseFloat(e.target.value) || 0 })}
                className="px-3 py-2 rounded-xl border border-slate-300 bg-white font-mono"
              />
              <button
                type="button"
                onClick={handleAddFinishing}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition"
              >
                + Add Finishing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Fees & Tax */}
      {activeTab === 'fees' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Adjustments, Fees & Tax Settings</h2>
            <p className="text-xs text-slate-500">Configure global shop parameters and promotional codes.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <label className="font-bold text-slate-800 block">Rush Priority Surcharge (%)</label>
              <div className="flex items-center gap-1 font-mono">
                <input
                  type="number"
                  step="5"
                  value={pricing.rushFeePercent}
                  onChange={e => setPricing({ ...pricing, rushFeePercent: parseFloat(e.target.value) || 0 })}
                  className="w-24 px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-xs"
                />
                <span className="text-slate-500 font-semibold">%</span>
              </div>
              <p className="text-[11px] text-slate-400">Added to order subtotal when rush expedited production is toggled.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <label className="font-bold text-slate-800 block">Flat Courier Delivery Fee (₱)</label>
              <div className="flex items-center gap-1 font-mono">
                <span>₱</span>
                <input
                  type="number"
                  step="10"
                  value={pricing.deliveryFee}
                  onChange={e => setPricing({ ...pricing, deliveryFee: parseFloat(e.target.value) || 0 })}
                  className="w-28 px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-xs"
                />
              </div>
              <p className="text-[11px] text-slate-400">Added when customer requests doorstep courier delivery.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <label className="font-bold text-slate-800 block">Base Setup / Calibration Fee (₱)</label>
              <div className="flex items-center gap-1 font-mono">
                <span>₱</span>
                <input
                  type="number"
                  step="10"
                  value={pricing.setupFee}
                  onChange={e => setPricing({ ...pricing, setupFee: parseFloat(e.target.value) || 0 })}
                  className="w-28 px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-xs"
                />
              </div>
              <p className="text-[11px] text-slate-400">Fixed shop equipment preparation fee per order (0 for none).</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <label className="font-bold text-slate-800 block">Shop Tax Rate (VAT %)</label>
              <div className="flex items-center gap-1 font-mono">
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="50"
                  value={pricing.taxRatePercent}
                  onChange={e => setPricing({ ...pricing, taxRatePercent: parseFloat(e.target.value) || 0 })}
                  className="w-24 px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-xs"
                />
                <span className="text-slate-500 font-semibold">%</span>
              </div>
              <p className="text-[11px] text-slate-400">Standard Philippine VAT is 12%, or 0% for tax-exempt shops.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
