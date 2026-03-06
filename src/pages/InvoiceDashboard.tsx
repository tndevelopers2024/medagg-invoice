import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MultiSelect } from '@/components/ui/multi-select';
import { companyDetails, calculateInvoiceStatus, calculateShortExcess } from '@/data/mockData';
import { Plus, Download, Pencil, CreditCard, Trash2, FileSpreadsheet, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Invoice, Payment } from '@/types';
import { format } from 'date-fns';
import logoImage from '@/assets/logo.png';
import { apiFetch } from '@/lib/apiClient';

const asArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const v = value as any;
    if (Array.isArray(v.items)) return v.items as T[];
    if (Array.isArray(v.data)) return v.data as T[];
    if (Array.isArray(v.results)) return v.results as T[];
    if (Array.isArray(v.hospitals)) return v.hospitals as T[];
    if (Array.isArray(v.invoices)) return v.invoices as T[];
    if (Array.isArray(v.patients)) return v.patients as T[];
  }
  return [];
};

const InvoiceDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [monthFilter, setMonthFilter] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<string[]>(['2026']);
  const [appointmentMonthFilter, setAppointmentMonthFilter] = useState<string[]>([]);
  const [hospitalFilter, setHospitalFilter] = useState<string[]>([]);
  const [areaFilter, setAreaFilter] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  const safeHospitals = useMemo(() => asArray<any>(hospitals), [hospitals]);
  const safePatients = useMemo(() => asArray<any>(patients), [patients]);
  const safeInvoices = useMemo(() => asArray<Invoice>(invoices), [invoices]);

  const areas = useMemo(() => [...new Set(safeHospitals.map(h => h.area).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [safeHospitals]);
  const cities = useMemo(() => [...new Set(safeHospitals.map(h => h.city).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [safeHospitals]);

  const [paymentData, setPaymentData] = useState({ paymentDate: format(new Date(), 'yyyy-MM-dd'), paidAmount: 0, tdsPercent: 0, tdsAmount: 0, adjustmentAmount: 0, remarks: '' });

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  // Multi-select options - sorted A-Z (no "All" option for multi-select)
  const hospitalOptions = useMemo(() => 
    safeHospitals.slice().sort((a, b) => a.name.localeCompare(b.name)).map(h => ({ value: h.id, label: h.name, sublabel: `${h.city}${h.area ? `, ${h.area}` : ''}` }))
  , [safeHospitals]);

  const areaOptions = useMemo(() => 
    areas.map(a => ({ value: a, label: a }))
  , [areas]);

  const cityOptions = useMemo(() => 
    cities.map(c => ({ value: c, label: c }))
  , [cities]);

  const statusOptions = [
    { value: 'Unpaid', label: 'Unpaid' },
    { value: 'Paid', label: 'Paid' },
    { value: 'Amount Adjusted', label: 'Amount Adjusted' },
    { value: 'Hold', label: 'Hold' },
    { value: 'Cancelled', label: 'Cancelled' },
  ];

  const appointmentMonthOptions = months.map(m => ({ value: m.value.toString(), label: m.label }));
  
  // Month and Year options for multi-select
  const monthOptions = months.map(m => ({ value: m.value.toString(), label: m.label }));
  
  // Generate years dynamically (current year - 2 to current year + 10)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2024;
    const endYear = currentYear + 10;
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push({ value: year.toString(), label: year.toString() });
    }
    return years;
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [inv, hosp, pat] = await Promise.all([
          apiFetch<Invoice[]>('/api/invoices'),
          apiFetch<any[]>('/api/hospitals'),
          apiFetch<any[]>('/api/patients'),
        ]);
        setInvoices(asArray<Invoice>(inv));
        setHospitals(asArray<any>(hosp));
        setPatients(asArray<any>(pat));
      } catch (e) {
        toast({
          title: 'Error',
          description: (e as Error)?.message || 'Failed to load invoices.',
          variant: 'destructive',
        });
      }
    };
    load();
  }, [toast]);

  const refreshInvoices = async () => {
    const inv = await apiFetch<Invoice[]>('/api/invoices');
    setInvoices(asArray<Invoice>(inv));
  };

  const refreshPatients = async () => {
    const pat = await apiFetch<any[]>('/api/patients');
    setPatients(asArray<any>(pat));
  };

  const filteredInvoices = useMemo(() => {
    let filtered = safeInvoices;
    if (yearFilter.length > 0) {
      const selectedYears = yearFilter.map(y => parseInt(y));
      filtered = filtered.filter(inv => selectedYears.includes(inv.year));
      if (monthFilter.length > 0) {
        const selectedMonths = monthFilter.map(m => parseInt(m));
        filtered = filtered.filter(inv => selectedMonths.includes(inv.month));
      }
    }
    if (hospitalFilter.length > 0) filtered = filtered.filter(inv => hospitalFilter.includes(inv.hospitalId));
    if (areaFilter.length > 0) filtered = filtered.filter(inv => inv.hospitalArea && areaFilter.includes(inv.hospitalArea));
    if (cityFilter.length > 0) filtered = filtered.filter(inv => inv.hospitalCity && cityFilter.includes(inv.hospitalCity));
    if (statusFilter.length > 0) filtered = filtered.filter(inv => statusFilter.includes(inv.status));
    
    // Filter by appointment month (multi-select)
    if (appointmentMonthFilter.length > 0 && yearFilter.length > 0) {
      const selectedMonths = appointmentMonthFilter.map(m => parseInt(m));
      filtered = filtered.filter(inv => {
        return inv.items.some(item => {
          if (item.patientDate) {
            const itemDate = new Date(item.patientDate);
            return selectedMonths.includes(itemDate.getMonth() + 1);
          }
          return false;
        });
      });
    }
    
    // Common search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(inv => {
        const invoiceNo = inv.invoiceNumber?.toLowerCase() || '';
        const hospitalName = inv.hospitalName?.toLowerCase() || '';
        const area = inv.hospitalArea?.toLowerCase() || '';
        const city = inv.hospitalCity?.toLowerCase() || '';
        const status = inv.status?.toLowerCase() || '';
        const date = inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : '';
        
        return invoiceNo.includes(query) ||
               hospitalName.includes(query) ||
               area.includes(query) ||
               city.includes(query) ||
               status.includes(query) ||
               date.includes(query);
      });
    }
    
    return filtered;
  }, [safeInvoices, yearFilter, monthFilter, hospitalFilter, areaFilter, cityFilter, statusFilter, appointmentMonthFilter, searchQuery]);

  // Separate by status for display
  // Cancelled = INCLUDED in total invoice amount (don't decrease)
  // Hold = EXCLUDED from total invoice amount (decrease)
  const cancelledInvoices = filteredInvoices.filter(inv => inv.status === 'Cancelled');
  const holdInvoices = filteredInvoices.filter(inv => inv.status === 'Hold');
  const nonHoldInvoices = filteredInvoices.filter(inv => inv.status !== 'Hold'); // Includes Cancelled
  const activeInvoices = filteredInvoices.filter(inv => inv.status !== 'Cancelled' && inv.status !== 'Hold');

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  // Auto-calculate TDS amount when TDS % or paid/adjusted amount changes
  const handlePaidAmountChange = (value: number) => {
    const tdsAmount = (value * paymentData.tdsPercent) / 100;
    setPaymentData(p => ({ ...p, paidAmount: value, tdsAmount }));
  };

  const handleAdjustmentAmountChange = (value: number) => {
    // Calculate TDS on adjusted amount if paid is 0
    const baseAmount = paymentData.paidAmount > 0 ? paymentData.paidAmount : value;
    const tdsAmount = (baseAmount * paymentData.tdsPercent) / 100;
    setPaymentData(p => ({ ...p, adjustmentAmount: value, tdsAmount }));
  };

  const handleTdsPercentChange = (value: number) => {
    const baseAmount = paymentData.paidAmount > 0 ? paymentData.paidAmount : paymentData.adjustmentAmount;
    const tdsAmount = (baseAmount * value) / 100;
    setPaymentData(p => ({ ...p, tdsPercent: value, tdsAmount }));
  };

  const handleOpenPaymentDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setEditingPaymentIndex(null);
    setPaymentData({ paymentDate: format(new Date(), 'yyyy-MM-dd'), paidAmount: 0, tdsPercent: invoice.tdsPercent || 0, tdsAmount: 0, adjustmentAmount: 0, remarks: '' });
    setPaymentDialogOpen(true);
  };

  const handleEditPayment = (index: number) => {
    if (!selectedInvoice) return;
    const payment = selectedInvoice.payments[index];
    setEditingPaymentIndex(index);
    setPaymentData({
      paymentDate: payment.paymentDate,
      paidAmount: payment.paidAmount,
      tdsPercent: payment.tdsPercent,
      tdsAmount: payment.tdsAmount,
      adjustmentAmount: payment.adjustmentAmount,
      remarks: payment.remarks,
    });
  };

  const savePayment = async () => {
    if (!selectedInvoice) return;
    if (editingPaymentIndex === null && paymentData.paidAmount <= 0 && paymentData.adjustmentAmount <= 0) return;

    let updatedPayments = [...(selectedInvoice.payments || [])];
    
    if (editingPaymentIndex !== null) {
      updatedPayments[editingPaymentIndex] = {
        ...updatedPayments[editingPaymentIndex],
        paymentDate: paymentData.paymentDate,
        paidAmount: paymentData.paidAmount,
        tdsPercent: paymentData.tdsPercent,
        tdsAmount: paymentData.tdsAmount,
        adjustmentAmount: paymentData.adjustmentAmount,
        remarks: paymentData.remarks,
      };
    } else {
      const newPayment: Payment = {
        id: String(Date.now()), invoiceId: selectedInvoice.id,
        paymentDate: paymentData.paymentDate, paidAmount: paymentData.paidAmount,
        tdsPercent: paymentData.tdsPercent, tdsAmount: paymentData.tdsAmount,
        adjustmentAmount: paymentData.adjustmentAmount, remarks: paymentData.remarks,
      };
      updatedPayments.push(newPayment);
    }

    const totalPaid = updatedPayments.reduce((sum, p) => sum + p.paidAmount, 0);
    const totalTds = updatedPayments.reduce((sum, p) => sum + p.tdsAmount, 0);
    const totalAdjusted = updatedPayments.reduce((sum, p) => sum + p.adjustmentAmount, 0);

    const updatedInvoices = safeInvoices.map(inv => {
      if (inv.id === selectedInvoice.id) {
        const newBalanceAmount = inv.totalAmount - totalPaid - totalTds - totalAdjusted;
        const { shortAmount, excessAmount } = calculateShortExcess({ ...inv, paidAmount: totalPaid, tdsAmount: totalTds, adjustedAmount: totalAdjusted });

        const updatedInv = { 
          ...inv, 
          paidAmount: totalPaid, 
          tdsAmount: totalTds, 
          adjustedAmount: totalAdjusted, 
          balanceAmount: Math.max(0, newBalanceAmount), 
          payments: updatedPayments,
          shortAmount,
          excessAmount,
        };
        updatedInv.status = calculateInvoiceStatus(updatedInv);
        return updatedInv;
      }
      return inv;
    });

    try {
      const updated = updatedInvoices.find(inv => inv.id === selectedInvoice.id);
      if (updated) {
        await apiFetch(`/api/invoices/${updated.id}`, {
          method: 'PUT',
          body: JSON.stringify(updated),
        });
      }

      await refreshInvoices();
    } catch (e) {
      toast({
        title: 'Error',
        description: (e as Error)?.message || 'Failed to save payment.',
        variant: 'destructive',
      });
      return;
    }
    
    const updated = updatedInvoices.find(inv => inv.id === selectedInvoice.id);
    if (updated) setSelectedInvoice(updated);
    
    toast({ title: editingPaymentIndex !== null ? 'Payment updated' : 'Payment recorded' });
    setEditingPaymentIndex(null);
    setPaymentData({ paymentDate: format(new Date(), 'yyyy-MM-dd'), paidAmount: 0, tdsPercent: selectedInvoice.tdsPercent || 0, tdsAmount: 0, adjustmentAmount: 0, remarks: '' });
  };

  const handleStatusChange = async (invoiceId: string, newStatus: Invoice['status']) => {
    try {
      const invoice = safeInvoices.find(inv => inv.id === invoiceId);
      if (!invoice) return;

      const updated = { ...invoice, status: newStatus };
      await apiFetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        body: JSON.stringify(updated),
      });

      await refreshInvoices();
      toast({ title: 'Status updated' });
    } catch (e) {
      toast({
        title: 'Error',
        description: (e as Error)?.message || 'Failed to update status.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    const invoice = safeInvoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    try {
      // Revert patient statuses to 'To Be Raised'
      const affected = new Set(invoice.items.map(i => i.patientId));
      for (const p of safePatients) {
        if (affected.has(p.id)) {
          await apiFetch(`/api/patients/${p.id}`, {
            method: 'PUT',
            body: JSON.stringify({ ...p, invoiceStatus: 'To Be Raised', invoiceNumber: '' }),
          });
        }
      }

      await apiFetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });

      await Promise.all([refreshInvoices(), refreshPatients()]);
      toast({ title: 'Invoice deleted', description: 'Patient status reverted to "To Be Raised".' });
    } catch (e) {
      toast({
        title: 'Error',
        description: (e as Error)?.message || 'Failed to delete invoice.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    const hospital = safeHospitals.find(h => h.id === invoice.hospitalId);
    const hospitalAddress = [hospital?.address, hospital?.area, hospital?.city, hospital?.state, hospital?.pinCode].filter(Boolean).join(', ');
    
    const hasDCI = invoice.items.some(i => i.dciCharges && i.dciCharges > 0);
    
    // Convert logo to base64 for PDF
    const getLogoBase64 = (): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve('');
        img.src = logoImage;
      });
    };

    const logoBase64 = await getLogoBase64();
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      // Number to words function
      const numberToWords = (num: number): string => {
        const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
        const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
        const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

        if (num === 0) return 'Zero';
        if (num < 10) return ones[num];
        if (num < 20) return teens[num - 10];
        if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
        if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
        if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
        if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
        return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
      };
      
      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
    .logo-top { text-align: right; margin-bottom: 20px; }
    .company-logo { width: 100px; height: 100px; object-fit: contain; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #3b82f6; }
    .company-section { flex: 1; }
    .company-name { font-size: 24px; font-weight: bold; color: #3b82f6; margin-bottom: 8px; }
    .company-address { font-size: 12px; color: #666; line-height: 1.5; white-space: pre-line; }
    .invoice-section { text-align: right; }
    .invoice-title { font-size: 28px; font-weight: bold; color: #3b82f6; }
    .invoice-meta { font-size: 12px; color: #666; margin-top: 8px; }
    .invoice-meta strong { color: #333; }
    .bill-to { margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 8px; }
    .bill-to-label { font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 4px; }
    .bill-to-name { font-size: 16px; font-weight: 600; color: #333; }
    .bill-to-address { font-size: 13px; color: #666; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #3b82f6; color: white; padding: 12px 8px; text-align: left; font-size: 12px; font-weight: 600; }
    td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
    tr:nth-child(even) { background: #f8fafc; }
    .amount-col { text-align: right; }
    .total-row { background: #3b82f6 !important; color: white; font-weight: bold; }
    .total-row td { border: none; padding: 12px 8px; }
    .amount-words { font-size: 12px; color: #666; margin: 10px 0 20px; font-style: italic; }
    .main-footer { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 30px; gap: 20px; }
    .bank-details { flex: 1; padding: 15px; background: #f8fafc; border-radius: 8px; }
    .bank-title { font-size: 12px; font-weight: 600; color: #3b82f6; margin-bottom: 10px; text-transform: uppercase; }
    .bank-grid { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; }
    .bank-label { font-size: 11px; color: #666; }
    .bank-value { font-size: 11px; color: #333; font-weight: 500; }
    .signature { text-align: right; padding-top: 60px; flex-shrink: 0; }
    .signature-line { border-top: 1px solid #333; width: 180px; margin-left: auto; padding-top: 8px; font-size: 12px; text-align: center; }
    .page-footer { margin-top: 30px; padding: 15px; background: #e8f4fc; border-radius: 8px; text-align: center; }
    .contact-left { text-align: center; }
    .contact-left a { color: #3b82f6; text-decoration: none; }
    .contact-left p { font-size: 12px; color: #666; margin: 4px 0; }
    .thank-you { font-size: 13px; color: #3b82f6; font-weight: 500; margin-bottom: 10px; text-align: center; }
    @media print { 
      body { padding: 20px; } 
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <div class="logo-top">
    ${logoBase64 ? `<img src="${logoBase64}" class="company-logo" alt="Logo" />` : ''}
  </div>
  
  <div class="header">
    <div class="company-section">
      <div class="company-name">${companyDetails.name}</div>
      <div class="company-address">${companyDetails.address}</div>
    </div>
    <div class="invoice-section">
      <div class="invoice-title">INVOICE</div>
      <div class="invoice-meta">
        <div><strong>Invoice No:</strong> ${invoice.invoiceNumber}</div>
        <div><strong>Date:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</div>
      </div>
    </div>
  </div>
  
  <div class="bill-to">
    <div class="bill-to-label">Bill To</div>
    <div class="bill-to-name">${invoice.hospitalName}</div>
    <div class="bill-to-address">${hospitalAddress}</div>
  </div>
  
  <table>
    <thead>
      <tr>
        <th>S.No</th>
        <th>Patient Name</th>
        <th>Appt Date</th>
        <th>Service</th>
        <th class="amount-col">Bill Amt</th>
        ${hasDCI ? '<th class="amount-col">DCI</th><th class="amount-col">Final Amt</th>' : ''}
        <th class="amount-col">Share %</th>
        <th class="amount-col">Share Amt</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${item.patientName}</td>
          <td>${item.patientDate ? new Date(item.patientDate).toLocaleDateString('en-IN') : '-'}</td>
          <td>${item.serviceType}</td>
          <td class="amount-col">₹${item.billAmount.toLocaleString('en-IN')}</td>
          ${hasDCI ? `
            <td class="amount-col">${item.dciCharges ? '₹' + item.dciCharges.toLocaleString('en-IN') : '-'}</td>
            <td class="amount-col">₹${(item.finalAmount || item.billAmount).toLocaleString('en-IN')}</td>
          ` : ''}
          <td class="amount-col">${item.sharePercent}%</td>
          <td class="amount-col">₹${item.shareAmount.toLocaleString('en-IN')}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td colspan="${hasDCI ? 8 : 6}">Total</td>
        <td class="amount-col">₹${invoice.totalAmount.toLocaleString('en-IN')}</td>
      </tr>
    </tbody>
  </table>
  
  <div class="amount-words">Amount in words: ${numberToWords(Math.round(invoice.totalAmount))} Rupees Only</div>
  
  <div class="main-footer">
    <div class="bank-details">
      <div class="bank-title">Bank Details</div>
      <div class="bank-grid">
        <span class="bank-label">Bank Name:</span>
        <span class="bank-value">${companyDetails.bankName}</span>
        <span class="bank-label">Beneficiary:</span>
        <span class="bank-value">${companyDetails.beneficiary}</span>
        <span class="bank-label">Account No:</span>
        <span class="bank-value">${companyDetails.accountNumber}</span>
        <span class="bank-label">IFSC Code:</span>
        <span class="bank-value">${companyDetails.ifscCode}</span>
        <span class="bank-label">Payment Mode:</span>
        <span class="bank-value">NEFT / RTGS / UPI / CASH</span>
      </div>
    </div>
    <div class="signature">
      <div class="signature-line">Authorized Signatory</div>
    </div>
  </div>
  
  <div class="page-footer">
    <p class="thank-you">Thank you for choosing us.<br/>Any other services/opinions required; Medagg Healthcare would be glad to assist you.</p>
    <div class="contact-left">
      <p><strong>Website:</strong> <a href="https://medagghealthcare.com/">https://medagghealthcare.com/</a></p>
      <p><strong>Email:</strong> <a href="mailto:finance@medagghealthcare.com">finance@medagghealthcare.com</a></p>
    </div>
  </div>
</body>
</html>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Calculate totals - Total Invoice EXCLUDES Hold only (Cancelled is included)
  const totals = useMemo(() => {
    // Bill Amount, DCI, Final Amount, Share Amount from non-hold invoice items
    const nonHoldItems = nonHoldInvoices.flatMap(inv => inv.items || []);
    const billAmount = nonHoldItems.reduce((sum, item) => sum + (item.billAmount || 0), 0);
    const dciAmount = nonHoldItems.reduce((sum, item) => sum + (item.dciCharges || 0), 0);
    const finalAmount = nonHoldItems.reduce((sum, item) => sum + (item.finalAmount || item.billAmount || 0), 0);
    const shareAmount = nonHoldItems.reduce((sum, item) => sum + (item.shareAmount || 0), 0);

    return {
      // Total Invoice EXCLUDES Hold only (Cancelled is INCLUDED)
      invoiceAmount: nonHoldInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
      paidAmount: activeInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
      tdsAmount: activeInvoices.reduce((sum, inv) => sum + inv.tdsAmount, 0),
      adjustedAmount: activeInvoices.reduce((sum, inv) => sum + inv.adjustedAmount, 0),
      balanceAmount: activeInvoices.reduce((sum, inv) => sum + inv.balanceAmount, 0),
      cancelledAmount: cancelledInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
      holdAmount: holdInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
      shortTotal: activeInvoices.reduce((sum, inv) => sum + (inv.shortAmount || 0), 0),
      excessTotal: activeInvoices.reduce((sum, inv) => sum + (inv.excessAmount || 0), 0),
      // Item-level totals
      billAmount,
      dciAmount,
      finalAmount,
      shareAmount,
    };
  }, [nonHoldInvoices, activeInvoices, cancelledInvoices, holdInvoices]);

  // Export to CSV function
  const handleExportCSV = () => {
    const headers = [
      'Invoice No', 'Date', 'Hospital', 'City', 'Area', 
      'Bill Amount', 'DCI', 'Final Amount', 'Share %', 'Invoice Amount',
      'Paid Amount', 'Adjusted', 'TDS %', 'TDS Amount', 'Short', 'Excess', 'Balance', 'Status'
    ];
    
    const rows = filteredInvoices.map(inv => {
      const itemTotals = (inv.items || []).reduce((acc, item) => ({
        billAmount: acc.billAmount + (item.billAmount || 0),
        dciAmount: acc.dciAmount + (item.dciCharges || 0),
        finalAmount: acc.finalAmount + (item.finalAmount || item.billAmount || 0),
        sharePercent: item.sharePercent || 0,
      }), { billAmount: 0, dciAmount: 0, finalAmount: 0, sharePercent: 0 });
      
      const avgSharePercent = inv.items?.length ? 
        inv.items.reduce((sum, item) => sum + (item.sharePercent || 0), 0) / inv.items.length : 0;
      
      return [
        inv.invoiceNumber,
        new Date(inv.invoiceDate).toLocaleDateString('en-IN'),
        inv.hospitalName,
        inv.hospitalCity || '',
        inv.hospitalArea || '',
        itemTotals.billAmount,
        itemTotals.dciAmount,
        itemTotals.finalAmount,
        avgSharePercent.toFixed(2) + '%',
        inv.totalAmount,
        inv.paidAmount,
        inv.adjustedAmount,
        inv.tdsPercent + '%',
        inv.tdsAmount,
        inv.shortAmount || 0,
        inv.excessAmount || 0,
        inv.balanceAmount,
        inv.status
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Export Complete', description: `${filteredInvoices.length} invoices exported to CSV.` });
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 overflow-y-auto">
        <PageHeader 
          title="Invoice Dashboard" 
          description="Manage and track all invoices" 
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />Export CSV
              </Button>
              <Button onClick={() => navigate('/invoices/create')}>
                <Plus className="w-4 h-4 mr-2" />Create Invoice
              </Button>
            </div>
          } 
        />

        <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg border mb-6 bg-card">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Invoice Year</Label>
            <MultiSelect
              options={yearOptions}
              value={yearFilter}
              onValueChange={setYearFilter}
              placeholder="All Years"
              searchPlaceholder="Search year..."
              className="w-[130px]"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Invoice Month</Label>
            <MultiSelect
              options={monthOptions}
              value={monthFilter}
              onValueChange={setMonthFilter}
              placeholder="All Months"
              searchPlaceholder="Search month..."
              className="w-[150px]"
              disabled={yearFilter.length === 0}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Appt Month</Label>
            <MultiSelect
              options={appointmentMonthOptions}
              value={appointmentMonthFilter}
              onValueChange={setAppointmentMonthFilter}
              placeholder="All Months"
              searchPlaceholder="Search month..."
              className="w-[160px]"
              disabled={yearFilter.length === 0}
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Hospital</Label>
            <MultiSelect
              options={hospitalOptions}
              value={hospitalFilter}
              onValueChange={setHospitalFilter}
              placeholder="All Hospitals"
              searchPlaceholder="Search hospital..."
              className="w-[200px]"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">City</Label>
            <MultiSelect
              options={cityOptions}
              value={cityFilter}
              onValueChange={setCityFilter}
              placeholder="All Cities"
              searchPlaceholder="Search city..."
              className="w-[150px]"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Area</Label>
            <MultiSelect
              options={areaOptions}
              value={areaFilter}
              onValueChange={setAreaFilter}
              placeholder="All Areas"
              searchPlaceholder="Search area..."
              className="w-[150px]"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Status</Label>
            <MultiSelect
              options={statusOptions}
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder="All Status"
              searchPlaceholder="Search status..."
              className="w-[160px]"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs text-muted-foreground mb-1 block">Search</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search Invoice No, Hospital, City, Area, Status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
        </div>

        {/* Top Live Totals Summary - Two Rows */}
        <div className="space-y-3 mb-6">
          {/* Row 1: Item-level totals - removed Avg Share % */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-card rounded-lg border">
            <div><p className="text-xs text-muted-foreground">Bill Amount</p><p className="font-semibold">{formatCurrency(totals.billAmount)}</p></div>
            <div><p className="text-xs text-muted-foreground">DCI Amount</p><p className="font-semibold">{formatCurrency(totals.dciAmount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Final Amount</p><p className="font-semibold">{formatCurrency(totals.finalAmount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Share Amount</p><p className="font-semibold text-accent">{formatCurrency(totals.shareAmount)}</p></div>
          </div>
          
          {/* Row 2: Invoice-level totals */}
          <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-4 p-4 bg-card rounded-lg border">
            <div><p className="text-xs text-muted-foreground">Total Records</p><p className="font-semibold">{filteredInvoices.length}</p></div>
            <div><p className="text-xs text-muted-foreground">Total Invoice</p><p className="font-semibold">{formatCurrency(totals.invoiceAmount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Total Paid</p><p className="font-semibold text-success">{formatCurrency(totals.paidAmount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Total TDS</p><p className="font-semibold">{formatCurrency(totals.tdsAmount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Adjusted</p><p className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(totals.adjustedAmount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Short Total</p><p className="font-semibold text-destructive">{formatCurrency(totals.shortTotal)}</p></div>
            <div><p className="text-xs text-muted-foreground">Excess Total</p><p className="font-semibold text-success">{formatCurrency(totals.excessTotal)}</p></div>
            <div><p className="text-xs text-muted-foreground">Cancelled</p><p className="font-semibold text-destructive">{formatCurrency(totals.cancelledAmount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Hold</p><p className="font-semibold text-purple-600 dark:text-purple-400">{formatCurrency(totals.holdAmount)}</p></div>
            <div><p className="text-xs text-muted-foreground">Balance</p><p className="font-semibold text-warning">{formatCurrency(totals.balanceAmount)}</p></div>
          </div>
        </div>

        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-finance">
              <thead>
                <tr>
                  <th>Invoice No.</th>
                  <th>Date</th>
                  <th>Hospital</th>
                  <th>Area</th>
                  <th>Bill Amt</th>
                  <th>DCI</th>
                  <th>Final Amt</th>
                  <th>Share %</th>
                  <th>Invoice Amt</th>
                  <th>Paid Amt</th>
                  <th>Adjusted</th>
                  <th>TDS %</th>
                  <th>TDS Amt</th>
                  <th>Short/Excess</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const shortExcess = (invoice.shortAmount || 0) > 0 
                    ? { type: 'short', amount: invoice.shortAmount || 0 }
                    : (invoice.excessAmount || 0) > 0 
                      ? { type: 'excess', amount: invoice.excessAmount || 0 }
                      : null;
                  
                  // Calculate item-level totals for this invoice
                  const itemTotals = (invoice.items || []).reduce((acc, item) => ({
                    billAmount: acc.billAmount + (item.billAmount || 0),
                    dciAmount: acc.dciAmount + (item.dciCharges || 0),
                    finalAmount: acc.finalAmount + (item.finalAmount || item.billAmount || 0),
                  }), { billAmount: 0, dciAmount: 0, finalAmount: 0 });
                  
                  const avgSharePercent = invoice.items?.length ? 
                    invoice.items.reduce((sum, item) => sum + (item.sharePercent || 0), 0) / invoice.items.length : 0;
                  
                  return (
                    <tr key={invoice.id}>
                      <td className="font-medium">{invoice.invoiceNumber}</td>
                      <td>{new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</td>
                      <td>{invoice.hospitalName}</td>
                      <td>{invoice.hospitalArea || '-'}</td>
                      <td>{formatCurrency(itemTotals.billAmount)}</td>
                      <td>{formatCurrency(itemTotals.dciAmount)}</td>
                      <td>{formatCurrency(itemTotals.finalAmount)}</td>
                      <td>{avgSharePercent.toFixed(1)}%</td>
                      <td className="font-medium">{formatCurrency(invoice.totalAmount)}</td>
                      <td className="text-success">{formatCurrency(invoice.paidAmount)}</td>
                      <td className="text-blue-600 dark:text-blue-400">{formatCurrency(invoice.adjustedAmount)}</td>
                      <td>{invoice.tdsPercent}%</td>
                      <td>{formatCurrency(invoice.tdsAmount)}</td>
                      <td>
                        {shortExcess ? (
                          <span className={shortExcess.type === 'short' ? 'text-destructive' : 'text-success'}>
                            {shortExcess.type === 'short' ? '-' : '+'}{formatCurrency(shortExcess.amount)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="font-medium">{formatCurrency(invoice.balanceAmount)}</td>
                      <td className="min-w-[160px]">
                        <Select value={invoice.status} onValueChange={(v) => handleStatusChange(invoice.id, v as Invoice['status'])}>
                          <SelectTrigger className="w-[160px] h-8 text-xs">
                            <span className="truncate"><StatusBadge status={invoice.status} /></span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Unpaid">Unpaid</SelectItem>
                            <SelectItem value="Paid">Paid</SelectItem>
                            <SelectItem value="Amount Adjusted">Amount Adjusted</SelectItem>
                            <SelectItem value="Hold">Hold</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDownloadInvoice(invoice)}><Download className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleOpenPaymentDialog(invoice)}><CreditCard className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteInvoice(invoice.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredInvoices.length === 0 && <div className="p-8 text-center text-muted-foreground">No invoices found.</div>}
        </div>


        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Update Payment - {selectedInvoice?.invoiceNumber}</DialogTitle></DialogHeader>
            {selectedInvoice && (
              <div className="space-y-4 pt-4">
                <div className="p-3 bg-muted/30 rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between"><span>Invoice Amount:</span><span className="font-medium">{formatCurrency(selectedInvoice.totalAmount)}</span></div>
                  <div className="flex justify-between"><span>Total Paid:</span><span className="font-medium text-success">{formatCurrency(selectedInvoice.paidAmount)}</span></div>
                  <div className="flex justify-between"><span>Total TDS:</span><span className="font-medium">{formatCurrency(selectedInvoice.tdsAmount)}</span></div>
                  <div className="flex justify-between"><span>Adjusted:</span><span className="font-medium">{formatCurrency(selectedInvoice.adjustedAmount)}</span></div>
                  <div className="flex justify-between border-t pt-1 mt-1"><span>Remaining Balance:</span><span className="font-bold text-warning">{formatCurrency(selectedInvoice.balanceAmount)}</span></div>
                </div>

                {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                  <div><Label className="text-xs text-muted-foreground">Payment History (Click to edit)</Label>
                    <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                      {selectedInvoice.payments.map((p, idx) => (
                        <div 
                          key={p.id} 
                          onClick={() => handleEditPayment(idx)}
                          className={`text-xs p-2 rounded cursor-pointer transition-colors ${editingPaymentIndex === idx ? 'bg-accent/20 border border-accent' : 'bg-muted/20 hover:bg-muted/40'}`}
                        >
                          <div className="flex justify-between">
                            <span>{new Date(p.paymentDate).toLocaleDateString('en-IN')}</span>
                            <span>Paid: {formatCurrency(p.paidAmount)}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>TDS ({p.tdsPercent}%): {formatCurrency(p.tdsAmount)}</span>
                            <span>Adj: {formatCurrency(p.adjustmentAmount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <Label className="text-sm font-medium">{editingPaymentIndex !== null ? 'Edit Payment' : 'Add New Payment'}</Label>
                </div>

                <div><Label>Payment Date</Label><Input type="date" value={paymentData.paymentDate} onChange={e => setPaymentData(p => ({ ...p, paymentDate: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Paid Amount</Label><Input type="number" value={paymentData.paidAmount} onChange={e => handlePaidAmountChange(parseFloat(e.target.value) || 0)} /></div>
                  <div><Label>TDS %</Label><Input type="number" value={paymentData.tdsPercent} onChange={e => handleTdsPercentChange(parseFloat(e.target.value) || 0)} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>TDS Amount</Label><Input type="number" value={paymentData.tdsAmount} onChange={e => setPaymentData(p => ({ ...p, tdsAmount: parseFloat(e.target.value) || 0 }))} /></div>
                  <div><Label>Adjustment</Label><Input type="number" value={paymentData.adjustmentAmount} onChange={e => handleAdjustmentAmountChange(parseFloat(e.target.value) || 0)} /></div>
                </div>
                <div><Label>Remarks</Label><Textarea value={paymentData.remarks} onChange={e => setPaymentData(p => ({ ...p, remarks: e.target.value }))} /></div>
                <div className="flex justify-end gap-2 pt-4">
                  {editingPaymentIndex !== null && (
                    <Button variant="outline" onClick={() => {
                      setEditingPaymentIndex(null);
                      setPaymentData({ paymentDate: format(new Date(), 'yyyy-MM-dd'), paidAmount: 0, tdsPercent: selectedInvoice.tdsPercent || 0, tdsAmount: 0, adjustmentAmount: 0, remarks: '' });
                    }}>Cancel Edit</Button>
                  )}
                  <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Close</Button>
                  <Button onClick={savePayment}>{editingPaymentIndex !== null ? 'Update Payment' : 'Add Payment'}</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default InvoiceDashboard;
