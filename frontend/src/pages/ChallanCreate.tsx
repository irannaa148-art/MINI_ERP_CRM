import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { customerService } from '../services/customerService';
import { productService } from '../services/productService';
import { challanService } from '../services/challanService';
import { Customer, Product } from '../types';
import { ArrowLeft, Plus, Trash2, ShoppingBag, AlertTriangle, CheckCircle } from 'lucide-react';

interface SelectedItemRow {
  productId: string;
  quantity: number;
}

export const ChallanCreate: React.FC = () => {
  const navigate = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingMasterData, setIsLoadingMasterData] = useState(true);

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [itemRows, setItemRows] = useState<SelectedItemRow[]>([
    { productId: '', quantity: 1 },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [cRes, pRes] = await Promise.all([
          customerService.getCustomers({ limit: 100, status: 'ACTIVE' }),
          productService.getProducts({ limit: 100 }),
        ]);
        setCustomers(cRes.data);
        setProducts(pRes.data);
        if (cRes.data.length > 0) {
          setSelectedCustomerId(cRes.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load master customer & product data', err);
      } finally {
        setIsLoadingMasterData(false);
      }
    };

    fetchMasterData();
  }, []);

  const handleAddRow = () => {
    setItemRows([...itemRows, { productId: '', quantity: 1 }]);
  };

  const handleRemoveRow = (index: number) => {
    if (itemRows.length <= 1) return;
    const updated = itemRows.filter((_, i) => i !== index);
    setItemRows(updated);
  };

  const handleRowChange = (index: number, field: keyof SelectedItemRow, value: any) => {
    const updated = [...itemRows];
    updated[index] = { ...updated[index], [field]: value };
    setItemRows(updated);
  };

  // Calculations
  const productMap = new Map(products.map((p) => [p.id, p]));

  let totalQty = 0;
  let totalAmount = 0;

  const rowsCalculated = itemRows.map((row) => {
    const product = row.productId ? productMap.get(row.productId) : null;
    const unitPrice = product ? Number(product.unitPrice) : 0;
    const lineTotal = unitPrice * (row.quantity || 0);

    if (row.productId) {
      totalQty += row.quantity || 0;
      totalAmount += lineTotal;
    }

    const availableStock = product ? product.currentStock : 0;
    const isExceedingStock = product ? row.quantity > availableStock : false;

    return {
      ...row,
      product,
      unitPrice,
      lineTotal,
      availableStock,
      isExceedingStock,
    };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCustomerId) {
      setError('Please select a customer.');
      return;
    }

    const validItems = itemRows.filter((r) => r.productId && r.quantity > 0);
    if (validItems.length === 0) {
      setError('Please add at least one valid product line item.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await challanService.createChallan({
        customerId: selectedCustomerId,
        items: validItems,
      });

      navigate(`/challans/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create challan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingMasterData) {
    return (
      <Layout title="Create Sales Challan">
        <div className="p-12 text-center text-slate-500">Loading active customers & inventory items...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Create Sales Challan" subtitle="Draft new wholesale order with live inventory availability feedback">
      {/* Back Button */}
      <Link
        to="/challans"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Sales Challans</span>
      </Link>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selector Card */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-blue-400" />
            <span>Select Customer Account</span>
          </h3>

          <div className="max-w-md">
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
              Customer / Business Name *
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              required
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">-- Choose Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.businessName} ({c.name} - {c.mobile})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Line Items Table Builder */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-white text-base">Challan Line Items</h3>
            <button
              type="button"
              onClick={handleAddRow}
              className="px-3 py-1.5 bg-blue-600/15 border border-blue-500/30 text-blue-400 hover:bg-blue-600/25 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Product Row</span>
            </button>
          </div>

          <div className="space-y-3">
            {rowsCalculated.map((row, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
              >
                {/* Product Select */}
                <div className="md:col-span-5">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Select Product *
                  </label>
                  <select
                    value={row.productId}
                    onChange={(e) => handleRowChange(index, 'productId', e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Select Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — Stock: {p.currentStock} units
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity Input */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">
                    Order Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={row.quantity}
                    onChange={(e) => handleRowChange(index, 'quantity', parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Price Snapshot */}
                <div className="md:col-span-2 text-xs">
                  <span className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Unit Price</span>
                  <span className="font-bold text-slate-200">${row.unitPrice.toFixed(2)}</span>
                </div>

                {/* Line Total */}
                <div className="md:col-span-2 text-xs">
                  <span className="block text-[11px] font-semibold text-slate-400 uppercase mb-1">Line Total</span>
                  <span className="font-extrabold text-blue-400 text-sm">${row.lineTotal.toFixed(2)}</span>
                </div>

                {/* Remove Row Action */}
                <div className="md:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveRow(index)}
                    disabled={itemRows.length <= 1}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Live Stock Warning feedback */}
                {row.product && (
                  <div className="md:col-span-12 text-xs pt-1 flex items-center justify-between border-t border-slate-800/40">
                    <span className="text-slate-400">
                      Product SKU: <span className="font-mono text-slate-300">{row.product.sku}</span> | Available Stock:{' '}
                      <span className={`font-bold ${row.availableStock < 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {row.availableStock} units
                      </span>
                    </span>

                    {row.isExceedingStock && (
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Requested quantity exceeds current available stock! (Will block confirmation)
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Grand Total Summary Box */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-400">
              Total Quantity: <span className="font-bold text-white">{totalQty} units</span> across{' '}
              <span className="font-bold text-white">{itemRows.length} line item(s)</span>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 font-semibold uppercase block">Grand Total Amount</span>
              <span className="text-2xl font-black text-white">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-4">
          <Link
            to="/challans"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !selectedCustomerId}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/25 disabled:opacity-50"
          >
            {isSubmitting ? 'Creating Draft...' : 'Save Draft Challan'}
          </button>
        </div>
      </form>
    </Layout>
  );
};
