import { useState, useId } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  X,
  Wallet,
  AlertTriangle,
  Plus,
  Trash2,
  ArrowRight,
  Send,
  Save,
  HelpCircle,
} from 'lucide-react';
import { createBudgetRequestApi } from '@/lib/api-budgets';
import { getProjectsApi, getProjectApi } from '@/lib/api-projects';
import { getExpenseCategoriesApi } from '@/lib/api-super-admin';
import { extractErrorMessage } from '@/lib/utils';
import type {
  BudgetRequestType,
  CreateBudgetRequestPayload,
  CreateBudgetRequestItemPayload,
  Budget,
} from '@/types/budgets';

interface FormItem {
  id: string;
  categoryId: string;
  phaseId: string;
  newAmount: string;
  oldAmount?: number;
}

interface Props {
  projectId?: string;
  projectName?: string;
  activeBudget?: Budget | null;
  defaultType?: BudgetRequestType;
  onClose: () => void;
  onSuccess: () => void;
}

function formatRupiah(num: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function BudgetRequestFormModal({
  projectId: initialProjectId,
  projectName: initialProjectName,
  activeBudget,
  defaultType,
  onClose,
  onSuccess,
}: Props) {
  const isPerubahan = !!activeBudget || defaultType === 'perubahan';
  const [projectId, setProjectId] = useState<string>(initialProjectId ?? '');
  const [type, setType] = useState<BudgetRequestType>(
    defaultType ?? (isPerubahan ? 'perubahan' : 'awal'),
  );
  const [reason, setReason] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const initialItems: FormItem[] =
    isPerubahan && activeBudget?.items && activeBudget.items.length > 0
      ? activeBudget.items.map((it) => ({
          id: it.id,
          categoryId: it.categoryId,
          phaseId: it.phaseId ?? '',
          newAmount: Number(it.amount).toLocaleString('id-ID'),
          oldAmount: Number(it.amount),
        }))
      : [
          {
            id: 'item-1',
            categoryId: '',
            phaseId: '',
            newAmount: '',
          },
        ];

  const [items, setItems] = useState<FormItem[]>(initialItems);

  // Load project list jika projectId tidak diprovide dari parent
  const { data: projectsData } = useQuery({
    queryKey: ['projects-select'],
    queryFn: () => getProjectsApi({ limit: 100 }),
    enabled: !initialProjectId,
  });

  // Load project detail untuk mengambil daftar fase
  const targetProjectId = initialProjectId || projectId;
  const { data: projectDetail } = useQuery({
    queryKey: ['project-detail-phases', targetProjectId],
    queryFn: () => getProjectApi(targetProjectId),
    enabled: !!targetProjectId,
  });

  // Load master kategori pengeluaran
  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories-select'],
    queryFn: () => getExpenseCategoriesApi(true),
  });

  const phases = projectDetail?.phases ?? [];

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        categoryId: '',
        phaseId: '',
        newAmount: '',
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      setFormError('Pengajuan anggaran harus memiliki minimal 1 item.');
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleItemChange = (
    id: string,
    field: 'categoryId' | 'phaseId' | 'newAmount',
    val: string,
  ) => {
    setFormError(null);
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === 'newAmount') {
          const digits = val.replace(/\D/g, '');
          const num = parseInt(digits, 10);
          return {
            ...item,
            newAmount: isNaN(num) ? '' : num.toLocaleString('id-ID'),
          };
        }
        return { ...item, [field]: val };
      }),
    );
  };

  const totalAmount = items.reduce((acc, curr) => {
    const num = parseFloat(curr.newAmount.replace(/\D/g, '')) || 0;
    return acc + num;
  }, 0);

  const mutation = useMutation({
    mutationFn: (payload: CreateBudgetRequestPayload) => createBudgetRequestApi(payload),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: unknown) => {
      setFormError(extractErrorMessage(err, 'Gagal mengajukan anggaran'));
    },
  });

  const handleSubmit = (submitNow: boolean) => {
    setFormError(null);

    if (!targetProjectId) {
      setFormError('Pilih proyek terlebih dahulu.');
      return;
    }

    if (type === 'perubahan' && !reason.trim()) {
      setFormError('Alasan perubahan wajib diisi pada pengajuan jenis perubahan.');
      return;
    }

    if (items.length === 0) {
      setFormError('Harap sertakan minimal 1 item kategori anggaran.');
      return;
    }

    const payloadItems: CreateBudgetRequestItemPayload[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.categoryId) {
        setFormError(`Kategori pada item baris ke-${i + 1} wajib dipilih.`);
        return;
      }
      const num = parseFloat(it.newAmount.replace(/\D/g, ''));
      if (!num || num <= 0) {
        setFormError(`Nominal pada item baris ke-${i + 1} harus lebih besar dari 0.`);
        return;
      }
      payloadItems.push({
        categoryId: it.categoryId,
        phaseId: it.phaseId || null,
        newAmount: num,
        oldAmount: it.oldAmount,
      });
    }

    const payload: CreateBudgetRequestPayload = {
      projectId: targetProjectId,
      type,
      reason: reason.trim() || undefined,
      newEndDate: newEndDate || undefined,
      items: payloadItems,
      submitNow,
    };

    mutation.mutate(payload);
  };

  const typeRadioIdPrefix = useId();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-darkest/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-text-primary">
                {type === 'awal' ? 'Pengajuan Anggaran Awal' : 'Pengajuan Perubahan Anggaran'}
              </h2>
              <p className="text-xs text-text-secondary">
                {initialProjectName ?? projectDetail?.name ?? 'Formulir Alokasi Anggaran Proyek'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-placeholder hover:bg-background hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Visual Stepper 4-Langkah Persetujuan */}
          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                Alur 4 Langkah Persetujuan Anggaran
              </span>
              <span className="text-[11px] text-text-placeholder flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                Sesuai Aturan Bisnis
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { step: '1', title: 'Pengajuan', role: 'Admin / Super Admin', color: 'bg-red-50 border-red-200 text-primary font-semibold' },
                { step: '2', title: 'Kelayakan', role: 'Finance', color: 'bg-white border-border text-text-secondary' },
                { step: '3', title: 'Persetujuan', role: 'Super Admin', color: 'bg-white border-border text-text-secondary' },
                { step: '4', title: 'Baseline', role: 'Terkunci', color: 'bg-white border-border text-text-secondary' },
              ].map((s, idx) => (
                <div key={s.step} className={`rounded-lg border p-2.5 text-center text-xs ${s.color}`}>
                  <div className="flex items-center justify-center gap-1 font-bold mb-0.5">
                    <span>Langkah {s.step}</span>
                    {idx < 3 && <ArrowRight className="h-3 w-3 opacity-40 inline sm:hidden" />}
                  </div>
                  <p className="text-text-primary font-medium">{s.title}</p>
                  <p className="text-[10px] text-text-placeholder">{s.role}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Form Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Proyek Selector (jika belum ditentukan) */}
            {!initialProjectId && (
              <div className="sm:col-span-2">
                <label htmlFor="budget-project-select" className="block text-sm font-medium text-text-primary mb-1">
                  Pilih Proyek <span className="text-[#B0000F]">*</span>
                </label>
                <select
                  id="budget-project-select"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-white px-3.5 py-2.5 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">-- Pilih Proyek --</option>
                  {(projectsData?.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.costCenter?.code ?? p.department?.name ?? 'Proyek'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Jenis Pengajuan */}
            <div>
              <span className="block text-sm font-medium text-text-primary mb-1">
                Jenis Pengajuan <span className="text-[#B0000F]">*</span>
              </span>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                  <input
                    id={`${typeRadioIdPrefix}-type-awal`}
                    type="radio"
                    name="requestType"
                    value="awal"
                    checked={type === 'awal'}
                    onChange={() => setType('awal')}
                    className="text-primary focus:ring-primary"
                  />
                  <span>Anggaran Awal</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                  <input
                    id={`${typeRadioIdPrefix}-type-perubahan`}
                    type="radio"
                    name="requestType"
                    value="perubahan"
                    checked={type === 'perubahan'}
                    onChange={() => setType('perubahan')}
                    className="text-primary focus:ring-primary"
                  />
                  <span>Perubahan Anggaran</span>
                </label>
              </div>
            </div>

            {/* Tanggal Akhir Baru (opsional) */}
            <div>
              <label htmlFor="budget-new-end-date" className="block text-sm font-medium text-text-primary mb-1">
                Perpanjangan Tanggal Proyek <span className="text-text-placeholder text-xs">(opsional)</span>
              </label>
              <input
                id="budget-new-end-date"
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3.5 py-2 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Alasan (wajib jika perubahan) */}
            <div className="sm:col-span-2">
              <label htmlFor="budget-request-reason" className="block text-sm font-medium text-text-primary mb-1">
                Alasan Pengajuan {type === 'perubahan' && <span className="text-[#B0000F]">* (Wajib untuk perubahan)</span>}
              </label>
              <textarea
                id="budget-request-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  type === 'perubahan'
                    ? 'Jelaskan latar belakang perlunya perubahan batas anggaran atau penambahan lingkup...'
                    : 'Catatan tambahan pengajuan anggaran awal (opsional)...'
                }
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-text-primary placeholder:text-text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </div>

          {/* Rincian Item Anggaran per Fase & Kategori */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-text-primary">Rincian Alokasi Kategori &amp; Fase</h3>
                <p className="text-xs text-text-secondary">Tentukan alokasi batas biaya per kategori dan fase proyek</p>
              </div>
              <button
                type="button"
                id="btn-add-budget-item"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:border-primary transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Kategori
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-xl border border-border bg-white p-3.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between sm:hidden text-xs font-bold text-text-secondary mb-1">
                    <span>Baris #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-danger hover:underline"
                    >
                      Hapus
                    </button>
                  </div>

                  {/* Kategori Pengeluaran */}
                  <div className="flex-1 min-w-[160px]">
                    <label htmlFor={`budget-item-category-${idx}`} className="block text-[11px] text-text-placeholder mb-1">
                      Kategori *
                    </label>
                    <select
                      id={`budget-item-category-${idx}`}
                      value={item.categoryId}
                      onChange={(e) => handleItemChange(item.id, 'categoryId', e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-text-primary focus:border-primary focus:outline-none"
                    >
                      <option value="">-- Pilih Kategori --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} – {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Fase Proyek (jika ada) */}
                  <div className="flex-1 min-w-[140px]">
                    <label htmlFor={`budget-item-phase-${idx}`} className="block text-[11px] text-text-placeholder mb-1">
                      Fase Proyek
                    </label>
                    <select
                      id={`budget-item-phase-${idx}`}
                      value={item.phaseId}
                      onChange={(e) => handleItemChange(item.id, 'phaseId', e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-text-primary focus:border-primary focus:outline-none"
                    >
                      <option value="">(Seluruh Fase)</option>
                      {phases.map((ph) => (
                        <option key={ph.id} value={ph.id}>
                          {ph.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Nominal Baru */}
                  <div className="w-full sm:w-44">
                    <label htmlFor={`budget-item-amount-${idx}`} className="block text-[11px] text-text-placeholder mb-1">
                      Nominal Alokasi (Rp) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text-secondary">Rp</span>
                      <input
                        id={`budget-item-amount-${idx}`}
                        type="text"
                        inputMode="numeric"
                        value={item.newAmount}
                        onChange={(e) => handleItemChange(item.id, 'newAmount', e.target.value)}
                        placeholder="0"
                        className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-2.5 text-xs font-semibold text-text-primary focus:border-primary focus:outline-none text-right"
                      />
                    </div>
                  </div>

                  {/* Tombol Hapus Baris */}
                  <div className="hidden sm:flex items-center pt-5">
                    <button
                      type="button"
                      id={`btn-remove-budget-item-${idx}`}
                      onClick={() => handleRemoveItem(item.id)}
                      title="Hapus baris"
                      className="rounded-lg p-2 text-text-placeholder hover:bg-[#FCE4E7] hover:text-[#B0000F] transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Footer */}
            <div className="mt-4 flex items-center justify-between rounded-xl bg-background p-4 border border-border">
              <span className="text-sm font-semibold text-text-secondary">Total Pengajuan Anggaran</span>
              <span className="font-heading text-lg font-bold text-primary">
                {formatRupiah(totalAmount)}
              </span>
            </div>
          </div>

          {/* Alert Error */}
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-[#B0000F]/30 bg-[#FCE4E7] p-4 text-xs text-[#B0000F]">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Validasi Formulir Gagal</p>
                <p className="mt-0.5">{formError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border px-6 py-4 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-background transition-colors"
          >
            Batal
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              id="btn-save-budget-draft"
              disabled={mutation.isPending}
              onClick={() => handleSubmit(false)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-text-primary hover:bg-background disabled:opacity-50 transition-colors"
            >
              <Save className="h-4 w-4" />
              Simpan Draft
            </button>
            <button
              type="button"
              id="btn-submit-budget-request"
              disabled={mutation.isPending}
              onClick={() => handleSubmit(true)}
              className="inline-flex items-center gap-1.5 rounded-xl gradient-primary px-5 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50 hover:opacity-95 transition-opacity"
            >
              {mutation.isPending ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Kirim Pengajuan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
