import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { challanService } from '../services/challanService';
import { Challan, ChallanStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { Search, Plus, Eye, Download, CheckCircle2, XCircle, FileText, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Challans: React.FC = () => {
  const [challans, setChallans] = useState<Challan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { hasRole } = useAuth();

  const fetchChallans = async (p = page) => {
    setIsLoading(true);
    try {
      const res = await challanService.getChallans({
        page: p,
        limit: 10,
        q: search || undefined,
        status: statusFilter || undefined,
      });
      setChallans(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Failed to fetch challans', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChallans(1);
    setPage(1);
  }, [search, statusFilter]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchChallans(newPage);
  };

  const handleDownloadPDF = async (id: string, challanNumber: string) => {
    try {
      await challanService.downloadInvoicePDF(id, challanNumber);
    } catch (err: any) {
      alert(err.message || 'Failed to download PDF invoice.');
    }
  };

  return (
    <Layout title="Sales Challans" subtitle="Track wholesale orders, confirm stock deductions & download PDF invoices">
      {/* Search & Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Challan # (e.g. CH-2026-0001) or customer..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Create Challan Button */}
        {hasRole('ADMIN', 'SALES') && (
          <Link
            to="/challans/new"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Create Draft Challan</span>
          </Link>
        )}
      </div>

      {/* Challan Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Challan Number</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Total Qty</th>
                <th className="px-6 py-4">Grand Total</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Loading challan database...
                  </td>
                </tr>
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No challans found matching your filters.
                  </td>
                </tr>
              ) : (
                challans.map((ch) => (
                  <tr key={ch.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold text-blue-400 text-base">{ch.challanNumber}</div>
                      <div className="text-[11px] text-slate-500">By {ch.createdBy.name}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-sm">{ch.customer.businessName}</div>
                      <div className="text-xs text-slate-400">{ch.customer.name}</div>
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge type="challan" value={ch.status} />
                    </td>

                    <td className="px-6 py-4 font-semibold text-slate-200">
                      {ch.totalQuantity} items
                    </td>

                    <td className="px-6 py-4 font-extrabold text-white text-base">
                      ${Number(ch.totalAmount).toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(ch.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        to={`/challans/${ch.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-400" />
                        <span>View</span>
                      </Link>

                      {ch.status === 'CONFIRMED' && (
                        <button
                          onClick={() => handleDownloadPDF(ch.id, ch.challanNumber)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs transition-colors"
                          title="Download PDF Invoice"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>PDF</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalRecords={total}
          onPageChange={handlePageChange}
        />
      </div>
    </Layout>
  );
};
