export interface Hospital {
  id: string;
  name: string;
  alternateName?: string;
  address: string;
  area: string;
  city: string;
  state: string;
  pinCode: string;
  opShare: number;
  ipShare: number;
  diagnosticShare: number;
  contactPerson: string;
  phone: string;
  email: string;
  mouStartDate: string;
  mouEndDate: string;
  mouFileUrl?: string;
  status: 'Active' | 'Inactive' | 'Expired Soon' | 'Expired';
  manualInactive?: boolean;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  serviceType: 'OP' | 'IP' | 'Diagnostic';
  leadType: 'New' | 'Online' | 'Camp' | 'Review';
  sourceType: 'Meta' | 'Credit Health' | 'GBR' | 'Website' | 'Referral';
  hospitalId: string;
  hospitalName: string;
  hospitalAddress: string;
  city: string;
  area: string;
  doctorName: string;
  bdName: string;
  procedure: string;
  billAmount: number;
  dciCharges: number;
  finalAmount: number;
  sharePercent: number;
  shareAmount: number;
  invoiceStatus: 'Invoice Raised' | 'To Be Raised' | 'No Share';
  patientDate: string;
  month: number;
  year: number;
  remarks?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  hospitalId: string;
  hospitalName: string;
  hospitalAddress: string;
  hospitalCity?: string;
  hospitalArea?: string;
  items: InvoiceItem[];
  totalAmount: number;
  paidAmount: number;
  tdsPercent: number;
  tdsAmount: number;
  adjustedAmount: number;
  balanceAmount: number;
  status: 'Unpaid' | 'Paid' | 'Cancelled' | 'Amount Adjusted' | 'Hold';
  month: number;
  year: number;
  payments: Payment[];
  shortAmount?: number;
  excessAmount?: number;
}

export interface InvoiceItem {
  patientId?: string;
  patientName: string;
  patientDate?: string;
  serviceType: string;
  billAmount: number;
  dciCharges?: number;
  finalAmount?: number;
  sharePercent: number;
  shareAmount: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  paymentDate: string;
  paidAmount: number;
  tdsPercent: number;
  tdsAmount: number;
  adjustmentAmount: number;
  remarks: string;
}

export interface DashboardStats {
  totalInvoices: number;
  totalInvoiceAmount: number;
  totalPaidAmount: number;
  totalUnpaidAmount: number;
  totalCancelled: number;
  totalCancelledAmount: number;
  totalTdsAmount: number;
  totalAdjustmentAmount: number;
  totalBalanceAmount: number;
  // Counts per status
  paidCount: number;
  unpaidCount: number;
  adjustedCount: number;
  tdsCount: number;
  holdCount: number;
  holdAmount: number;
  // Short/Excess totals
  shortTotal: number;
  excessTotal: number;
  // Monthly data for chart
  monthlyData: {
    month: string;
    monthNum: number;
    op: number;
    ip: number;
    diagnostic: number;
    opCount: number;
    ipCount: number;
    diagnosticCount: number;
    invoiceAmount: number;
    paidAmount: number;
    unpaidAmount: number;
    tdsAmount: number;
  }[];
  // Service type stats
  serviceTypeStats: {
    op: { count: number; amount: number };
    ip: { count: number; amount: number };
    diagnostic: { count: number; amount: number };
  };
  // Status-wise patient stats
  patientStatusStats: {
    invoiceRaised: { count: number; amount: number };
    toBeRaised: { count: number; amount: number };
    noShare: { count: number; amount: number };
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Credential {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Finance' | 'Business Development' | 'Care Custodian' | 'HR' | 'Director' | 'Others';
  status: 'Active' | 'Inactive';
  password: string;
  createdAt: string;
}
