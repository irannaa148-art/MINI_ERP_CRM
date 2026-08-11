import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { dashboardService } from '../services/dashboardService';
import { DashboardStats } from '../types';
import { Users, Package, AlertTriangle, FileText, DollarSign, ArrowUpRight, Plus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { hasRole } = useAuth();

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <Layout title="Operations Overview" subtitle="Real-time KPI metrics, stock alerts & monthly sales analytics">
      {/* Header Refresh */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-white">System Metrics</h3>
        <button
          onClick={fetchStats}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Active Customers */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Customers</span>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {isLoading ? '...' : stats?.customers.active || 0}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Total CRM Database: <span className="font-semibold text-slate-200">{stats?.customers.total || 0}</span> ({stats?.customers.lead || 0} Leads)
          </p>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Low Stock Warning</span>
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {isLoading ? '...' : stats?.inventory.lowStockCount || 0}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Catalog Total: <span className="font-semibold text-slate-200">{stats?.inventory.totalProducts || 0}</span> Products
          </p>
        </div>

        {/* Confirmed Challans */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monthly Confirmed</span>
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            {isLoading ? '...' : stats?.challansThisMonth.confirmed || 0}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Draft Status: <span className="font-semibold text-slate-200">{stats?.challansThisMonth.draft || 0}</span> pending
          </p>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Revenue This Month</span>
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            ${isLoading ? '...' : Number(stats?.challansThisMonth.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            From confirmed sales challans
          </p>
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {stats && stats.inventory.lowStockCount > 0 && (
        <div className="mb-8 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <AlertTriangle className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-200">
                Inventory Re-order Alert: {stats.inventory.lowStockCount} Product(s) Below Minimum Threshold!
              </h4>
              <p className="text-xs text-amber-300/80">
                Review products flagged with low stock warnings to prevent fulfillment delays.
              </p>
            </div>
          </div>
          <Link
            to="/products?lowStock=true"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
          >
            <span>View Low Stock Products</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Quick Action Navigation Panels */}
      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Quick Operations Shortcuts</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {hasRole('ADMIN', 'SALES') && (
          <Link
            to="/challans/new"
            className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900 transition-all flex items-start justify-between group"
          >
            <div>
              <div className="h-10 w-10 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3">
                <Plus className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-white text-base group-hover:text-blue-400 transition-colors">
                Create Sales Challan
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Draft a new wholesale order with live stock feedback.
              </p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
          </Link>
        )}

        {hasRole('ADMIN', 'SALES') && (
          <Link
            to="/customers"
            className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900 transition-all flex items-start justify-between group"
          >
            <div>
              <div className="h-10 w-10 rounded-xl bg-emerald-600/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3">
                <Users className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">
                Manage Customers CRM
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Add business profiles & track follow-up timelines.
              </p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
          </Link>
        )}

        {hasRole('ADMIN', 'WAREHOUSE') && (
          <Link
            to="/products"
            className="p-5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900 transition-all flex items-start justify-between group"
          >
            <div>
              <div className="h-10 w-10 rounded-xl bg-amber-600/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                <Package className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-white text-base group-hover:text-amber-400 transition-colors">
                Inventory & Stock Log
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Record manual stock IN/OUT adjustments & upload images.
              </p>
            </div>
            <ArrowUpRight className="h-5 w-5 text-slate-600 group-hover:text-amber-400 transition-colors" />
          </Link>
        )}
      </div>
    </Layout>
  );
};
