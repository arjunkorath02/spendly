import { useState, useRef } from 'react';
import { Camera, LogOut, Building2, Plus, Trash2, X, Check, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useBankAccounts } from '../hooks/useExpenses';

const ACCOUNT_COLORS = ['#007AFF', '#34C759', '#FF3B30', '#FF9500', '#AF52DE', '#5AC8FA', '#FF2D55', '#FFCC00'];

type BankModalState = {
  mode: 'add' | 'edit';
  id?: string;
  name: string;
  bankName: string;
  accountType: string;
  color: string;
} | null;

export default function ProfileScreen() {
  const { user, profile, signOut, updateProfile, refreshProfile } = useAuth();
  const { accounts, refresh: refreshAccounts } = useBankAccounts();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [bankModal, setBankModal] = useState<BankModalState>(null);
  const [savingBank, setSavingBank] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingPhoto(true);
    const ext = file.name.split('.').pop();
    const path = `avatars/${user.id}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      await updateProfile({ avatar_url: data.publicUrl + '?t=' + Date.now() });
      await refreshProfile();
    }
    setUploadingPhoto(false);
  };

  const saveName = async () => {
    if (!displayName.trim()) return;
    setSavingName(true);
    await updateProfile({ display_name: displayName.trim() });
    setSavingName(false);
    setEditingName(false);
  };

  const saveBank = async () => {
    if (!bankModal || !bankModal.name.trim() || !bankModal.bankName.trim() || !user) return;
    setSavingBank(true);

    if (bankModal.mode === 'add') {
      await supabase.from('bank_accounts').insert({
        user_id: user.id,
        name: bankModal.name.trim(),
        bank_name: bankModal.bankName.trim(),
        account_type: bankModal.accountType,
        color: bankModal.color,
      });
    } else if (bankModal.id) {
      await supabase.from('bank_accounts').update({
        name: bankModal.name.trim(),
        bank_name: bankModal.bankName.trim(),
        account_type: bankModal.accountType,
        color: bankModal.color,
      }).eq('id', bankModal.id);
    }

    await refreshAccounts();
    setSavingBank(false);
    setBankModal(null);
  };

  const deleteBank = async (id: string) => {
    if (!confirm('Remove this bank account?')) return;
    await supabase.from('bank_accounts').update({ is_active: false }).eq('id', id);
    await refreshAccounts();
  };

  const avatarUrl = profile?.avatar_url;
  const initials = (profile?.display_name || profile?.email || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
      </div>

      <div className="px-4 space-y-4 pb-8">
        {/* Profile card */}
        <div className="card-glass rounded-3xl p-5">
          {/* Avatar */}
          <div className="flex flex-col items-center mb-5">
            <div className="relative mb-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-24 h-24 rounded-3xl object-cover ring-4 ring-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center ring-4 ring-white shadow-lg">
                  <span className="text-2xl font-bold text-white">{initials}</span>
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg"
              >
                {uploadingPhoto ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera size={14} className="text-white" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
            <p className="text-xs text-gray-400">Tap camera to change photo</p>
          </div>

          {/* Name editing */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Display Name</label>
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="input-glass flex-1 px-3 py-2.5 text-sm"
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                  />
                  <button onClick={saveName} disabled={savingName} className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                    <Check size={16} className="text-white" />
                  </button>
                  <button onClick={() => setEditingName(false)} className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <X size={16} className="text-gray-600" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setDisplayName(profile?.display_name || ''); setEditingName(true); }}
                  className="w-full input-glass px-3 py-2.5 text-sm text-left flex items-center justify-between"
                >
                  <span className="text-gray-900">{profile?.display_name || 'Set your name'}</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Email</label>
              <div className="input-glass px-3 py-2.5 text-sm text-gray-500">
                {profile?.email || user?.email}
              </div>
            </div>
          </div>
        </div>

        {/* Bank accounts */}
        <div className="card-glass rounded-3xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-blue-500" />
              <h2 className="text-base font-bold text-gray-900">Bank Accounts</h2>
            </div>
            <button
              onClick={() => setBankModal({ mode: 'add', name: '', bankName: '', accountType: 'checking', color: ACCOUNT_COLORS[0] })}
              className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center"
            >
              <Plus size={16} className="text-blue-500" />
            </button>
          </div>

          {accounts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No bank accounts added yet</p>
          ) : (
            <div className="space-y-2">
              {accounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: acc.color + '22' }}>
                      <Building2 size={18} style={{ color: acc.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{acc.name}</p>
                      <p className="text-xs text-gray-400">{acc.bank_name} · {acc.account_type}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBankModal({ mode: 'edit', id: acc.id, name: acc.name, bankName: acc.bank_name, accountType: acc.account_type, color: acc.color })}
                      className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm"
                    >
                      <ChevronRight size={14} className="text-gray-400" />
                    </button>
                    <button
                      onClick={() => deleteBank(acc.id)}
                      className="w-8 h-8 bg-red-50 rounded-xl flex items-center justify-center"
                    >
                      <Trash2 size={14} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          className="w-full card-glass rounded-2xl p-4 flex items-center justify-between text-red-500"
        >
          <div className="flex items-center gap-3">
            <LogOut size={18} />
            <span className="text-sm font-semibold">Sign Out</span>
          </div>
          <ChevronRight size={16} className="opacity-60" />
        </button>
      </div>

      {/* Bank modal */}
      {bankModal && (
        <div className="fixed inset-0 z-50 modal-overlay flex items-end justify-center p-4">
          <div className="card-glass rounded-3xl p-5 w-full max-w-sm animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">
                {bankModal.mode === 'add' ? 'Add Bank Account' : 'Edit Account'}
              </h3>
              <button onClick={() => setBankModal(null)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <X size={14} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Account Nickname</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Savings"
                  value={bankModal.name}
                  onChange={e => setBankModal(b => b ? { ...b, name: e.target.value } : b)}
                  className="input-glass w-full px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank"
                  value={bankModal.bankName}
                  onChange={e => setBankModal(b => b ? { ...b, bankName: e.target.value } : b)}
                  className="input-glass w-full px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Account Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['checking', 'savings', 'credit'].map(type => (
                    <button
                      key={type}
                      onClick={() => setBankModal(b => b ? { ...b, accountType: type } : b)}
                      className={`py-2 rounded-xl text-xs font-medium transition-all capitalize ${
                        bankModal.accountType === type ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {ACCOUNT_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setBankModal(b => b ? { ...b, color } : b)}
                      className="w-8 h-8 rounded-xl transition-transform hover:scale-110"
                      style={{ backgroundColor: color }}
                    >
                      {bankModal.color === color && <Check size={14} className="text-white mx-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setBankModal(null)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 text-sm font-medium">
                Cancel
              </button>
              <button
                onClick={saveBank}
                disabled={savingBank || !bankModal.name.trim()}
                className="flex-1 py-3 btn-primary text-sm disabled:opacity-60"
              >
                {savingBank ? 'Saving...' : bankModal.mode === 'add' ? 'Add Account' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
