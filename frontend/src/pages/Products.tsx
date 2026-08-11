import React, { useEffect, useState } from 'react';
import { Layout } from '../components/Layout';
import { productService } from '../services/productService';
import { Product, StockMovement } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { Search, Plus, Edit2, History, ArrowDownLeft, ArrowUpRight, X, AlertTriangle, Upload, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';

export const Products: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(searchParams.get('lowStock') === 'true');

  // Product Add/Edit Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category: 'Networking',
    unitPrice: '',
    currentStock: '0',
    minStockAlert: '10',
    location: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Stock Movement Modal
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [targetProduct, setTargetProduct] = useState<Product | null>(null);
  const [movementForm, setMovementForm] = useState({
    quantity: '1',
    movementType: 'IN' as 'IN' | 'OUT',
    reason: '',
  });
  const [movementError, setMovementError] = useState<string | null>(null);
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);

  // Stock History Log Drawer Modal
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [stockLogs, setStockLogs] = useState<StockMovement[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const { hasRole } = useAuth();

  const fetchProducts = async (p = page) => {
    setIsLoading(true);
    try {
      const res = await productService.getProducts({
        page: p,
        limit: 10,
        q: search || undefined,
        category: categoryFilter || undefined,
        lowStock: lowStockFilter || undefined,
      });
      setProducts(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(1);
    setPage(1);
  }, [search, categoryFilter, lowStockFilter]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchProducts(newPage);
  };

  const openCreateProductModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      sku: '',
      category: 'Networking',
      unitPrice: '',
      currentStock: '0',
      minStockAlert: '10',
      location: 'Rack A-01',
    });
    setSelectedFile(null);
    setProductFormError(null);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      unitPrice: product.unitPrice.toString(),
      currentStock: product.currentStock.toString(),
      minStockAlert: product.minStockAlert.toString(),
      location: product.location,
    });
    setSelectedFile(null);
    setProductFormError(null);
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductFormError(null);
    setIsSubmittingProduct(true);

    try {
      const formData = new FormData();
      formData.append('name', productForm.name);
      formData.append('sku', productForm.sku);
      formData.append('category', productForm.category);
      formData.append('unitPrice', productForm.unitPrice);
      formData.append('currentStock', productForm.currentStock);
      formData.append('minStockAlert', productForm.minStockAlert);
      formData.append('location', productForm.location);

      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      if (editingProduct) {
        await productService.updateProduct(editingProduct.id, formData);
      } else {
        await productService.createProduct(formData);
      }

      setIsProductModalOpen(false);
      fetchProducts(page);
    } catch (err: any) {
      setProductFormError(err.message || 'Failed to save product.');
    } finally {
      setIsSubmittingProduct(false);
    }
  };

  const openStockMovementModal = (product: Product) => {
    setTargetProduct(product);
    setMovementForm({ quantity: '1', movementType: 'IN', reason: '' });
    setMovementError(null);
    setIsMovementModalOpen(true);
  };

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProduct) return;
    setMovementError(null);
    setIsSubmittingMovement(true);

    try {
      await productService.recordStockMovement(targetProduct.id, {
        quantity: parseInt(movementForm.quantity, 10),
        movementType: movementForm.movementType,
        reason: movementForm.reason,
      });

      setIsMovementModalOpen(false);
      fetchProducts(page);
    } catch (err: any) {
      setMovementError(err.message || 'Stock movement failed.');
    } finally {
      setIsSubmittingMovement(false);
    }
  };

  const openLogModal = async (product: Product) => {
    setTargetProduct(product);
    setIsLogModalOpen(true);
    setIsLoadingLogs(true);
    try {
      const logs = await productService.getProductStockLog(product.id);
      setStockLogs(logs);
    } catch (err) {
      console.error('Failed to load stock movement log', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  return (
    <Layout title="Products & Inventory" subtitle="Manage catalog, upload S3 product photos, track min-stock alerts & stock logs">
      {/* Search & Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name, SKU, location..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Categories</option>
            <option value="Networking">Networking</option>
            <option value="Cabling">Cabling</option>
            <option value="Power Protection">Power Protection</option>
          </select>

          {/* Low Stock Toggle Button */}
          <button
            onClick={() => setLowStockFilter(!lowStockFilter)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
              lowStockFilter
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{lowStockFilter ? 'Filtering Low Stock' : 'Low Stock Only'}</span>
          </button>
        </div>

        {/* Add Product Button */}
        {hasRole('ADMIN', 'WAREHOUSE') && (
          <button
            onClick={openCreateProductModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </button>
        )}
      </div>

      {/* Product Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Product Details</th>
                <th className="px-6 py-4">SKU & Category</th>
                <th className="px-6 py-4">Unit Price</th>
                <th className="px-6 py-4">Stock Level</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-right">Inventory Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Loading inventory catalog...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No products found matching your criteria.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white text-base leading-tight">{p.name}</div>
                          {p.isLowStock && (
                            <div className="mt-1">
                              <StatusBadge type="stock" value="" isLowStock={true} />
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-semibold text-blue-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 inline-block">
                        {p.sku}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{p.category}</div>
                    </td>

                    <td className="px-6 py-4 font-bold text-white">
                      ${Number(p.unitPrice).toFixed(2)}
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-base font-extrabold text-white">{p.currentStock} units</div>
                      <div className="text-[11px] text-slate-400">Min Alert: {p.minStockAlert}</div>
                    </td>

                    <td className="px-6 py-4 text-xs font-medium text-slate-300">
                      {p.location}
                    </td>

                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openLogModal(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
                        title="Stock Audit Trail"
                      >
                        <History className="h-3.5 w-3.5 text-blue-400" />
                        <span>Audit Log</span>
                      </button>

                      {hasRole('ADMIN', 'WAREHOUSE') && (
                        <button
                          onClick={() => openStockMovementModal(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs transition-colors"
                          title="Record Stock IN/OUT"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Stock +/-</span>
                        </button>
                      )}

                      {hasRole('ADMIN', 'WAREHOUSE') && (
                        <button
                          onClick={() => openEditProductModal(p)}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
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

      {/* Add / Edit Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <h3 className="text-lg font-bold text-white">
                {editingProduct ? 'Edit Product Details' : 'Create New Product'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            {productFormError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {productFormError}
              </div>
            )}

            <form onSubmit={handleProductSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Industrial Wi-Fi 6 Router AX3000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Unique SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })}
                    placeholder="WIFI-AX3000-IND"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white uppercase font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    placeholder="Networking"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Unit Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productForm.unitPrice}
                    onChange={(e) => setProductForm({ ...productForm, unitPrice: e.target.value })}
                    placeholder="149.99"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Warehouse Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={productForm.location}
                    onChange={(e) => setProductForm({ ...productForm, location: e.target.value })}
                    placeholder="Rack A-12"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Current Stock Quantity
                  </label>
                  <input
                    type="number"
                    required
                    value={productForm.currentStock}
                    onChange={(e) => setProductForm({ ...productForm, currentStock: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Min Stock Alert Quantity
                  </label>
                  <input
                    type="number"
                    required
                    value={productForm.minStockAlert}
                    onChange={(e) => setProductForm({ ...productForm, minStockAlert: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Product Image File Upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Product Image (Uploads to AWS S3)
                </label>
                <div className="relative border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="h-6 w-6 text-slate-500 mx-auto mb-1" />
                  <p className="text-xs text-slate-300 font-medium">
                    {selectedFile ? selectedFile.name : 'Click to select image file (PNG, JPG, WEBP)'}
                  </p>
                  <p className="text-[10px] text-slate-500">Max size: 5MB</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingProduct}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm disabled:opacity-50"
                >
                  {isSubmittingProduct ? 'Saving...' : editingProduct ? 'Update Product' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Stock Movement Modal */}
      {isMovementModalOpen && targetProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Record Stock Movement</h3>
                <p className="text-xs text-slate-400">{targetProduct.name} ({targetProduct.sku})</p>
              </div>
              <button onClick={() => setIsMovementModalOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            {movementError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {movementError}
              </div>
            )}

            <div className="mb-4 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between">
              <span className="text-slate-400">Current Stock:</span>
              <span className="font-bold text-white">{targetProduct.currentStock} units</span>
            </div>

            <form onSubmit={handleMovementSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Movement Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMovementForm({ ...movementForm, movementType: 'IN' })}
                    className={`py-2 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 ${
                      movementForm.movementType === 'IN'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    <span>STOCK IN (+)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMovementForm({ ...movementForm, movementType: 'OUT' })}
                    className={`py-2 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 ${
                      movementForm.movementType === 'OUT'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    <span>STOCK OUT (-)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={movementForm.quantity}
                  onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Reason for Movement *
                </label>
                <input
                  type="text"
                  required
                  value={movementForm.reason}
                  onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                  placeholder="e.g. Received new vendor shipment / Damaged stock clearance"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMovement}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm disabled:opacity-50"
                >
                  {isSubmittingMovement ? 'Updating...' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Audit Log Modal */}
      {isLogModalOpen && targetProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white">Stock Movement Audit History</h3>
                <p className="text-xs text-slate-400">{targetProduct.name} ({targetProduct.sku})</p>
              </div>
              <button onClick={() => setIsLogModalOpen(false)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {isLoadingLogs ? (
                <div className="p-8 text-center text-slate-500 text-sm">Loading stock audit trail...</div>
              ) : stockLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">No stock movements recorded yet.</div>
              ) : (
                <div className="space-y-3">
                  {stockLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2.5 py-1 rounded-lg font-extrabold ${
                            log.movementType === 'IN'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {log.movementType === 'IN' ? `+${log.quantity}` : `-${log.quantity}`}
                        </span>
                        <div>
                          <p className="font-semibold text-slate-200">{log.reason}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Recorded by {log.createdBy.name} ({log.createdBy.role})
                          </p>
                        </div>
                      </div>
                      <div className="text-slate-500 text-right">
                        {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
