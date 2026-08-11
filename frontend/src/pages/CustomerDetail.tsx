import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { customerService } from '../services/customerService';
import { Customer, CustomerNote } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, Phone, Mail, Building, MapPin, Calendar, Clock, Plus, MessageSquare, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const CustomerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Note
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const { hasRole } = useAuth();

  const fetchCustomerDetail = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await customerService.getCustomerById(id);
      setCustomer(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load customer profile.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetail();
  }, [id]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !id) return;

    setIsSubmittingNote(true);
    try {
      await customerService.addCustomerNote(id, newNote.trim());
      setNewNote('');
      fetchCustomerDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to append note.');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  if (isLoading) {
    return (
      <Layout title="Customer Detail">
        <div className="p-12 text-center text-slate-500">Loading customer profile & history...</div>
      </Layout>
    );
  }

  if (error || !customer) {
    return (
      <Layout title="Customer Detail">
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          {error || 'Customer not found.'}
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={customer.businessName} subtitle={`Customer Code: ${customer.id.substring(0, 8)}`}>
      {/* Back Button */}
      <Link
        to="/customers"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Customer List</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Business Info Card */}
        <div className="space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white text-lg">{customer.businessName}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Contact: {customer.name}</p>
              </div>
              <StatusBadge type="status" value={customer.status} />
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs uppercase font-semibold">Type:</span>
                <StatusBadge type="type" value={customer.customerType} />
              </div>

              {customer.gstNumber && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs uppercase font-semibold">GST No:</span>
                  <span className="font-mono text-slate-200 text-xs bg-slate-900 px-2 py-1 rounded border border-slate-800">
                    {customer.gstNumber}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-900">
                <span className="text-slate-500 text-xs uppercase font-semibold block mb-1">Mobile:</span>
                <span className="text-slate-200 font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-blue-400" />
                  {customer.mobile}
                </span>
              </div>

              {customer.email && (
                <div>
                  <span className="text-slate-500 text-xs uppercase font-semibold block mb-1">Email:</span>
                  <span className="text-slate-200 font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-400" />
                    {customer.email}
                  </span>
                </div>
              )}

              <div>
                <span className="text-slate-500 text-xs uppercase font-semibold block mb-1">Address:</span>
                <span className="text-slate-300 text-xs flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  {customer.address}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-900">
                <span className="text-slate-500 text-xs uppercase font-semibold block mb-1">Next Follow-Up Date:</span>
                <span className="text-amber-400 font-semibold flex items-center gap-2 text-xs">
                  <Calendar className="h-4 w-4" />
                  {customer.followUpDate ? new Date(customer.followUpDate).toLocaleDateString('en-US', { dateStyle: 'full' }) : 'No pending date'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Follow-up Timeline Notes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="font-bold text-white text-lg mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-400" />
              <span>Follow-Up Notes & Interactions Timeline</span>
            </h3>

            {/* Add Note Input Form */}
            {hasRole('ADMIN', 'SALES') && (
              <form onSubmit={handleAddNote} className="mb-6 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                  Log New Call / Meeting Note
                </label>
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="e.g. Called Rajesh regarding upcoming order requirements for AX3000 routers..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingNote || !newNote.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{isSubmittingNote ? 'Saving...' : 'Add Note to Timeline'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Timeline Stream */}
            <div className="space-y-4 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-800">
              {customer.notesHistory && customer.notesHistory.length > 0 ? (
                customer.notesHistory.map((note) => (
                  <div key={note.id} className="relative pl-10 group">
                    <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-blue-500 border-2 border-slate-950 group-hover:scale-125 transition-transform"></div>
                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-3.5 w-3.5 text-blue-400" />
                          <span className="font-semibold text-slate-200">{note.createdBy.name}</span>
                          <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 uppercase">
                            {note.createdBy.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(note.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">{note.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="pl-6 text-sm text-slate-500 italic py-4">
                  No notes recorded yet. Add the first note above!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
