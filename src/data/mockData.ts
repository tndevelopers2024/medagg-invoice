import { Hospital, Patient, Invoice, DashboardStats, Payment, Credential } from '@/types';
import { differenceInDays, parseISO, format } from 'date-fns';

// Use localStorage to persist mock data
const getStoredData = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    const parsed = JSON.parse(stored);
    // Return default if parsed data is empty or not an array (for array types)
    if (Array.isArray(defaultValue) && (!Array.isArray(parsed) || parsed.length === 0)) {
      return defaultValue;
    }
    return parsed;
  } catch {
    return defaultValue;
  }
};

const setStoredData = <T>(key: string, data: T): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

// Calculate hospital status based on MOU dates
export const calculateHospitalStatus = (hospital: Hospital): Hospital['status'] => {
  if (hospital.manualInactive) return 'Inactive';
  
  if (!hospital.mouStartDate || !hospital.mouEndDate) return 'Active';
  
  const today = new Date();
  const endDate = parseISO(hospital.mouEndDate);
  const startDate = parseISO(hospital.mouStartDate);
  
  if (today < startDate) return 'Active';
  
  const daysUntilExpiry = differenceInDays(endDate, today);
  
  if (daysUntilExpiry < 0) return 'Expired';
  if (daysUntilExpiry <= 30) return 'Expired Soon';
  return 'Active';
};

// Empty default data - start fresh
const defaultHospitals: Hospital[] = [];
const defaultPatients: Patient[] = [];
const defaultInvoices: Invoice[] = [];
const defaultCredentials: Credential[] = [];

// Initialize mock data if not exists - only run once
const initializeMockData = () => {
  if (!localStorage.getItem('mockDataInitialized')) {
    setStoredData('mockHospitals', defaultHospitals);
    setStoredData('mockPatients', defaultPatients);
    setStoredData('mockInvoices', defaultInvoices);
    setStoredData('mockCredentials', defaultCredentials);
    localStorage.setItem('mockDataInitialized', 'true');
  }
};

initializeMockData();

// Get data functions with auto status calculation for hospitals
export const getMockHospitals = (): Hospital[] => {
  let hospitals = getStoredData('mockHospitals', defaultHospitals);
  // If no hospitals, return defaults
  if (!hospitals || hospitals.length === 0) {
    hospitals = defaultHospitals;
    setStoredData('mockHospitals', hospitals);
  }
  return hospitals.map(h => ({
    ...h,
    area: h.area || '',
    status: calculateHospitalStatus(h)
  }));
};

export const getMockPatients = (): Patient[] => {
  const patients = getStoredData('mockPatients', defaultPatients);
  return patients.map(p => ({
    ...p,
    area: p.area || '',
    city: p.city || '',
    leadType: p.leadType || 'New',
    sourceType: p.sourceType || 'Meta',
    procedure: p.procedure || '',
    dciCharges: p.dciCharges || 0,
    finalAmount: p.finalAmount || p.billAmount,
    remarks: p.remarks || '',
    invoiceNumber: p.invoiceNumber || '',
    invoiceDate: p.invoiceDate || '',
  }));
};

export const getMockInvoices = (): Invoice[] => {
  const invoices = getStoredData('mockInvoices', defaultInvoices);
  return invoices.map(inv => ({
    ...inv,
    shortAmount: inv.shortAmount || 0,
    excessAmount: inv.excessAmount || 0,
  }));
};

export const getMockCredentials = (): Credential[] => getStoredData('mockCredentials', defaultCredentials);

// Set data functions
export const setMockHospitals = (hospitals: Hospital[]): void => setStoredData('mockHospitals', hospitals);
export const setMockPatients = (patients: Patient[]): void => setStoredData('mockPatients', patients);
export const setMockInvoices = (invoices: Invoice[]): void => setStoredData('mockInvoices', invoices);
export const setMockCredentials = (credentials: Credential[]): void => setStoredData('mockCredentials', credentials);

// For backward compatibility
export const mockHospitals = getMockHospitals();
export const mockPatients = getMockPatients();
export const mockInvoices = getMockInvoices();

// Calculate invoice status - includes Hold status
export const calculateInvoiceStatus = (invoice: Invoice): Invoice['status'] => {
  if (invoice.status === 'Cancelled') return 'Cancelled';
  if (invoice.status === 'Hold') return 'Hold';
  
  const totalReceived = invoice.paidAmount + invoice.tdsAmount + invoice.adjustedAmount;
  
  if (invoice.paidAmount === 0 && invoice.tdsAmount === 0 && invoice.adjustedAmount === 0) return 'Unpaid';
  if (totalReceived >= invoice.totalAmount) return 'Paid';
  if (invoice.adjustedAmount > 0) return 'Amount Adjusted';
  
  return 'Unpaid';
};

// Calculate short/excess amounts for an invoice
export const calculateShortExcess = (invoice: Invoice): { shortAmount: number; excessAmount: number } => {
  const totalReceived = invoice.paidAmount + invoice.tdsAmount + invoice.adjustedAmount;
  const difference = totalReceived - invoice.totalAmount;
  
  return {
    shortAmount: difference < 0 ? Math.abs(difference) : 0,
    excessAmount: difference > 0 ? difference : 0,
  };
};

export const getDashboardStats = (
  month: number | null, 
  year: number | null,
  appointmentMonth: number | null = null,
  hospitalId: string | null = null,
  city: string | null = null,
  area: string | null = null,
  status: string | null = null
): DashboardStats => {
  const invoices = getMockInvoices();
  const patients = getMockPatients();
  
  // Filter invoices by invoice date
  let filteredInvoices = invoices;
  if (year !== null) {
    filteredInvoices = filteredInvoices.filter(inv => inv.year === year);
    if (month !== null) {
      filteredInvoices = filteredInvoices.filter(inv => inv.month === month);
    }
  }
  if (hospitalId) {
    filteredInvoices = filteredInvoices.filter(inv => inv.hospitalId === hospitalId);
  }
  if (city) {
    filteredInvoices = filteredInvoices.filter(inv => inv.hospitalCity === city);
  }
  if (area) {
    filteredInvoices = filteredInvoices.filter(inv => inv.hospitalArea === area);
  }
  if (status) {
    filteredInvoices = filteredInvoices.filter(inv => inv.status === status);
  }

  // Filter by appointment month (based on patient data in invoice items)
  if (appointmentMonth !== null && year !== null) {
    filteredInvoices = filteredInvoices.filter(inv => {
      return inv.items.some(item => {
        if (item.patientDate) {
          const itemDate = parseISO(item.patientDate);
          return itemDate.getMonth() + 1 === appointmentMonth;
        }
        return false;
      });
    });
  }
  
  // Invoice stats - exclude cancelled and hold from balance calculations
  const nonCancelledInvoices = filteredInvoices.filter(inv => inv.status !== 'Cancelled' && inv.status !== 'Hold');
  const cancelledInvoices = filteredInvoices.filter(inv => inv.status === 'Cancelled');
  const holdInvoices = filteredInvoices.filter(inv => inv.status === 'Hold');
  
  const totalInvoiceAmount = nonCancelledInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaidAmount = nonCancelledInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalTdsAmount = nonCancelledInvoices.reduce((sum, inv) => sum + inv.tdsAmount, 0);
  const totalAdjustmentAmount = nonCancelledInvoices.reduce((sum, inv) => sum + inv.adjustedAmount, 0);
  const totalCancelledAmount = cancelledInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const holdAmount = holdInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  
  // Unpaid = Total Invoice - Paid - TDS - Adjustments (only non-cancelled/hold)
  const totalUnpaidAmount = totalInvoiceAmount - totalPaidAmount - totalTdsAmount - totalAdjustmentAmount;
  
  // Counts per status
  const paidCount = nonCancelledInvoices.filter(inv => inv.status === 'Paid').length;
  const unpaidCount = nonCancelledInvoices.filter(inv => inv.status === 'Unpaid').length;
  const adjustedCount = nonCancelledInvoices.filter(inv => inv.adjustedAmount > 0).length;
  const tdsCount = nonCancelledInvoices.filter(inv => inv.tdsAmount > 0).length;
  const holdCount = holdInvoices.length;

  // Short/Excess totals
  const shortTotal = nonCancelledInvoices.reduce((sum, inv) => sum + (inv.shortAmount || 0), 0);
  const excessTotal = nonCancelledInvoices.reduce((sum, inv) => sum + (inv.excessAmount || 0), 0);
  
  // Filter patients for chart and stats
  let chartPatients = patients;
  if (year !== null) {
    chartPatients = chartPatients.filter(p => p.year === year);
  }
  if (hospitalId) {
    chartPatients = chartPatients.filter(p => p.hospitalId === hospitalId);
  }
  if (city) {
    chartPatients = chartPatients.filter(p => p.city === city);
  }
  if (area) {
    chartPatients = chartPatients.filter(p => p.area === area);
  }
  if (appointmentMonth !== null) {
    chartPatients = chartPatients.filter(p => p.month === appointmentMonth);
  }
  
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Generate monthly data - include invoice amounts
  const monthlyData = monthNames.map((name, idx) => {
    const monthNum = idx + 1;
    const monthPatients = chartPatients.filter(p => p.month === monthNum);
    const monthInvoices = filteredInvoices.filter(inv => inv.month === monthNum && inv.status !== 'Cancelled' && inv.status !== 'Hold');
    
    return {
      month: name,
      monthNum,
      op: monthPatients.filter(p => p.serviceType === 'OP').reduce((s, p) => s + p.shareAmount, 0),
      ip: monthPatients.filter(p => p.serviceType === 'IP').reduce((s, p) => s + p.shareAmount, 0),
      diagnostic: monthPatients.filter(p => p.serviceType === 'Diagnostic').reduce((s, p) => s + p.shareAmount, 0),
      opCount: monthPatients.filter(p => p.serviceType === 'OP').length,
      ipCount: monthPatients.filter(p => p.serviceType === 'IP').length,
      diagnosticCount: monthPatients.filter(p => p.serviceType === 'Diagnostic').length,
      invoiceAmount: monthInvoices.reduce((s, inv) => s + inv.totalAmount, 0),
      paidAmount: monthInvoices.reduce((s, inv) => s + inv.paidAmount, 0),
      unpaidAmount: monthInvoices.reduce((s, inv) => s + inv.balanceAmount, 0),
      tdsAmount: monthInvoices.reduce((s, inv) => s + inv.tdsAmount, 0),
    };
  });

  // Service type stats
  const serviceTypeStats = {
    op: { 
      count: chartPatients.filter(p => p.serviceType === 'OP').length, 
      amount: chartPatients.filter(p => p.serviceType === 'OP').reduce((s, p) => s + p.shareAmount, 0) 
    },
    ip: { 
      count: chartPatients.filter(p => p.serviceType === 'IP').length, 
      amount: chartPatients.filter(p => p.serviceType === 'IP').reduce((s, p) => s + p.shareAmount, 0) 
    },
    diagnostic: { 
      count: chartPatients.filter(p => p.serviceType === 'Diagnostic').length, 
      amount: chartPatients.filter(p => p.serviceType === 'Diagnostic').reduce((s, p) => s + p.shareAmount, 0) 
    },
  };

  // Patient status-wise stats
  const patientStatusStats = {
    invoiceRaised: { 
      count: chartPatients.filter(p => p.invoiceStatus === 'Invoice Raised').length, 
      amount: chartPatients.filter(p => p.invoiceStatus === 'Invoice Raised').reduce((s, p) => s + p.shareAmount, 0) 
    },
    toBeRaised: { 
      count: chartPatients.filter(p => p.invoiceStatus === 'To Be Raised').length, 
      amount: chartPatients.filter(p => p.invoiceStatus === 'To Be Raised').reduce((s, p) => s + p.shareAmount, 0) 
    },
    noShare: { 
      count: chartPatients.filter(p => p.invoiceStatus === 'No Share').length, 
      amount: chartPatients.filter(p => p.invoiceStatus === 'No Share').reduce((s, p) => s + p.shareAmount, 0) 
    },
  };
  
  return {
    totalInvoices: filteredInvoices.length,
    totalInvoiceAmount,
    totalPaidAmount,
    totalUnpaidAmount: Math.max(0, totalUnpaidAmount),
    totalCancelled: cancelledInvoices.length,
    totalCancelledAmount,
    totalTdsAmount,
    totalAdjustmentAmount,
    totalBalanceAmount: Math.max(0, totalUnpaidAmount),
    paidCount,
    unpaidCount,
    adjustedCount,
    tdsCount,
    holdCount,
    holdAmount,
    shortTotal,
    excessTotal,
    monthlyData,
    serviceTypeStats,
    patientStatusStats,
  };
};

// Generate next invoice number
export const generateInvoiceNumber = (): string => {
  const invoices = getMockInvoices();
  const year = new Date().getFullYear();
  const existingNumbers = invoices
    .filter(inv => inv.invoiceNumber.startsWith(`INV-${year}`))
    .map(inv => {
      const match = inv.invoiceNumber.match(/INV-\d+-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
  
  const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
  return `INV-${year}-${String(maxNumber + 1).padStart(3, '0')}`;
};

// Company details for invoices
export const companyDetails = {
  name: 'Medagg Healthcare Pvt Ltd',
  address: 'Phase-1, Sri Harsha 30, Villa No 4, Church Road\nKandhanchavadi, Perungudi\nChennai, Tamil Nadu – 600096',
  bankName: 'HDFC Bank Ltd',
  beneficiary: 'Medagg Healthcare Pvt Ltd',
  accountNumber: '50200065587355',
  ifscCode: 'HDFC0007517',
  paymentModes: 'NEFT / RTGS / UPI / CASH',
};

// Excel export utility
export const exportToExcel = (data: Record<string, unknown>[], filename: string) => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${row[h] ?? ''}"`).join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Template download
export const downloadTemplate = (type: 'hospital' | 'patient') => {
  let headers: string[];
  if (type === 'hospital') {
    headers = ['Name', 'Alternate Name', 'Address', 'Area', 'City', 'State', 'PIN Code', 'OP Share %', 'IP Share %', 'Diagnostic Share %', 'Contact Person', 'Phone', 'Email', 'MOU Start Date', 'MOU End Date'];
  } else {
    headers = ['Patient Name', 'Phone', 'Appointment Date', 'Service Type', 'Lead Type', 'Source Type', 'Hospital Name', 'City', 'Area', 'Doctor Name', 'BD Name', 'Procedure', 'Bill Amount', 'DCI Charges', 'Share %', 'Remarks'];
  }
  
  const csvContent = headers.join(',');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${type}_template.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
