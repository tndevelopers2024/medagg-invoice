import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { companyDetails } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Download, Trash2, Plus, Edit } from 'lucide-react';
import { Invoice, InvoiceItem, Patient } from '@/types';
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
    if (Array.isArray(v.patients)) return v.patients as T[];
  }
  return [];
};

const InvoiceEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);

  const safeHospitals = useMemo(() => asArray<any>(hospitals), [hospitals]);
  const safeAllPatients = useMemo(() => asArray<Patient>(allPatients), [allPatients]);
  
  // Patient edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPatientIndex, setEditingPatientIndex] = useState<number | null>(null);
  const [editingPatient, setEditingPatient] = useState<Partial<Patient> | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const [inv, hosp, pat] = await Promise.all([
          apiFetch<Invoice>(`/api/invoices/${id}`),
          apiFetch<any[]>('/api/hospitals'),
          apiFetch<Patient[]>('/api/patients'),
        ]);

        setHospitals(asArray<any>(hosp));
        setAllPatients(asArray<Patient>(pat));

        if (inv) {
          setInvoice(inv);
          setInvoiceNumber(inv.invoiceNumber);
          setInvoiceDate(inv.invoiceDate);
          setItems(inv.items || []);
        }
      } catch (e) {
        toast({
          title: 'Error',
          description: (e as Error)?.message || 'Failed to load invoice.',
          variant: 'destructive',
        });
      }
    };

    load();
  }, [id]);

  const hospital = invoice ? safeHospitals.find(h => h.id === invoice.hospitalId) : null;

  // Get patients from same hospital that are not yet invoiced
  const eligiblePatients = useMemo(() => {
    if (!invoice) return [];
    return safeAllPatients.filter(
      p => p.hospitalId === invoice.hospitalId && 
           p.invoiceStatus === 'To Be Raised' &&
           !items.some(item => item.patientId === p.id)
    );
  }, [invoice, safeAllPatients, items]);

  const addItem = (patientId: string) => {
    const patient = safeAllPatients.find((p) => p.id === patientId);
    if (!patient) return;

    setItems((prev) => [
      ...prev,
      {
        patientId: patient.id,
        patientName: patient.name,
        patientDate: patient.patientDate,
        serviceType: patient.serviceType,
        billAmount: patient.billAmount,
        dciCharges: patient.dciCharges,
        finalAmount: patient.finalAmount,
        sharePercent: patient.sharePercent,
        shareAmount: patient.shareAmount,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const openEditDialog = (index: number) => {
    const item = items[index];
    const patient = safeAllPatients.find(p => p.id === item.patientId);
    if (patient) {
      setEditingPatientIndex(index);
      setEditingPatient({ ...patient });
      setEditDialogOpen(true);
    }
  };

  const handlePatientEditSave = async () => {
    if (editingPatient && editingPatientIndex !== null) {
      // Calculate share amount based on updated values
      const billAmount = editingPatient.billAmount || 0;
      const dciCharges = editingPatient.dciCharges || 0;
      const finalAmount = billAmount - dciCharges;
      const sharePercent = editingPatient.sharePercent || 0;
      const shareAmount = Math.round((finalAmount * sharePercent) / 100);

      // Update the item in the invoice
      setItems(prev => prev.map((item, idx) => {
        if (idx === editingPatientIndex) {
          return {
            ...item,
            patientName: editingPatient.name || item.patientName,
            patientDate: editingPatient.patientDate || item.patientDate,
            serviceType: editingPatient.serviceType || item.serviceType,
            billAmount: billAmount,
            dciCharges: dciCharges,
            finalAmount: finalAmount,
            sharePercent: sharePercent,
            shareAmount: shareAmount,
          };
        }
        return item;
      }));

      // Also update the patient in API-backed state
      const updatedPatients = safeAllPatients.map(p => {
        if (p.id === editingPatient.id) {
          return {
            ...p,
            ...editingPatient,
            finalAmount,
            shareAmount,
          } as Patient;
        }
        return p;
      });
      setAllPatients(updatedPatients);

      // Persist patient changes
      if (editingPatient.id) {
        try {
          await apiFetch(`/api/patients/${editingPatient.id}`, {
            method: 'PUT',
            body: JSON.stringify(updatedPatients.find(p => p.id === editingPatient.id)),
          });
        } catch {
          // ignore; UI is still updated and refresh will reconcile
        }
      }

      toast({
        title: 'Patient Updated',
        description: `${editingPatient.name}'s details have been updated.`,
      });

      setEditDialogOpen(false);
      setEditingPatient(null);
      setEditingPatientIndex(null);
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + item.shareAmount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

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

  const handleSave = async () => {
    if (!invoice || items.length === 0) {
      toast({
        title: 'Error',
        description: 'Invoice must have at least one item.',
        variant: 'destructive',
      });
      return;
    }

    const invoiceMonth = new Date(invoiceDate).getMonth() + 1;
    const invoiceYear = new Date(invoiceDate).getFullYear();

    const updatedInvoice: Invoice = {
      ...invoice,
      invoiceNumber,
      invoiceDate,
      items,
      totalAmount,
      balanceAmount: totalAmount - invoice.paidAmount - invoice.tdsAmount - invoice.adjustedAmount,
      month: invoiceMonth,
      year: invoiceYear,
    };

    try {
      await apiFetch(`/api/invoices/${updatedInvoice.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedInvoice),
      });

      // Update patient statuses based on diff
      const nowIds = new Set(items.map(i => i.patientId));
      const beforeIds = new Set((invoice.items || []).map(i => i.patientId));

      for (const p of allPatients) {
        const isInInvoice = nowIds.has(p.id);
        const wasInOriginal = beforeIds.has(p.id);

        if (isInInvoice && !wasInOriginal) {
          await apiFetch(`/api/patients/${p.id}`, {
            method: 'PUT',
            body: JSON.stringify({ ...p, invoiceStatus: 'Invoice Raised', invoiceNumber }),
          });
        }

        if (!isInInvoice && wasInOriginal) {
          await apiFetch(`/api/patients/${p.id}`, {
            method: 'PUT',
            body: JSON.stringify({ ...p, invoiceStatus: 'To Be Raised', invoiceNumber: '' }),
          });
        }
      }

      toast({
        title: 'Invoice updated',
        description: `Invoice ${invoiceNumber} has been updated successfully.`,
      });
      navigate('/invoices');
    } catch (e) {
      toast({
        title: 'Error',
        description: (e as Error)?.message || 'Failed to update invoice.',
        variant: 'destructive',
      });
    }
  };

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

  const handleDownloadPDF = async () => {
    if (!invoice || items.length === 0) return;
    
    const hospitalAddress = [hospital?.address, hospital?.area, hospital?.city, hospital?.state, hospital?.pinCode].filter(Boolean).join(', ');
    const hasDCI = items.some(i => i.dciCharges && i.dciCharges > 0);
    const logoBase64 = await getLogoBase64();
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 15px 20px; max-width: 800px; margin: 0 auto; color: #333; font-size: 10px; }
    .logo-top { text-align: right; margin-bottom: 8px; }
    .company-logo { width: 60px; height: 60px; object-fit: contain; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #3b82f6; }
    .company-section { flex: 1; }
    .company-name { font-size: 16px; font-weight: bold; color: #3b82f6; margin-bottom: 4px; }
    .company-address { font-size: 9px; color: #666; line-height: 1.3; white-space: pre-line; }
    .invoice-section { text-align: right; }
    .invoice-title { font-size: 20px; font-weight: bold; color: #3b82f6; }
    .invoice-meta { font-size: 9px; color: #666; margin-top: 4px; }
    .invoice-meta strong { color: #333; }
    .bill-to { margin: 8px 0; padding: 8px; background: #f8fafc; border-radius: 4px; }
    .bill-to-label { font-size: 8px; color: #666; text-transform: uppercase; margin-bottom: 2px; }
    .bill-to-name { font-size: 11px; font-weight: 600; color: #333; }
    .bill-to-address { font-size: 9px; color: #666; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th { background: #3b82f6; color: white; padding: 4px 3px; text-align: left; font-size: 8px; font-weight: 600; }
    td { padding: 3px; border-bottom: 1px solid #e2e8f0; font-size: 8px; }
    tr:nth-child(even) { background: #f8fafc; }
    .amount-col { text-align: right; }
    .total-row { background: #3b82f6 !important; color: white; font-weight: bold; }
    .total-row td { border: none; padding: 4px 3px; font-size: 9px; }
    .amount-words { font-size: 9px; color: #666; margin: 6px 0 10px; font-style: italic; }
    .main-footer { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 12px; gap: 15px; }
    .bank-details { flex: 1; padding: 8px; background: #f8fafc; border-radius: 4px; }
    .bank-title { font-size: 9px; font-weight: 600; color: #3b82f6; margin-bottom: 6px; text-transform: uppercase; }
    .bank-grid { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; }
    .bank-label { font-size: 8px; color: #666; }
    .bank-value { font-size: 8px; color: #333; font-weight: 500; }
    .signature { text-align: right; padding-top: 30px; flex-shrink: 0; }
    .signature-line { border-top: 1px solid #333; width: 120px; margin-left: auto; padding-top: 4px; font-size: 9px; text-align: center; }
    .page-footer { margin-top: 12px; padding: 8px; background: #e8f4fc; border-radius: 4px; text-align: center; }
    .contact-left { text-align: center; }
    .contact-left a { color: #3b82f6; text-decoration: none; }
    .contact-left p { font-size: 8px; color: #666; margin: 2px 0; }
    .thank-you { font-size: 9px; color: #3b82f6; font-weight: 500; margin-bottom: 4px; text-align: center; }
    @media print { 
      body { padding: 10px; } 
      @page { margin: 0.5cm; size: A4; }
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
        <div><strong>Invoice No:</strong> ${invoiceNumber}</div>
        <div><strong>Date:</strong> ${new Date(invoiceDate).toLocaleDateString('en-IN')}</div>
      </div>
    </div>
  </div>
  
  <div class="bill-to">
    <div class="bill-to-label">Bill To</div>
    <div class="bill-to-name">${invoice?.hospitalName || ''}</div>
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
      ${items.map((item, idx) => `
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
        <td class="amount-col">₹${totalAmount.toLocaleString('en-IN')}</td>
      </tr>
    </tbody>
  </table>
  
  <div class="amount-words">Amount in words: ${numberToWords(Math.round(totalAmount))} Rupees Only</div>
  
  <div class="main-footer">
    <div class="bank-details">
      <div class="bank-title">Bank Details</div>
      <div class="bank-grid">
        <span class="bank-label">Bank:</span>
        <span class="bank-value">${companyDetails.bankName}</span>
        <span class="bank-label">Beneficiary:</span>
        <span class="bank-value">${companyDetails.beneficiary}</span>
        <span class="bank-label">A/C No:</span>
        <span class="bank-value">${companyDetails.accountNumber}</span>
        <span class="bank-label">IFSC:</span>
        <span class="bank-value">${companyDetails.ifscCode}</span>
        <span class="bank-label">Payment:</span>
        <span class="bank-value">NEFT/RTGS/UPI/CASH</span>
      </div>
    </div>
    <div class="signature">
      <div class="signature-line">Authorized Signatory</div>
    </div>
  </div>
  
  <div class="page-footer">
    <p class="thank-you">Thank you for choosing us. Any services required, Medagg Healthcare would be glad to assist.</p>
    <div class="contact-left">
      <p><strong>Website:</strong> <a href="https://medagghealthcare.com/">medagghealthcare.com</a> | <strong>Email:</strong> <a href="mailto:finance@medagghealthcare.com">finance@medagghealthcare.com</a></p>
    </div>
  </div>
</body>
</html>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!invoice) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8">
          <div className="text-center py-16">
            <p className="text-muted-foreground">Invoice not found.</p>
            <Button variant="outline" onClick={() => navigate('/invoices')} className="mt-4">
              Back to Invoices
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 overflow-y-auto">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/invoices')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Invoices
          </Button>
          <PageHeader
            title="Edit Invoice"
            description={`Editing invoice ${invoice.invoiceNumber}`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Invoice Number</Label>
                  <Input 
                    value={invoiceNumber} 
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Invoice Date</Label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Hospital</Label>
                  <Input value={invoice.hospitalName} readOnly className="bg-muted" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Invoice Items</CardTitle>
                {eligiblePatients.length > 0 && (
                  <Select onValueChange={addItem}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Add patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligiblePatients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} - {p.serviceType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </CardHeader>
              <CardContent>
                {items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table-finance">
                      <thead>
                        <tr>
                          <th>Patient Name</th>
                          <th>Appt Date</th>
                          <th>Service</th>
                          <th>Bill Amt</th>
                          <th>DCI</th>
                          <th>Final Amt</th>
                          <th>Share %</th>
                          <th>Share Amt</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr key={index}>
                            <td className="font-medium">{item.patientName}</td>
                            <td>{item.patientDate ? new Date(item.patientDate).toLocaleDateString('en-IN') : '-'}</td>
                            <td>{item.serviceType}</td>
                            <td>{formatCurrency(item.billAmount)}</td>
                            <td>{item.dciCharges ? formatCurrency(item.dciCharges) : '-'}</td>
                            <td>{formatCurrency(item.finalAmount || item.billAmount)}</td>
                            <td>{item.sharePercent}%</td>
                            <td className="font-medium">{formatCurrency(item.shareAmount)}</td>
                            <td className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(index)}
                                className="text-primary hover:text-primary"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No items in this invoice. Add patients from the dropdown above.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Company Details</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p className="font-semibold">{companyDetails.name}</p>
                <p className="text-muted-foreground whitespace-pre-line">{companyDetails.address}</p>
              </CardContent>
            </Card>

            {hospital && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Hospital Details</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p className="font-semibold">{hospital.name}</p>
                  <p className="text-muted-foreground">
                    {[hospital.address, hospital.area, hospital.city, hospital.state, hospital.pinCode].filter(Boolean).join(', ')}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {numberToWords(Math.round(totalAmount))} Rupees Only
                </p>
                <div className="border-t pt-4 space-y-1 text-sm">
                  <p className="font-medium">Bank Details</p>
                  <p className="text-muted-foreground">{companyDetails.bankName}</p>
                  <p className="text-muted-foreground">Beneficiary: {companyDetails.beneficiary}</p>
                  <p className="text-muted-foreground">A/C: {companyDetails.accountNumber}</p>
                  <p className="text-muted-foreground">IFSC: {companyDetails.ifscCode}</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-2">
              <Button onClick={handleSave} disabled={items.length === 0}>
                Update Invoice
              </Button>
              <Button variant="outline" onClick={handleDownloadPDF} disabled={items.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Patient Details</DialogTitle>
          </DialogHeader>
          {editingPatient && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="patientName">Patient Name</Label>
                <Input
                  id="patientName"
                  value={editingPatient.name || ''}
                  onChange={(e) => setEditingPatient({ ...editingPatient, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={editingPatient.phone || ''}
                  onChange={(e) => setEditingPatient({ ...editingPatient, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patientDate">Appointment Date</Label>
                <Input
                  id="patientDate"
                  type="date"
                  value={editingPatient.patientDate || ''}
                  onChange={(e) => setEditingPatient({ ...editingPatient, patientDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serviceType">Service Type</Label>
                <Select
                  value={editingPatient.serviceType || ''}
                  onValueChange={(value) => {
                    const hospitalData = hospital;
                    let sharePercent = editingPatient.sharePercent || 0;
                    if (hospitalData) {
                      if (value === 'OP') sharePercent = hospitalData.opShare || 0;
                      else if (value === 'IP') sharePercent = hospitalData.ipShare || 0;
                      else if (value === 'Diagnostic') sharePercent = hospitalData.diagnosticShare || 0;
                    }
                    setEditingPatient({ ...editingPatient, serviceType: value as 'OP' | 'IP' | 'Diagnostic', sharePercent });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OP">OP</SelectItem>
                    <SelectItem value="IP">IP</SelectItem>
                    <SelectItem value="Diagnostic">Diagnostic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doctorName">Doctor Name</Label>
                <Input
                  id="doctorName"
                  value={editingPatient.doctorName || ''}
                  onChange={(e) => setEditingPatient({ ...editingPatient, doctorName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="procedure">Procedure</Label>
                <Input
                  id="procedure"
                  value={editingPatient.procedure || ''}
                  onChange={(e) => setEditingPatient({ ...editingPatient, procedure: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceType">Source Type</Label>
                <Select
                  value={editingPatient.sourceType || ''}
                  onValueChange={(value) => setEditingPatient({ ...editingPatient, sourceType: value as 'Meta' | 'Credit Health' | 'GBR' | 'Website' | 'Referral' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Meta">Meta</SelectItem>
                    <SelectItem value="Credit Health">Credit Health</SelectItem>
                    <SelectItem value="GBR">GBR</SelectItem>
                    <SelectItem value="Website">Website</SelectItem>
                    <SelectItem value="Referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bdName">BD Name</Label>
                <Input
                  id="bdName"
                  value={editingPatient.bdName || ''}
                  onChange={(e) => setEditingPatient({ ...editingPatient, bdName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billAmount">Bill Amount</Label>
                <Input
                  id="billAmount"
                  type="number"
                  value={editingPatient.billAmount || 0}
                  onChange={(e) => {
                    const billAmount = parseFloat(e.target.value) || 0;
                    const dciCharges = editingPatient.dciCharges || 0;
                    const finalAmount = billAmount - dciCharges;
                    const sharePercent = editingPatient.sharePercent || 0;
                    const shareAmount = Math.round((finalAmount * sharePercent) / 100);
                    setEditingPatient({ ...editingPatient, billAmount, finalAmount, shareAmount });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dciCharges">DCI Charges</Label>
                <Input
                  id="dciCharges"
                  type="number"
                  value={editingPatient.dciCharges || 0}
                  onChange={(e) => {
                    const dciCharges = parseFloat(e.target.value) || 0;
                    const billAmount = editingPatient.billAmount || 0;
                    const finalAmount = billAmount - dciCharges;
                    const sharePercent = editingPatient.sharePercent || 0;
                    const shareAmount = Math.round((finalAmount * sharePercent) / 100);
                    setEditingPatient({ ...editingPatient, dciCharges, finalAmount, shareAmount });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="finalAmount">Final Amount</Label>
                <Input
                  id="finalAmount"
                  type="number"
                  value={editingPatient.finalAmount || editingPatient.billAmount || 0}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sharePercent">Share %</Label>
                <Input
                  id="sharePercent"
                  type="number"
                  value={editingPatient.sharePercent || 0}
                  onChange={(e) => {
                    const sharePercent = parseFloat(e.target.value) || 0;
                    const finalAmount = editingPatient.finalAmount || editingPatient.billAmount || 0;
                    const shareAmount = Math.round((finalAmount * sharePercent) / 100);
                    setEditingPatient({ ...editingPatient, sharePercent, shareAmount });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shareAmount">Share Amount</Label>
                <Input
                  id="shareAmount"
                  type="number"
                  value={editingPatient.shareAmount || 0}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Input
                  id="remarks"
                  value={editingPatient.remarks || ''}
                  onChange={(e) => setEditingPatient({ ...editingPatient, remarks: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePatientEditSave}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default InvoiceEdit;
