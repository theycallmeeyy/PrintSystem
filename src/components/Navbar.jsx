import React from 'react';
import { Printer, Shield, Wifi, WifiOff, LogOut, LockKeyhole } from 'lucide-react';

export default function Navbar({
  currentView,
  onViewChange,
  isSocketConnected = true,
  staffUser = null,
  onLogout
}) {
  if (currentView === 'home') {
    return (
      <header className="bg-[#f3f7ff] px-5 pt-6 sm:px-8 sm:pt-8">
        <div className="mx-auto flex max-w-[1120px] items-center justify-center">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onViewChange('home')}
              aria-label="Print Plus home"
              className="flex items-center gap-2.5"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Printer className="h-5 w-5" />
              </span>
              <span className="text-lg font-extrabold tracking-tight text-slate-900">
                Print<span className="text-blue-600">Plus</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => onViewChange('admin')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              <LockKeyhole className="h-3.5 w-3.5" />
              Admin login
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Name */}
          <div
            onClick={() => onViewChange('customer')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-sky-400 text-white flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">
                  Print <span className="text-brand-600">Plus</span>
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                  v1.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Order Management System</p>
            </div>
          </div>

          {/* Status Indicator Legend (Always visible in Header) */}
          <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-2xl text-[11px]">
            <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Status:</span>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block pulse-dot-red" />
              <span>New</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block pulse-dot-yellow" />
              <span>In Progress</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1.5 text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block pulse-dot-green" />
              <span>Finished</span>
            </div>
          </div>

          {/* View Mode Switching Navigation */}
          <div className="flex items-center gap-2">
            <nav className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => onViewChange('customer')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                  currentView === 'customer'
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + New Order
              </button>

              <button
                type="button"
                onClick={() => onViewChange('track')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                  currentView === 'track'
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Track Order
              </button>

              <button
                type="button"
                onClick={() => onViewChange('admin')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1 ${
                  currentView === 'admin'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3 h-3 text-brand-400" />
                <span>{staffUser ? 'Workspace' : 'Staff Login'}</span>
              </button>
            </nav>

            {staffUser && (
              <button
                type="button"
                onClick={onLogout}
                title={`Sign out ${staffUser.name}`}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            {/* Real-time WebSocket connection indicator */}
            <div
              className={`hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                isSocketConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
              title={isSocketConnected ? 'Real-time WebSocket connected' : 'Connecting to real-time server...'}
            >
              {isSocketConnected ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-500" />
                  <span>Real-Time Sync</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-amber-500" />
                  <span>Connecting...</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
