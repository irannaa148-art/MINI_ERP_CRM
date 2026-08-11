import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { challanService } from '../services/challanService';
import { Challan } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, CheckCircle2, XCircle, Download, FileText, Building, Phone, Mail, MapPin, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ChallanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [challan, setChallan] = useState<Challan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Confirm Error Payload State
  const [confirmErrorModal, setConfirmErrorModal] = useState<{
    message: string;
    shortProducts?: Array<{ productId: string; name: string; sku: string; requested: number; available: number }>;
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  const { hasRole } = useAuth();

  const fetchChallan = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await challanService.getChallanById(id);
      setChallan(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load challan detail.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChallan();
  }, [id]);

  const handleConfirm = async () => {
    if (!id || !challan) return;
    if (!window.confirm(`Are you sure you want to CONFIRM Sales Challan ${challan.challanNumber}? This will deduct inventory in an atomic transaction.`)) {
      return;
    }

    setIsProcessing(true);
    setConfirmErrorModal(null);

    try {
      await challanService.confirmChallan(id);
      fetchChallan();
    } catch (err: any) {
      setConfirmErrorModal({
        message: err.message || 'Confirmation failed due to stock insufficiency.',
        shortProducts: err.shortProducts,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!id || !challan) return;
    if (!window.confirm(`Are you sure you want to CANCEL Challan ${challan.challanNumber}? ${challan.status === 'CONFIRMED' ? 'Stock will be restored to inventory.' : ''}`)) {
      return;
    }

    setIsProcessing(true);
    try {
      await challanService.cancelChallan(id);
      fetchChallan();
    } catch (err: any) {
      alert(err.message || 'Cancellation failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!id || !challan) return;
    try {
      await challanService.downloadInvoicePDF(id, challan.challanNumber);
    } catch (err: any) {
      alert(err.message || 'Download failed.');
    }
  };

  if (isLoading) {
    return (
      <Layout title="Challan Detail">
        <div className="p-12 text-center text-slate-500">Loading sales challan details...</div>
      </Layout>
    );
  }

  if (error || !challan) {
    return (
      <Layout title="Challan Detail">
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          {error || 'Challan not found.'}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`Challan ${challan.challanNumber}`} subtitle={`Created on ${new Date(challan.createdAt).toLocaleDateString()} by ${challan.createdBy.name}`}>
      {/* Back Button */}
      <Link
        to="/challans"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Sales Challans</span>
      </Link>

      {/* Action Header Card */}
      <div className="mb-8 p-6 bg-slate-950 border border-slate-800 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight">{challan.challanNumber}</h2>
              <StatusBadge type="challan" value={challan.status} />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Grand Total: <span className="font-extrabold text-white">${Number(challan.totalAmount).toFixed(2)}</span> ({challan.totalQuantity} items)
            </p>
          </div>
        </div>

        {/* Action Triggers */}
        <div className="flex flex-wrap items-center gap-3">
          {challan.status === 'CONFIRMED' && (
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF Invoice</span>
            </button>
          )}

          {challan.status === 'DRAFT' && hasRole('ADMIN', 'SALES') && (
            <button
              onClick={handleConfirm}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isProcessing ? 'Confirming Stock...' : 'Confirm & Deduct Stock'}</span>
            </button>
          )}

          {challan.status !== 'CANCELLED' && hasRole('ADMIN', 'SALES') && (
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="px-4 py-2 bg-slate-900 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-semibold text-xs rounded-xl flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              <span>Cancel Challan</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid: Customer Billed Details + Line Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Billed Customer Card */}
        <div className="space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-white text-base pb-3 border-b border-slate-800 flex items-center gap-2">
              <Building className="h-4 w-4 text-blue-400" />
              <span>Customer Billed Details</span>
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div>
                <span className="text-slate-500 uppercase font-semibold block">Business Name:</span>
                <span className="font-bold text-white text-sm">{challan.customer.businessName}</span>
              </div>

              <div>
                <span className="text-slate-500 uppercase font-semibold block">Contact Person:</span>
                <span>{challan.customer.name}</span>
              </div>

              <div>
                <span className="text-slate-500 uppercase font-semibold block">Mobile:</span>
                <span className="flex items-center gap-1.5 text-slate-200">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {challan.customer.mobile}
                </span>
              </div>

              {challan.customer.email && (
                <div>
                  <span className="text-slate-500 uppercase font-semibold block">Email:</span>
                  <span className="flex items-center gap-1.5 text-slate-200">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {challan.customer.email}
                  </span>
                </div>
              )}

              {challan.customer.gstNumber && (
                <div>
                  <span className="text-slate-500 uppercase font-semibold block">GST Number:</span>
                  <span className="font-mono text-slate-200 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 inline-block mt-0.5">
                    {challan.customer.gstNumber}
                  </span>
                </div>
              )}

              {challan.customer.address && (
                <div>
                  <span className="text-slate-500 uppercase font-semibold block">Address:</span>
                  <span className="flex items-start gap-1.5 text-slate-400 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    {challan.customer.address}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line Items Snapshot Table */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-white text-base pb-3 border-b border-slate-800">
              Product Line Items (Snapshot at Time of Sale)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3 text-right">Unit Price</th>
                    <th className="px-4 py-3 text-right">Quantity</th>
                    <th className="px-4 py-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {challan.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-900/40">
                      <td className="px-4 py-3.5 font-mono text-blue-400 font-semibold">
                        {item.productSku}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white text-sm">{item.productName}</div>
                        {item.product && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Available in Warehouse DB: {item.product.currentStock} units
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right font-medium text-slate-200">
                        ${Number(item.unitPrice).toFixed(2)}
                      </td>

                      <td className="px-4 py-3.5 text-right font-bold text-white">
                        {item.quantity}
                      </td>

                      <td className="px-4 py-3.5 text-right font-extrabold text-white text-sm">
                        ${Number(item.lineTotal).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Totals */}
            <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-sm">
              <span className="text-slate-400">Total Quantity: <strong className="text-white">{challan.totalQuantity} units</strong></span>
              <div className="text-right">
                <span className="text-xs text-slate-400 font-semibold uppercase block">Grand Total</span>
                <span className="text-xl font-black text-white">${Number(challan.totalAmount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Insufficient Stock Error Modal */}
      {confirmErrorModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <ShieldAlert className="h-6 w-6 animate-bounce" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-rose-300">Transaction Aborted — Stock Insufficient!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Database transaction rolled back cleanly. No inventory changes were made.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed mb-4">
              {confirmErrorModal.message}
            </div>

            {confirmErrorModal.shortProducts && (
              <div className="space-y-2 mb-6">
                <p className="text-xs font-semibold text-slate-400 uppercase">Short Items Summary:</p>
                {confirmErrorModal.shortProducts.map((sp) => (
                  <div key={sp.productId} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white">{sp.name}</p>
                      <p className="font-mono text-blue-400 text-[10px]">{sp.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-rose-400 font-bold">Requested: {sp.requested}</p>
                      <p className="text-slate-400">Available: {sp.available}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setConfirmErrorModal(null)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl"
              >
                Close & Adjust Quantities
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
