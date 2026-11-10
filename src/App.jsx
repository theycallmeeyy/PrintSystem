import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CustomerOrderForm from './components/CustomerOrderForm';
import OrderTracking from './components/OrderTracking';
import StaffDashboard from './components/StaffDashboard';
import StaffPricingManagement from './components/StaffPricingManagement';
import AdminLogin from './components/AdminLogin';
import StaffAccountManagement from './components/StaffAccountManagement';
import {
  fetchCurrentStaffUser,
  fetchPricing,
  getStaffToken,
  logoutStaff,
  saveStaffToken
} from './services/api';
import { getSocket, setSocketAuthToken } from './services/socket';

export default function App() {
  const [currentView, setCurrentView] = useState('customer');
  const [adminSection, setAdminSection] = useState('queue');
  const [trackedOrderId, setTrackedOrderId] = useState('');
  const [pricingConfig, setPricingConfig] = useState(null);
  const [staffUser, setStaffUser] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [liveToast, setLiveToast] = useState(null);

  // Load pricing
  const loadInitialPricing = async () => {
    try {
      const data = await fetchPricing();
      setPricingConfig(data);
    } catch (err) {
      console.error('Failed to load initial pricing:', err);
    }
  };

  useEffect(() => {
    loadInitialPricing();

    const savedToken = getStaffToken();
    if (savedToken) {
      setSocketAuthToken(savedToken);
      fetchCurrentStaffUser()
        .then(({ user }) => setStaffUser(user))
        .catch(() => {
          saveStaffToken(null);
          setSocketAuthToken(null);
        });
    }

    const socket = getSocket();

    socket.on('connect', () => {
      setIsSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    // Real-time pricing update
    socket.on('pricing:updated', (updatedPricing) => {
      console.log('[Socket] Pricing updated by staff:', updatedPricing);
      setPricingConfig(updatedPricing);
      showToast('Shop pricing configuration was updated in real time.');
    });

    // Real-time order notifications
    socket.on('order:status_changed', ({ orderId, status }) => {
      const statusLabels = { new: 'New / Pending', 'in-progress': 'In Progress', finished: 'Finished' };
      showToast(`Order ${orderId} is now marked as "${statusLabels[status] || status}"`);
    });

    socket.on('order:created', (newOrder) => {
      showToast(`New order received: ${newOrder.id} (${newOrder.customer?.name})`);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('pricing:updated');
      socket.off('order:status_changed');
      socket.off('order:created');
    };
  }, []);

  const showToast = (msg) => {
    setLiveToast(msg);
    setTimeout(() => {
      setLiveToast(null);
    }, 4500);
  };

  const handleOrderCreated = (newOrder) => {
    setTrackedOrderId(newOrder.id);
  };

  const handleStaffAuthenticated = ({ token, user }) => {
    saveStaffToken(token);
    setSocketAuthToken(token);
    setStaffUser(user);
    setAdminSection('queue');
  };

  const handleLogout = async () => {
    try {
      await logoutStaff();
    } catch (err) {
      console.error('Staff sign-out request failed:', err);
    } finally {
      saveStaffToken(null);
      setSocketAuthToken(null);
      setStaffUser(null);
      setCurrentView('customer');
    }
  };

  const handleTrackSpecificOrder = (orderId) => {
    setTrackedOrderId(orderId);
    setCurrentView('track');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navigation Header */}
      <Navbar
        currentView={currentView}
        onViewChange={(view) => setCurrentView(view)}
        isSocketConnected={isSocketConnected}
        staffUser={staffUser}
        onLogout={handleLogout}
      />

      {/* Real-time Toast Notification Pill */}
      {liveToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs max-w-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-400 animate-ping shrink-0" />
            <span className="font-medium">{liveToast}</span>
            <button
              onClick={() => setLiveToast(null)}
              className="ml-auto text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Content View Switcher */}
      <main className="flex-1 pb-16">
        {currentView === 'customer' && (
          <CustomerOrderForm
            pricingConfig={pricingConfig}
            onOrderCreated={handleOrderCreated}
            onTrackOrder={handleTrackSpecificOrder}
          />
        )}

        {currentView === 'track' && (
          <OrderTracking
            initialOrderId={trackedOrderId}
            onNavigateToNewOrder={() => setCurrentView('customer')}
          />
        )}

        {currentView === 'admin' && !staffUser && (
          <AdminLogin
            onAuthenticated={handleStaffAuthenticated}
            onBackToOrders={() => setCurrentView('customer')}
          />
        )}

        {currentView === 'admin' && staffUser && (
          <div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
              <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
                <button
                  type="button"
                  onClick={() => setAdminSection('queue')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSection === 'queue' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                >
                  Order Queue
                </button>
                {['admin', 'super_admin'].includes(staffUser.role) && (
                  <button
                    type="button"
                    onClick={() => setAdminSection('pricing')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSection === 'pricing' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                  >
                    Price Management
                  </button>
                )}
                {staffUser.role === 'super_admin' && (
                  <button
                    type="button"
                    onClick={() => setAdminSection('accounts')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold ${adminSection === 'accounts' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
                  >
                    Staff Accounts
                  </button>
                )}
                <span className="ml-auto self-center text-xs text-slate-500">
                  Signed in as <strong className="text-slate-700">{staffUser.name}</strong> · {staffUser.role.replace('_', ' ')}
                </span>
              </div>
            </div>
            {adminSection === 'queue' && (
              <StaffDashboard
                staffUser={staffUser}
                canManagePricing={['admin', 'super_admin'].includes(staffUser.role)}
                onNavigateToPricing={() => setAdminSection('pricing')}
              />
            )}
            {adminSection === 'pricing' && ['admin', 'super_admin'].includes(staffUser.role) && (
              <StaffPricingManagement onPricingSaved={setPricingConfig} />
            )}
            {adminSection === 'accounts' && staffUser.role === 'super_admin' && (
              <StaffAccountManagement />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <p>© 2026 Print Plus • Commercial Print Shop Order Management System</p>
          <div className="flex items-center gap-3 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>Red (New)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Yellow (In Progress)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Green (Finished)</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
