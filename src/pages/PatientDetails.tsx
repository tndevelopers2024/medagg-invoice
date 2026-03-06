import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/multi-select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { exportToExcel, downloadTemplate } from '@/data/mockData';
import { Download, Upload, FileSpreadsheet, Plus, Pencil, Trash2, FileText, Users, Stethoscope, Activity, ArrowUpDown, Eye, File, FilterX, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Patient } from '@/types';
import { format, parseISO, isValid } from 'date-fns';
import { usePermissions } from '@/hooks/usePermissions';
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

// Helper to parse various date formats including Excel serial numbers
const parseExcelDate = (value: string | number): string => {
  if (!value) return format(new Date(), 'yyyy-MM-dd');
  
  // If it's a number (Excel serial date)
  if (typeof value === 'number' || !isNaN(Number(value))) {
    const serial = Number(value);
    if (serial > 25569) { // Excel dates start from 1900-01-01 which is serial 1
      const date = new Date((serial - 25569) * 86400 * 1000);
      if (isValid(date)) return format(date, 'yyyy-MM-dd');
    }
  }
  
  const strValue = String(value).trim();
  
  // Try DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = strValue.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isValid(date)) return format(date, 'yyyy-MM-dd');
  }
  
  // Try YYYY-MM-DD
  const yyyymmdd = strValue.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (isValid(date)) return format(date, 'yyyy-MM-dd');
  }
  
  // Try parsing as ISO date
  try {
    const parsed = parseISO(strValue);
    if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd');
  } catch {}
  
  // Fallback to current date
  return format(new Date(), 'yyyy-MM-dd');
};

const PatientDetails = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  const hasEditAccess = canEdit('patients');
  const [monthFilter, setMonthFilter] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<string[]>(['2026']);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string[]>([]);
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string[]>([]);
  const [hospitalFilter, setHospitalFilter] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [areaFilter, setAreaFilter] = useState<string[]>([]);
  const [bdNameFilter, setBdNameFilter] = useState<string[]>([]);
  const [billAttachedFilter, setBillAttachedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [sortField, setSortField] = useState<'patientDate' | 'name' | 'hospitalName'>('patientDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const billUploadRef = useRef<HTMLInputElement>(null);
  const [uploadingBillForPatient, setUploadingBillForPatient] = useState<string | null>(null);
  const [billPreviewOpen, setBillPreviewOpen] = useState(false);
  const [billPreviewData, setBillPreviewData] = useState<{ url: string; name: string } | null>(null);

  // Bill attached statuses stored in localStorage
  const [billStatuses, setBillStatuses] = useState<Record<string, { billAttached?: boolean; billFileUrl?: string }>>(() => {
    const stored = localStorage.getItem('patientBillStatuses');
    return stored ? JSON.parse(stored) : {};
  });

  // Get Bill Attached status
  const getBillAttached = (patientId: string): boolean => {
    return billStatuses[patientId]?.billAttached ?? !!billStatuses[patientId]?.billFileUrl;
  };

  // Get Bill File URL
  const getBillFileUrl = (patientId: string): string | undefined => {
    return billStatuses[patientId]?.billFileUrl;
  };

  // Update Bill status
  const updateBillStatus = (patientId: string, field: 'billAttached' | 'billFileUrl', value: boolean | string | undefined) => {
    const updated = { 
      ...billStatuses, 
      [patientId]: { 
        ...billStatuses[patientId], 
        [field]: value,
        ...(field === 'billFileUrl' && value ? { billAttached: true } : {}),
        ...(field === 'billFileUrl' && !value ? { billAttached: false } : {})
      } 
    };
    setBillStatuses(updated);
    localStorage.setItem('patientBillStatuses', JSON.stringify(updated));
  };

  // Handle bill file upload
  const handleBillUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingBillForPatient) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateBillStatus(uploadingBillForPatient, 'billFileUrl', dataUrl);
      toast({ title: 'Bill Uploaded', description: 'Patient bill has been uploaded successfully.' });
      setUploadingBillForPatient(null);
    };
    reader.readAsDataURL(file);
    if (billUploadRef.current) billUploadRef.current.value = '';
  };

  // View bill - open in modal
  const handleViewBill = (patientId: string, patientName: string) => {
    const billUrl = getBillFileUrl(patientId);
    if (billUrl) {
      setBillPreviewData({ url: billUrl, name: patientName });
      setBillPreviewOpen(true);
    }
  };

  // Download bill
  const handleDownloadBill = (patientId: string, patientName: string) => {
    const billUrl = getBillFileUrl(patientId);
    if (billUrl) {
      const link = document.createElement('a');
      link.href = billUrl;
      const isPdf = billUrl.startsWith('data:application/pdf');
      link.download = `bill-${patientName.replace(/\s+/g, '-').toLowerCase()}${isPdf ? '.pdf' : '.jpg'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Delete bill
  const handleDeleteBill = (patientId: string) => {
    updateBillStatus(patientId, 'billFileUrl', undefined);
    updateBillStatus(patientId, 'billAttached', false);
    toast({ title: 'Bill Deleted', description: 'Patient bill has been removed.' });
  };

  const safePatients = useMemo(() => asArray<Patient>(patients), [patients]);
  const safeHospitals = useMemo(() => asArray<any>(hospitals), [hospitals]);
  const safeInvoices = useMemo(() => asArray<any>(invoices), [invoices]);

  const cities = useMemo(() => [...new Set(safePatients.map(p => p.city).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [safePatients]);
  const areas = useMemo(() => [...new Set(safePatients.map(p => p.area).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [safePatients]);
  const bdNames = useMemo(() => [...new Set(safePatients.map(p => p.bdName).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [safePatients]);

  const [formData, setFormData] = useState({
    name: '', phone: '', patientDate: format(new Date(), 'yyyy-MM-dd'),
    serviceType: 'OP' as Patient['serviceType'], 
    leadType: 'New' as Patient['leadType'],
    sourceType: 'Meta' as Patient['sourceType'],
    hospitalId: '', doctorName: '', bdName: '', procedure: '',
    billAmount: 0, dciCharges: 0, sharePercent: 0,
    city: '', area: '', remarks: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [p, h, i] = await Promise.all([
          apiFetch<Patient[]>('/api/patients'),
          apiFetch<any[]>('/api/hospitals'),
          apiFetch<any[]>('/api/invoices'),
        ]);
        setPatients(asArray<Patient>(p));
        setHospitals(asArray<any>(h));
        setInvoices(asArray<any>(i));
      } catch (e) {
        toast({
          title: 'Error',
          description: (e as Error)?.message || 'Failed to load data.',
          variant: 'destructive',
        });
      }
    };
    load();
  }, [toast]);

  const refreshPatients = async () => {
    const p = await apiFetch<Patient[]>('/api/patients');
    setPatients(asArray<Patient>(p));
  };

  // Month and Year options for multi-select
  const monthOptions = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  // Generate years dynamically from 2020 to current year + 15
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2020;
    const endYear = currentYear + 15;
    const years = [];
    for (let year = startYear; year <= endYear; year++) {
      years.push({ value: year.toString(), label: year.toString() });
    }
    return years;
  }, []);

  const allFilteredPatients = useMemo(() => {
    return safePatients.filter((p) => {
      let matchesDate = true;
      if (yearFilter.length > 0) {
        const selectedYears = yearFilter.map(y => parseInt(y));
        matchesDate = selectedYears.includes(p.year);
        if (monthFilter.length > 0) {
          const selectedMonths = monthFilter.map(m => parseInt(m));
          matchesDate = matchesDate && selectedMonths.includes(p.month);
        }
      }
      
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        p.name.toLowerCase().includes(searchLower) ||
        p.hospitalName.toLowerCase().includes(searchLower) ||
        (p.city && p.city.toLowerCase().includes(searchLower)) ||
        (p.area && p.area.toLowerCase().includes(searchLower)) ||
        (p.bdName && p.bdName.toLowerCase().includes(searchLower)) ||
        (p.doctorName && p.doctorName.toLowerCase().includes(searchLower)) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(searchLower));
      
      const matchesStatus = invoiceStatusFilter.length === 0 || invoiceStatusFilter.includes(p.invoiceStatus);
      const matchesService = serviceTypeFilter.length === 0 || serviceTypeFilter.includes(p.serviceType);
      const matchesHospital = hospitalFilter.length === 0 || hospitalFilter.includes(p.hospitalId);
      const matchesCity = cityFilter.length === 0 || (p.city && cityFilter.includes(p.city));
      const matchesArea = areaFilter.length === 0 || (p.area && areaFilter.includes(p.area));
      const matchesBdName = bdNameFilter.length === 0 || (p.bdName && bdNameFilter.includes(p.bdName));
      
      // Bill attached filter
      const billAttached = getBillAttached(p.id);
      const matchesBillAttached = billAttachedFilter === 'all' || 
        (billAttachedFilter === 'yes' && billAttached) || 
        (billAttachedFilter === 'no' && !billAttached);
      
      return matchesDate && matchesSearch && matchesStatus && matchesService && matchesHospital && matchesCity && matchesArea && matchesBdName && matchesBillAttached;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'patientDate') {
        comparison = new Date(a.patientDate).getTime() - new Date(b.patientDate).getTime();
      } else if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'hospitalName') {
        comparison = a.hospitalName.localeCompare(b.hospitalName);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [safePatients, yearFilter, monthFilter, searchQuery, invoiceStatusFilter, serviceTypeFilter, hospitalFilter, cityFilter, areaFilter, bdNameFilter, billAttachedFilter, sortField, sortOrder, billStatuses]);

  // Non-bill filtered patients (for bill counts - excludes bill filter)
  const nonBillFilteredPatients = useMemo(() => {
    return safePatients.filter((p) => {
      let matchesDate = true;
      if (yearFilter.length > 0) {
        const selectedYears = yearFilter.map(y => parseInt(y));
        matchesDate = selectedYears.includes(p.year);
        if (monthFilter.length > 0) {
          const selectedMonths = monthFilter.map(m => parseInt(m));
          matchesDate = matchesDate && selectedMonths.includes(p.month);
        }
      }
      
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        p.name.toLowerCase().includes(searchLower) ||
        p.hospitalName.toLowerCase().includes(searchLower) ||
        (p.city && p.city.toLowerCase().includes(searchLower)) ||
        (p.area && p.area.toLowerCase().includes(searchLower)) ||
        (p.bdName && p.bdName.toLowerCase().includes(searchLower)) ||
        (p.doctorName && p.doctorName.toLowerCase().includes(searchLower)) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(searchLower));
      
      const matchesStatus = invoiceStatusFilter.length === 0 || invoiceStatusFilter.includes(p.invoiceStatus);
      const matchesService = serviceTypeFilter.length === 0 || serviceTypeFilter.includes(p.serviceType);
      const matchesHospital = hospitalFilter.length === 0 || hospitalFilter.includes(p.hospitalId);
      const matchesCity = cityFilter.length === 0 || (p.city && cityFilter.includes(p.city));
      const matchesArea = areaFilter.length === 0 || (p.area && areaFilter.includes(p.area));
      const matchesBdName = bdNameFilter.length === 0 || (p.bdName && bdNameFilter.includes(p.bdName));
      return matchesDate && matchesSearch && matchesStatus && matchesService && matchesHospital && matchesCity && matchesArea && matchesBdName;
    });
  }, [safePatients, yearFilter, monthFilter, searchQuery, invoiceStatusFilter, serviceTypeFilter, hospitalFilter, cityFilter, areaFilter, bdNameFilter]);

  // Bill Summary counts - based on filtered patients (excluding bill filter itself)
  const billCounts = useMemo(() => {
    const attachedYes = nonBillFilteredPatients.filter(p => getBillAttached(p.id)).length;
    const attachedNo = nonBillFilteredPatients.filter(p => !getBillAttached(p.id)).length;
    return { total: nonBillFilteredPatients.length, attachedYes, attachedNo };
  }, [nonBillFilteredPatients, billStatuses]);

  // Paginated patients
  const totalPages = Math.ceil(allFilteredPatients.length / pageSize);
  const paginatedPatients = allFilteredPatients.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  // Calculate totals from all filtered (not just paginated)
  const totalDciCharges = allFilteredPatients.reduce((sum, p) => sum + (p.dciCharges || 0), 0);
  const totalBillAmount = allFilteredPatients.reduce((sum, p) => sum + (p.finalAmount || p.billAmount), 0);
  const totalShareAmount = allFilteredPatients.reduce((sum, p) => sum + p.shareAmount, 0);

  // Service type summary cards with status breakdown - counts included
  const serviceStats = useMemo(() => ({
    op: { 
      count: allFilteredPatients.filter(p => p.serviceType === 'OP').length, 
      share: allFilteredPatients.filter(p => p.serviceType === 'OP').reduce((s, p) => s + p.shareAmount, 0),
      invoiceRaised: allFilteredPatients.filter(p => p.serviceType === 'OP' && p.invoiceStatus === 'Invoice Raised').reduce((s, p) => s + p.shareAmount, 0),
      invoiceRaisedCount: allFilteredPatients.filter(p => p.serviceType === 'OP' && p.invoiceStatus === 'Invoice Raised').length,
      toBeRaised: allFilteredPatients.filter(p => p.serviceType === 'OP' && p.invoiceStatus === 'To Be Raised').reduce((s, p) => s + p.shareAmount, 0),
      toBeRaisedCount: allFilteredPatients.filter(p => p.serviceType === 'OP' && p.invoiceStatus === 'To Be Raised').length,
      noShare: allFilteredPatients.filter(p => p.serviceType === 'OP' && p.invoiceStatus === 'No Share').reduce((s, p) => s + (p.finalAmount || p.billAmount), 0),
      noShareCount: allFilteredPatients.filter(p => p.serviceType === 'OP' && p.invoiceStatus === 'No Share').length,
    },
    ip: { 
      count: allFilteredPatients.filter(p => p.serviceType === 'IP').length, 
      share: allFilteredPatients.filter(p => p.serviceType === 'IP').reduce((s, p) => s + p.shareAmount, 0),
      invoiceRaised: allFilteredPatients.filter(p => p.serviceType === 'IP' && p.invoiceStatus === 'Invoice Raised').reduce((s, p) => s + p.shareAmount, 0),
      invoiceRaisedCount: allFilteredPatients.filter(p => p.serviceType === 'IP' && p.invoiceStatus === 'Invoice Raised').length,
      toBeRaised: allFilteredPatients.filter(p => p.serviceType === 'IP' && p.invoiceStatus === 'To Be Raised').reduce((s, p) => s + p.shareAmount, 0),
      toBeRaisedCount: allFilteredPatients.filter(p => p.serviceType === 'IP' && p.invoiceStatus === 'To Be Raised').length,
      noShare: allFilteredPatients.filter(p => p.serviceType === 'IP' && p.invoiceStatus === 'No Share').reduce((s, p) => s + (p.finalAmount || p.billAmount), 0),
      noShareCount: allFilteredPatients.filter(p => p.serviceType === 'IP' && p.invoiceStatus === 'No Share').length,
    },
    diagnostic: { 
      count: allFilteredPatients.filter(p => p.serviceType === 'Diagnostic').length, 
      share: allFilteredPatients.filter(p => p.serviceType === 'Diagnostic').reduce((s, p) => s + p.shareAmount, 0),
      invoiceRaised: allFilteredPatients.filter(p => p.serviceType === 'Diagnostic' && p.invoiceStatus === 'Invoice Raised').reduce((s, p) => s + p.shareAmount, 0),
      invoiceRaisedCount: allFilteredPatients.filter(p => p.serviceType === 'Diagnostic' && p.invoiceStatus === 'Invoice Raised').length,
      toBeRaised: allFilteredPatients.filter(p => p.serviceType === 'Diagnostic' && p.invoiceStatus === 'To Be Raised').reduce((s, p) => s + p.shareAmount, 0),
      toBeRaisedCount: allFilteredPatients.filter(p => p.serviceType === 'Diagnostic' && p.invoiceStatus === 'To Be Raised').length,
      noShare: allFilteredPatients.filter(p => p.serviceType === 'Diagnostic' && p.invoiceStatus === 'No Share').reduce((s, p) => s + (p.finalAmount || p.billAmount), 0),
      noShareCount: allFilteredPatients.filter(p => p.serviceType === 'Diagnostic' && p.invoiceStatus === 'No Share').length,
    },
  }), [allFilteredPatients]);

  // Live share amount calculation
  const liveShareAmount = useMemo(() => {
    const finalAmount = formData.billAmount - formData.dciCharges;
    return (finalAmount * formData.sharePercent) / 100;
  }, [formData.billAmount, formData.dciCharges, formData.sharePercent]);

  // Multi-select options - sorted A-Z (no "All" option for multi-select)
  const hospitalOptions = useMemo(() => 
    safeHospitals.slice().sort((a, b) => a.name.localeCompare(b.name)).map(h => ({ value: h.id, label: h.name, sublabel: `${h.city}${h.area ? `, ${h.area}` : ''}` }))
  , [safeHospitals]);

  const cityOptions = useMemo(() => 
    cities.map(c => ({ value: c, label: c }))
  , [cities]);

  const areaOptions = useMemo(() => 
    areas.map(a => ({ value: a, label: a }))
  , [areas]);

  const bdNameOptions = useMemo(() => 
    bdNames.map(b => ({ value: b, label: b }))
  , [bdNames]);

  const invoiceStatusOptions = [
    { value: 'Invoice Raised', label: 'Invoice Raised' },
    { value: 'To Be Raised', label: 'To Be Raised' },
    { value: 'No Share', label: 'No Share' },
  ];

  const serviceTypeOptions = [
    { value: 'OP', label: 'OP' },
    { value: 'IP', label: 'IP' },
    { value: 'Diagnostic', label: 'Diagnostic' },
  ];

  const hospitalFormOptions = useMemo(() => 
    safeHospitals.slice().sort((a, b) => a.name.localeCompare(b.name)).map(h => ({ value: h.id, label: h.name, sublabel: `${h.city}${h.area ? `, ${h.area}` : ''}` }))
  , [safeHospitals]);

  // Auto-fill hospital details when selected
  const handleHospitalChange = (hospitalId: string) => {
    const hospital = safeHospitals.find(h => h.id === hospitalId);
    if (hospital) {
      let sharePercent = formData.sharePercent;
      if (formData.serviceType === 'OP') sharePercent = hospital.opShare;
      else if (formData.serviceType === 'IP') sharePercent = hospital.ipShare;
      else if (formData.serviceType === 'Diagnostic') sharePercent = hospital.diagnosticShare;
      
      setFormData(p => ({
        ...p,
        hospitalId,
        city: hospital.city || p.city,
        area: hospital.area || p.area,
        sharePercent,
      }));
    } else {
      setFormData(p => ({ ...p, hospitalId }));
    }
  };

  // Auto-update share % when service type changes
  const handleServiceTypeChange = (serviceType: Patient['serviceType']) => {
    const hospital = safeHospitals.find(h => h.id === formData.hospitalId);
    let sharePercent = formData.sharePercent;
    if (hospital) {
      if (serviceType === 'OP') sharePercent = hospital.opShare;
      else if (serviceType === 'IP') sharePercent = hospital.ipShare;
      else if (serviceType === 'Diagnostic') sharePercent = hospital.diagnosticShare;
    }
    setFormData(p => ({ ...p, serviceType, sharePercent }));
  };

  // Helper to get invoice info for a patient
  const getPatientInvoiceInfo = (patient: Patient) => {
    if (patient.invoiceStatus !== 'Invoice Raised') return null;
    
    // Find invoice that contains this patient
    const invoice = safeInvoices.find(inv => 
      inv.items.some(item => item.patientId === patient.id)
    );
    
    if (invoice) {
      return {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate
      };
    }
    
    // Fallback to patient's stored values
    if (patient.invoiceNumber) {
      return {
        invoiceNumber: patient.invoiceNumber,
        invoiceDate: patient.invoiceDate || ''
      };
    }
    
    return null;
  };

  const handleSavePatient = async () => {
    const hospital = safeHospitals.find(h => h.id === formData.hospitalId);
    if (!hospital || !formData.name || !formData.patientDate) {
      toast({ title: 'Error', description: 'Please fill required fields (Name, Date, Hospital).', variant: 'destructive' });
      return;
    }
    const patientDate = parseISO(formData.patientDate);
    const finalAmount = formData.billAmount - formData.dciCharges;
    const shareAmount = (finalAmount * formData.sharePercent) / 100;
    const invoiceStatus: Patient['invoiceStatus'] = formData.sharePercent === 0 ? 'No Share' : 'To Be Raised';

    const patientData: Patient = {
      id: editingPatient?.id || '',
      name: formData.name, phone: formData.phone, patientDate: formData.patientDate,
      serviceType: formData.serviceType, leadType: formData.leadType, sourceType: formData.sourceType,
      hospitalId: formData.hospitalId, hospitalName: hospital.name,
      hospitalAddress: hospital.address,
      city: formData.city || hospital.city || '',
      area: formData.area || hospital.area || '',
      doctorName: formData.doctorName, bdName: formData.bdName,
      procedure: formData.procedure,
      billAmount: formData.billAmount, dciCharges: formData.dciCharges,
      finalAmount, sharePercent: formData.sharePercent, shareAmount,
      invoiceStatus: editingPatient?.invoiceStatus === 'Invoice Raised' ? 'Invoice Raised' : invoiceStatus,
      invoiceNumber: editingPatient?.invoiceNumber || '',
      month: patientDate.getMonth() + 1, year: patientDate.getFullYear(),
      remarks: formData.remarks,
    };

    try {
      if (editingPatient) {
        await apiFetch(`/api/patients/${editingPatient.id}`, {
          method: 'PUT',
          body: JSON.stringify(patientData),
        });
      } else {
        const { id: _omitId, ...createPayload } = patientData;
        await apiFetch('/api/patients', {
          method: 'POST',
          body: JSON.stringify(createPayload),
        });
      }

      await refreshPatients();
      setAddDialogOpen(false);
      setEditingPatient(null);
      resetForm();
      toast({ title: editingPatient ? 'Patient updated' : 'Patient added' });
    } catch (e) {
      toast({
        title: 'Error',
        description: (e as Error)?.message || 'Failed to save patient.',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => setFormData({ 
    name: '', phone: '', patientDate: format(new Date(), 'yyyy-MM-dd'), 
    serviceType: 'OP', leadType: 'New', sourceType: 'Meta',
    hospitalId: '', doctorName: '', bdName: '', procedure: '',
    billAmount: 0, dciCharges: 0, sharePercent: 0,
    city: '', area: '', remarks: '',
  });

  const handleEdit = (patient: Patient) => {
    setFormData({ 
      name: patient.name, phone: patient.phone, patientDate: patient.patientDate, 
      serviceType: patient.serviceType, leadType: patient.leadType || 'New', 
      sourceType: patient.sourceType || 'Meta',
      hospitalId: patient.hospitalId, doctorName: patient.doctorName, bdName: patient.bdName,
      procedure: patient.procedure || '',
      billAmount: patient.billAmount, dciCharges: patient.dciCharges || 0,
      sharePercent: patient.sharePercent,
      city: patient.city || '', area: patient.area || '',
      remarks: patient.remarks || '',
    });
    setEditingPatient(patient);
    setAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/api/patients/${id}`, { method: 'DELETE' });
      await refreshPatients();
      toast({ title: 'Patient deleted' });
    } catch (e) {
      toast({
        title: 'Error',
        description: (e as Error)?.message || 'Failed to delete patient.',
        variant: 'destructive',
      });
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      
      const newPatients: Patient[] = [];
      lines.slice(1).filter(line => line.trim()).forEach((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const name = values[0] || '';
        if (!name) return;
        
        // Find hospital by name (case-insensitive) or alternate name
        const hospitalName = (values[6] || '').toLowerCase();
        const hospital = hospitals.find(h => 
          h.name.toLowerCase() === hospitalName || 
          (h.alternateName && h.alternateName.toLowerCase() === hospitalName)
        );
        
        const serviceType = (values[3] as Patient['serviceType']) || 'OP';
        const billAmount = parseFloat(values[12]) || 0;
        const dciCharges = parseFloat(values[13]) || 0;
        const finalAmount = billAmount - dciCharges;
        
        // Fetch share % from hospital based on service type if hospital found
        let sharePercent = parseFloat(values[14]) || 0;
        if (hospital && !values[14]) {
          if (serviceType === 'OP') sharePercent = hospital.opShare;
          else if (serviceType === 'IP') sharePercent = hospital.ipShare;
          else if (serviceType === 'Diagnostic') sharePercent = hospital.diagnosticShare;
        }
        
        const shareAmount = (finalAmount * sharePercent) / 100;
        // Parse date with support for various formats
        const patientDate = parseExcelDate(values[2]);
        const date = parseISO(patientDate);
        const invoiceStatus: Patient['invoiceStatus'] = sharePercent === 0 ? 'No Share' : 'To Be Raised';
        
        newPatients.push({
          id: String(Date.now() + index),
          name,
          phone: values[1] || '',
          patientDate,
          serviceType,
          leadType: (values[4] as Patient['leadType']) || 'New',
          sourceType: (values[5] as Patient['sourceType']) || 'Meta',
          hospitalId: hospital?.id || '',
          hospitalName: hospital?.name || values[6] || '',
          hospitalAddress: hospital?.address || '',
          city: values[7] || hospital?.city || '',
          area: values[8] || hospital?.area || '',
          doctorName: values[9] || '',
          bdName: values[10] || '',
          procedure: values[11] || '',
          billAmount,
          dciCharges,
          finalAmount,
          sharePercent,
          shareAmount,
          invoiceStatus,
          month: date.getMonth() + 1,
          year: date.getFullYear(),
          remarks: values[15] || '',
        });
      });

      try {
        for (const p of newPatients) {
          const { id: _omitId, ...createPayload } = p;
          await apiFetch('/api/patients', {
            method: 'POST',
            body: JSON.stringify(createPayload),
          });
        }

        await refreshPatients();
        toast({ title: 'Import complete', description: `${newPatients.length} patients imported.` });
      } catch (err) {
        toast({
          title: 'Import failed',
          description: (err as Error)?.message || 'Failed to import patients.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Export ALL filtered records (not just current page)
  const handleExport = () => {
    exportToExcel(allFilteredPatients.map(p => ({ 
      'Patient Name': p.name, Phone: p.phone, 'Appointment Date': p.patientDate, 
      'Service Type': p.serviceType, 'Lead Type': p.leadType, 'Source Type': p.sourceType,
      Hospital: p.hospitalName, City: p.city, Area: p.area,
      Doctor: p.doctorName, 'BD Name': p.bdName, Procedure: p.procedure,
      'Bill Amount': p.billAmount, 'DCI Charges': p.dciCharges, 'Final Amount': p.finalAmount,
      'Share %': p.sharePercent, 'Share Amount': p.shareAmount, 'Invoice Status': p.invoiceStatus,
      'Invoice Number': p.invoiceNumber, Remarks: p.remarks,
    })), 'patients');
    toast({ title: 'Export complete' });
  };

  const handleCreateInvoice = () => {
    if (selectedPatients.length === 0) { toast({ title: 'Select patients', variant: 'destructive' }); return; }
    navigate('/invoices/create', { state: { selectedPatientIds: selectedPatients } });
  };

  const toggleSelectAll = () => {
    const eligibleIds = paginatedPatients.filter(p => p.invoiceStatus === 'To Be Raised').map(p => p.id);
    setSelectedPatients(selectedPatients.length === eligibleIds.length ? [] : eligibleIds);
  };

  const handleSort = (field: 'patientDate' | 'name' | 'hospitalName') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 overflow-y-auto">
        <PageHeader title="Patient Details" description="View and manage patient billing information"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => downloadTemplate('patient')}><FileSpreadsheet className="w-4 h-4 mr-2" />Template</Button>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
              {hasEditAccess && (
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="w-4 h-4 mr-2" />Import</Button>
              )}
              <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 mr-2" />Export</Button>
              {hasEditAccess && (
                <Button onClick={() => { resetForm(); setEditingPatient(null); setAddDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Patient</Button>
              )}
            </div>
          }
        />

        {/* Bill Upload Hidden Input */}
        <input
          ref={billUploadRef}
          type="file"
          accept=".pdf,image/*"
          onChange={handleBillUpload}
          className="hidden"
        />

        {/* Live Summary Heading */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Live Summary</h3>
          {billAttachedFilter !== 'all' && (
            <Button variant="outline" size="sm" onClick={() => setBillAttachedFilter('all')}>
              <FilterX className="w-4 h-4 mr-2" />
              Clear Bill Filter
            </Button>
          )}
        </div>

        {/* Patient Summary Cards by Service Type with Status Breakdown + Counts + Bill Card */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="p-4 rounded-lg border bg-card shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">OP Patients</p>
                <p className="text-xl font-bold">{serviceStats.op.count}</p>
                <p className="text-sm text-success font-medium">{formatCurrency(serviceStats.op.share)}</p>
              </div>
            </div>
            <div className="border-t pt-2 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Raised:</span><span className="font-medium text-success">{formatCurrency(serviceStats.op.invoiceRaised)} ({serviceStats.op.invoiceRaisedCount})</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">To Be Raised:</span><span className="font-medium text-warning">{formatCurrency(serviceStats.op.toBeRaised)} ({serviceStats.op.toBeRaisedCount})</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">No Share:</span><span className="font-medium">{formatCurrency(serviceStats.op.noShare)} ({serviceStats.op.noShareCount})</span></div>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-card shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">IP Patients</p>
                <p className="text-xl font-bold">{serviceStats.ip.count}</p>
                <p className="text-sm text-success font-medium">{formatCurrency(serviceStats.ip.share)}</p>
              </div>
            </div>
            <div className="border-t pt-2 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Raised:</span><span className="font-medium text-success">{formatCurrency(serviceStats.ip.invoiceRaised)} ({serviceStats.ip.invoiceRaisedCount})</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">To Be Raised:</span><span className="font-medium text-warning">{formatCurrency(serviceStats.ip.toBeRaised)} ({serviceStats.ip.toBeRaisedCount})</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">No Share:</span><span className="font-medium">{formatCurrency(serviceStats.ip.noShare)} ({serviceStats.ip.noShareCount})</span></div>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-card shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Diagnostic Patients</p>
                <p className="text-xl font-bold">{serviceStats.diagnostic.count}</p>
                <p className="text-sm text-success font-medium">{formatCurrency(serviceStats.diagnostic.share)}</p>
              </div>
            </div>
            <div className="border-t pt-2 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Raised:</span><span className="font-medium text-success">{formatCurrency(serviceStats.diagnostic.invoiceRaised)} ({serviceStats.diagnostic.invoiceRaisedCount})</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">To Be Raised:</span><span className="font-medium text-warning">{formatCurrency(serviceStats.diagnostic.toBeRaised)} ({serviceStats.diagnostic.toBeRaisedCount})</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">No Share:</span><span className="font-medium">{formatCurrency(serviceStats.diagnostic.noShare)} ({serviceStats.diagnostic.noShareCount})</span></div>
            </div>
          </div>
          
          {/* Bill Summary Card */}
          <div 
            onClick={() => setBillAttachedFilter('all')}
            className="p-4 rounded-lg border bg-accent/5 border-accent/30 cursor-pointer hover:bg-accent/10 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <File className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold">Total Patient Bills</p>
                <p className="text-xl font-bold">{billCounts.total}</p>
              </div>
            </div>
            <div className="border-t pt-2 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Bill Attached:</span>
                <div className="flex gap-2">
                  <span 
                    onClick={(e) => { e.stopPropagation(); setBillAttachedFilter('yes'); }}
                    className="text-success font-medium cursor-pointer hover:underline"
                  >
                    Yes ({billCounts.attachedYes})
                  </span>
                  <span 
                    onClick={(e) => { e.stopPropagation(); setBillAttachedFilter('no'); }}
                    className="text-destructive font-medium cursor-pointer hover:underline"
                  >
                    No ({billCounts.attachedNo})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Amount Totals */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted/30 rounded-lg border mb-4">
          <div><p className="text-xs text-muted-foreground">Total Records</p><p className="font-semibold">{allFilteredPatients.length}</p></div>
          <div><p className="text-xs text-muted-foreground">Total Bill Amount</p><p className="font-semibold">{formatCurrency(allFilteredPatients.reduce((s, p) => s + p.billAmount, 0))}</p></div>
          <div><p className="text-xs text-muted-foreground">Total DCI Charges</p><p className="font-semibold">{formatCurrency(totalDciCharges)}</p></div>
          <div><p className="text-xs text-muted-foreground">Total Final Amount</p><p className="font-semibold">{formatCurrency(totalBillAmount)}</p></div>
          <div><p className="text-xs text-muted-foreground">Total Share Amount</p><p className="font-semibold text-success">{formatCurrency(totalShareAmount)}</p></div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg border mb-6 bg-card">
          <div className="relative min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Year</Label>
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
            <Label className="text-xs text-muted-foreground mb-1 block">Month</Label>
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
          <MultiSelect
            options={invoiceStatusOptions}
            value={invoiceStatusFilter}
            onValueChange={setInvoiceStatusFilter}
            placeholder="All Status"
            searchPlaceholder="Search..."
            className="w-[160px]"
          />
          <MultiSelect
            options={serviceTypeOptions}
            value={serviceTypeFilter}
            onValueChange={setServiceTypeFilter}
            placeholder="All Types"
            searchPlaceholder="Search..."
            className="w-[140px]"
          />
          <MultiSelect
            options={hospitalOptions}
            value={hospitalFilter}
            onValueChange={setHospitalFilter}
            placeholder="All Hospitals"
            searchPlaceholder="Search hospital..."
            className="w-[200px]"
          />
          <MultiSelect
            options={cityOptions}
            value={cityFilter}
            onValueChange={setCityFilter}
            placeholder="All Cities"
            searchPlaceholder="Search city..."
            className="w-[140px]"
          />
          <MultiSelect
            options={areaOptions}
            value={areaFilter}
            onValueChange={setAreaFilter}
            placeholder="All Areas"
            searchPlaceholder="Search area..."
            className="w-[160px]"
          />
          <MultiSelect
            options={bdNameOptions}
            value={bdNameFilter}
            onValueChange={setBdNameFilter}
            placeholder="All BD Names"
            searchPlaceholder="Search BD..."
            className="w-[160px]"
          />
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Button variant={sortField === 'patientDate' ? 'default' : 'outline'} size="sm" onClick={() => handleSort('patientDate')}>
            <ArrowUpDown className="w-3 h-3 mr-1" />Date {sortField === 'patientDate' && (sortOrder === 'asc' ? '↑' : '↓')}
          </Button>
          <Button variant={sortField === 'name' ? 'default' : 'outline'} size="sm" onClick={() => handleSort('name')}>
            <ArrowUpDown className="w-3 h-3 mr-1" />Patient {sortField === 'name' && (sortOrder === 'asc' ? 'A-Z' : 'Z-A')}
          </Button>
          <Button variant={sortField === 'hospitalName' ? 'default' : 'outline'} size="sm" onClick={() => handleSort('hospitalName')}>
            <ArrowUpDown className="w-3 h-3 mr-1" />Hospital {sortField === 'hospitalName' && (sortOrder === 'asc' ? 'A-Z' : 'Z-A')}
          </Button>
        </div>

        {hasEditAccess && selectedPatients.length > 0 && (
          <div className="mb-4 p-3 bg-accent/10 rounded-lg flex items-center justify-between">
            <span>{selectedPatients.length} patient(s) selected</span>
            <Button onClick={handleCreateInvoice}><FileText className="w-4 h-4 mr-2" />Create Invoice</Button>
          </div>
        )}

        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="table-finance">
              <thead className="sticky top-0 bg-card z-10">
                <tr>
                  {hasEditAccess && <th><Checkbox checked={selectedPatients.length === paginatedPatients.filter(p => p.invoiceStatus === 'To Be Raised').length && selectedPatients.length > 0} onCheckedChange={toggleSelectAll} /></th>}
                  <th>Patient Name</th>
                  <th>Appt Date</th>
                  <th>Service</th>
                  <th>Hospital</th>
                  <th>Area</th>
                  <th>BD Name</th>
                  <th>Bill Amt</th>
                  <th>DCI</th>
                  <th>Final Amt</th>
                  <th>Share %</th>
                  <th>Share Amt</th>
                  <th>Status</th>
                  <th>Invoice No.</th>
                  <th>Bill Attached</th>
                  <th>Bill Actions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPatients.map((patient) => {
                  const invoiceInfo = getPatientInvoiceInfo(patient);
                  return (
                    <tr key={patient.id}>
                      {hasEditAccess && <td><Checkbox disabled={patient.invoiceStatus !== 'To Be Raised'} checked={selectedPatients.includes(patient.id)} onCheckedChange={(checked) => setSelectedPatients(checked ? [...selectedPatients, patient.id] : selectedPatients.filter(id => id !== patient.id))} /></td>}
                      <td className="font-medium">{patient.name}</td>
                      <td>{new Date(patient.patientDate).toLocaleDateString('en-IN')}</td>
                      <td><span className="px-2 py-0.5 rounded text-xs font-medium bg-muted">{patient.serviceType}</span></td>
                      <td>{patient.hospitalName}</td>
                      <td>{patient.area || '-'}</td>
                      <td>{patient.bdName}</td>
                      <td>{formatCurrency(patient.billAmount)}</td>
                      <td>{patient.dciCharges > 0 ? formatCurrency(patient.dciCharges) : '-'}</td>
                      <td className="font-medium">{formatCurrency(patient.finalAmount || patient.billAmount)}</td>
                      <td>{patient.sharePercent}%</td>
                      <td className="font-medium">{formatCurrency(patient.shareAmount)}</td>
                      <td><StatusBadge status={patient.invoiceStatus} /></td>
                      <td className="text-xs">
                        {invoiceInfo ? (
                          <div>
                            <span className="font-medium">{invoiceInfo.invoiceNumber}</span>
                            {invoiceInfo.invoiceDate && (
                              <span className="block text-muted-foreground">
                                {new Date(invoiceInfo.invoiceDate).toLocaleDateString('en-IN')}
                              </span>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td>
                        <Select
                          value={getBillAttached(patient.id) ? 'yes' : 'no'}
                          onValueChange={(val) => updateBillStatus(patient.id, 'billAttached', val === 'yes')}
                        >
                          <SelectTrigger className="h-7 w-16 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => { setUploadingBillForPatient(patient.id); billUploadRef.current?.click(); }}
                            title="Upload Bill"
                          >
                            <Upload className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          {getBillFileUrl(patient.id) && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleViewBill(patient.id, patient.name)}
                                title="View Bill"
                              >
                                <Eye className="w-4 h-4 text-accent" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleDownloadBill(patient.id, patient.name)}
                                title="Download Bill"
                              >
                                <Download className="w-4 h-4 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteBill(patient.id)}
                                title="Delete Bill"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        {hasEditAccess ? (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(patient)}><Pencil className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(patient.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">View only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {allFilteredPatients.length === 0 && <div className="p-8 text-center text-muted-foreground">No patient records found.</div>}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, allFilteredPatients.length)} of {allFilteredPatients.length} records
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>First</Button>
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</Button>
                <span className="text-sm px-2">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</Button>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>Last</Button>
              </div>
            </div>
          )}
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{editingPatient ? 'Edit Patient' : 'Add Patient'}</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Patient Name *</Label><Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Appointment Date *</Label><Input type="date" value={formData.patientDate} onChange={e => setFormData(p => ({ ...p, patientDate: e.target.value }))} /></div>
                <div>
                  <Label>Hospital *</Label>
                  <SearchableSelect
                    options={hospitalFormOptions}
                    value={formData.hospitalId}
                    onValueChange={handleHospitalChange}
                    placeholder="Select hospital"
                    searchPlaceholder="Search hospital..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>City</Label><Input value={formData.city} onChange={e => setFormData(p => ({ ...p, city: e.target.value }))} /></div>
                <div><Label>Area / Place</Label><Input value={formData.area} onChange={e => setFormData(p => ({ ...p, area: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Service Type</Label><Select value={formData.serviceType} onValueChange={handleServiceTypeChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="OP">OP</SelectItem><SelectItem value="IP">IP</SelectItem><SelectItem value="Diagnostic">Diagnostic</SelectItem></SelectContent></Select></div>
                <div><Label>Lead Type</Label><Select value={formData.leadType} onValueChange={v => setFormData(p => ({ ...p, leadType: v as Patient['leadType'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="New">New</SelectItem><SelectItem value="Online">Online</SelectItem><SelectItem value="Camp">Camp</SelectItem><SelectItem value="Review">Review</SelectItem></SelectContent></Select></div>
                <div><Label>Source Type</Label><Select value={formData.sourceType} onValueChange={v => setFormData(p => ({ ...p, sourceType: v as Patient['sourceType'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Meta">Meta</SelectItem><SelectItem value="Credit Health">Credit Health</SelectItem><SelectItem value="GBR">GBR</SelectItem><SelectItem value="Website">Website</SelectItem><SelectItem value="Referral">Referral</SelectItem></SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Doctor Name</Label><Input value={formData.doctorName} onChange={e => setFormData(p => ({ ...p, doctorName: e.target.value }))} /></div>
                <div><Label>BD Name</Label><Input value={formData.bdName} onChange={e => setFormData(p => ({ ...p, bdName: e.target.value }))} /></div>
              </div>
              <div><Label>Procedure</Label><Input value={formData.procedure} onChange={e => setFormData(p => ({ ...p, procedure: e.target.value }))} /></div>
              <div className="grid grid-cols-4 gap-4">
                <div><Label>Bill Amount</Label><Input type="number" value={formData.billAmount} onChange={e => setFormData(p => ({ ...p, billAmount: parseFloat(e.target.value) || 0 }))} /></div>
                <div><Label>DCI Charges</Label><Input type="number" value={formData.dciCharges} onChange={e => setFormData(p => ({ ...p, dciCharges: parseFloat(e.target.value) || 0 }))} /></div>
                <div><Label>Final Amount</Label><div className="h-10 px-3 py-2 rounded-md border bg-muted text-sm flex items-center">{formatCurrency(formData.billAmount - formData.dciCharges)}</div></div>
                <div><Label>Share %</Label><Input type="number" value={formData.sharePercent} onChange={e => setFormData(p => ({ ...p, sharePercent: parseFloat(e.target.value) || 0 }))} /></div>
              </div>
              <div className="p-3 rounded-lg bg-success/10 border border-success/30">
                <Label className="text-success">Share Amount (Live)</Label>
                <p className="text-xl font-bold text-success">{formatCurrency(liveShareAmount)}</p>
              </div>
              <div><Label>Remarks</Label><Textarea value={formData.remarks} onChange={e => setFormData(p => ({ ...p, remarks: e.target.value }))} placeholder="Add any notes..." /></div>
              <div className="flex justify-end gap-2 pt-4"><Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button><Button onClick={handleSavePatient}>{editingPatient ? 'Update' : 'Save'}</Button></div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bill Preview Dialog */}
        <Dialog open={billPreviewOpen} onOpenChange={setBillPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Bill Preview - {billPreviewData?.name}</DialogTitle>
            </DialogHeader>
            {billPreviewData && (
              <div className="mt-4">
                {billPreviewData.url.startsWith('data:application/pdf') ? (
                  <iframe
                    src={billPreviewData.url}
                    className="w-full h-[70vh] border rounded-lg"
                    title="Bill Preview"
                  />
                ) : (
                  <img
                    src={billPreviewData.url}
                    alt="Bill Preview"
                    className="max-w-full h-auto rounded-lg"
                  />
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default PatientDetails;
