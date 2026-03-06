import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { MultiSelect } from '@/components/ui/multi-select';
import { Label } from '@/components/ui/label';
import { exportToExcel, downloadTemplate } from '@/data/mockData';
import { apiFetch } from '@/lib/apiClient';
import { Plus, Search, Pencil, Download, Upload, FileSpreadsheet, FileText, Building2, XCircle, AlertTriangle, CheckCircle2, Eye, Trash2, Building, FileCheck, FileX, FilterX } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { differenceInYears, parseISO, format } from 'date-fns';
import { Hospital } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';

const asArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const v = value as any;
    if (Array.isArray(v.items)) return v.items as T[];
    if (Array.isArray(v.data)) return v.data as T[];
    if (Array.isArray(v.results)) return v.results as T[];
    if (Array.isArray(v.hospitals)) return v.hospitals as T[];
  }
  return [];
};

const HospitalList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit } = usePermissions();
  const hasEditAccess = canEdit('hospitals');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [hospitalFilter, setHospitalFilter] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [areaFilter, setAreaFilter] = useState<string[]>([]);
  const [mouAttachedFilter, setMouAttachedFilter] = useState<string>('all');
  const [mouSignedFilter, setMouSignedFilter] = useState<string>('all');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<string | null>(null);
  const [previewHospitalName, setPreviewHospitalName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [hospitalToDelete, setHospitalToDelete] = useState<Hospital | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 100;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const safeHospitals = useMemo(() => asArray<Hospital>(hospitals), [hospitals]);

  // City and Area options for filters
  const cities = useMemo(() => [...new Set(safeHospitals.map(h => h.city).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [safeHospitals]);
  const areas = useMemo(() => [...new Set(safeHospitals.map(h => h.area).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [safeHospitals]);

  // MOU status stored in localStorage (mouAttached can be auto or manual, mouSigned is always manual)
  const [mouStatuses, setMouStatuses] = useState<Record<string, { mouAttached?: boolean; mouSigned?: boolean }>>(() => {
    const stored = localStorage.getItem('mouStatuses');
    return stored ? JSON.parse(stored) : {};
  });

  // Get MOU Attached status (auto from file, can be manually overridden)
  const getMouAttached = (hospital: Hospital): boolean => {
    if (mouStatuses[hospital.id]?.mouAttached !== undefined) {
      return mouStatuses[hospital.id].mouAttached!;
    }
    return !!hospital.mouFileUrl;
  };

  // Get MOU Signed status (only from manual setting)
  const getMouSigned = (hospital: Hospital): boolean => {
    return mouStatuses[hospital.id]?.mouSigned ?? false;
  };

  // Update MOU status
  const updateMouStatus = (hospitalId: string, field: 'mouAttached' | 'mouSigned', value: boolean) => {
    const updated = { ...mouStatuses, [hospitalId]: { ...mouStatuses[hospitalId], [field]: value } };
    setMouStatuses(updated);
    localStorage.setItem('mouStatuses', JSON.stringify(updated));
  };

  const fetchHospitals = async () => {
    try {
      const data = await apiFetch('/api/hospitals');
      setHospitals(asArray<Hospital>(data));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      toast({ title: 'Failed to load hospitals', variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      fetchHospitals();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Get MOU end date - just return mouEndDate if it exists
  const getCalculatedEndDate = (hospital: Hospital): string | undefined => {
    return hospital.mouEndDate || undefined;
  };

  // Get agreement duration - only if both dates exist
  const getAgreementDuration = (startDate?: string, endDate?: string): string => {
    if (!startDate || !endDate) return '-';
    try {
      const years = differenceInYears(parseISO(endDate), parseISO(startDate));
      return `${years} year${years !== 1 ? 's' : ''}`;
    } catch {
      return '-';
    }
  };

  const allFilteredHospitals = useMemo(() => {
    return safeHospitals.filter((h) => {
      // Match against name, alternate name, city, area
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        h.name.toLowerCase().includes(searchLower) ||
        (h.alternateName && h.alternateName.toLowerCase().includes(searchLower)) ||
        h.city.toLowerCase().includes(searchLower) ||
        (h.area || '').toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(h.status);
      const matchesHospital = hospitalFilter.length === 0 || hospitalFilter.includes(h.id);
      const matchesCity = cityFilter.length === 0 || cityFilter.includes(h.city);
      const matchesArea = areaFilter.length === 0 || (h.area && areaFilter.includes(h.area));
      
      // MOU filters
      const attached = getMouAttached(h);
      const signed = getMouSigned(h);
      const matchesMouAttached = mouAttachedFilter === 'all' || 
        (mouAttachedFilter === 'yes' && attached) || 
        (mouAttachedFilter === 'no' && !attached);
      const matchesMouSigned = mouSignedFilter === 'all' || 
        (mouSignedFilter === 'yes' && attached && signed) || 
        (mouSignedFilter === 'no' && attached && !signed);
      
      return matchesSearch && matchesStatus && matchesHospital && matchesCity && matchesArea && matchesMouAttached && matchesMouSigned;
    }).sort((a, b) => a.name.localeCompare(b.name)); // Default sort A-Z by name
  }, [safeHospitals, searchQuery, statusFilter, hospitalFilter, cityFilter, areaFilter, mouAttachedFilter, mouSignedFilter, mouStatuses]);

  // Status-only filtered hospitals (for MOU counts - excludes MOU filters)
  const statusFilteredHospitals = useMemo(() => {
    return safeHospitals.filter((h) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        h.name.toLowerCase().includes(searchLower) ||
        (h.alternateName && h.alternateName.toLowerCase().includes(searchLower)) ||
        h.city.toLowerCase().includes(searchLower) ||
        (h.area || '').toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(h.status);
      const matchesHospital = hospitalFilter.length === 0 || hospitalFilter.includes(h.id);
      const matchesCity = cityFilter.length === 0 || cityFilter.includes(h.city);
      const matchesArea = areaFilter.length === 0 || (h.area && areaFilter.includes(h.area));
      return matchesSearch && matchesStatus && matchesHospital && matchesCity && matchesArea;
    });
  }, [safeHospitals, searchQuery, statusFilter, hospitalFilter, cityFilter, areaFilter]);

  // MOU Summary counts - based on status-filtered hospitals (so clicking Active/Inactive updates MOU counts)
  const mouCounts = useMemo(() => {
    const attachedYes = statusFilteredHospitals.filter(h => getMouAttached(h)).length;
    const attachedNo = statusFilteredHospitals.filter(h => !getMouAttached(h)).length;
    const attachedHospitals = statusFilteredHospitals.filter(h => getMouAttached(h));
    const signedYes = attachedHospitals.filter(h => getMouSigned(h)).length;
    const signedNo = attachedHospitals.filter(h => !getMouSigned(h)).length;
    return { total: statusFilteredHospitals.length, attachedYes, attachedNo, signedYes, signedNo };
  }, [statusFilteredHospitals, mouStatuses]);

  // Original totals - always from ALL hospitals (not filtered) for Live Summary cards
  const originalTotals = useMemo(() => ({
    total: safeHospitals.length,
    active: safeHospitals.filter(h => h.status === 'Active').length,
    inactive: safeHospitals.filter(h => h.status === 'Inactive').length,
    expiredSoon: safeHospitals.filter(h => h.status === 'Expired Soon').length,
    expired: safeHospitals.filter(h => h.status === 'Expired').length,
  }), [safeHospitals]);

  // Current active status filter for highlighting
  const isStatusFilterActive = statusFilter.length > 0;

  // Check if any MOU filter is active
  const hasMouFilter = mouAttachedFilter !== 'all' || mouSignedFilter !== 'all';

  // Status options for multi-select
  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Expired Soon', label: 'Expired Soon' },
    { value: 'Expired', label: 'Expired' },
  ];

  // Clear all MOU filters
  const clearMouFilters = () => {
    setMouAttachedFilter('all');
    setMouSignedFilter('all');
  };

  // Paginated hospitals
  const totalPages = Math.ceil(allFilteredHospitals.length / pageSize);
  const paginatedHospitals = allFilteredHospitals.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Hospital options for multi-select dropdown - sorted A-Z (no "All" option for multi-select)
  const hospitalOptions = useMemo(() => 
    safeHospitals.slice().sort((a, b) => a.name.localeCompare(b.name)).map(h => ({ 
      value: h.id, 
      label: h.name, 
      sublabel: h.alternateName ? `(${h.alternateName})` : undefined 
    }))
  , [safeHospitals]);

  const cityOptions = useMemo(() => 
    cities.map(c => ({ value: c, label: c }))
  , [cities]);

  const areaOptions = useMemo(() => 
    areas.map(a => ({ value: a, label: a }))
  , [areas]);

  const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return '-';
    try {
      const parsed = parseISO(dateStr);
      if (isNaN(parsed.getTime())) return '-';
      return format(parsed, 'dd/MM/yyyy');
    } catch {
      return '-';
    }
  };

  const handleMouPreview = (hospital: Hospital) => {
    if (!hospital.mouFileUrl) return;
    
    // Check localStorage for stored file
    const storedFiles = localStorage.getItem('mouFiles');
    if (storedFiles) {
      const files = JSON.parse(storedFiles);
      if (files[hospital.id]) {
        setPreviewData(files[hospital.id]);
        setPreviewHospitalName(hospital.name);
        setPreviewOpen(true);
        return;
      }
    }
    toast({ title: 'No preview available', description: 'MOU file not found.' });
  };

  const handleMouDownload = (hospital: Hospital) => {
    if (!hospital.mouFileUrl) return;
    
    const storedFiles = localStorage.getItem('mouFiles');
    if (storedFiles) {
      const files = JSON.parse(storedFiles);
      if (files[hospital.id]) {
        const link = document.createElement('a');
        link.href = files[hospital.id];
        link.download = `mou-${hospital.name.replace(/\s+/g, '-').toLowerCase()}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }
    }
    toast({ title: 'Download failed', description: 'MOU file not found.' });
  };

  // Export ALL filtered records (not just current page)
  const handleExport = () => {
    const exportData = allFilteredHospitals.map(h => ({
      Name: h.name,
      'Alternate Name': h.alternateName || '',
      Address: h.address,
      Area: h.area || '',
      City: h.city,
      State: h.state,
      'PIN Code': h.pinCode,
      'OP Share %': h.opShare,
      'IP Share %': h.ipShare,
      'Diagnostic Share %': h.diagnosticShare,
      'Contact Person': h.contactPerson,
      Phone: h.phone,
      Email: h.email,
      'MOU Start Date': h.mouStartDate,
      'MOU End Date': getCalculatedEndDate(h),
      Status: h.status,
    }));
    exportToExcel(exportData, 'hospitals');
    toast({ title: 'Export complete', description: 'Hospital data exported successfully.' });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      
      // Parse header row and create mapping
      const headerRow = lines[0];
      const headers = headerRow.split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      
      // Expected headers mapping (case-insensitive)
      const expectedHeaders = {
        'name': 'name',
        'alternate name': 'alternateName',
        'address': 'address',
        'area': 'area',
        'city': 'city',
        'state': 'state',
        'pin code': 'pinCode',
        'op share %': 'opShare',
        'ip share %': 'ipShare',
        'diagnostic share %': 'diagnosticShare',
        'contact person': 'contactPerson',
        'phone': 'phone',
        'email': 'email',
        'mou start date': 'mouStartDate',
        'mou end date': 'mouEndDate',
      };
      
      // Create column index mapping
      const columnMap: Record<string, number> = {};
      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().trim();
        if (expectedHeaders[normalizedHeader]) {
          columnMap[expectedHeaders[normalizedHeader]] = index;
        }
      });
      
      // Validate required header exists
      if (columnMap['name'] === undefined) {
        toast({ title: 'Invalid template', description: 'Please download and use the latest template. Missing "Name" column.', variant: 'destructive' });
        return;
      }
      
      // Parse Excel date (serial number or string)
      const parseExcelDate = (value: string): string => {
        if (!value || value.trim() === '') return '';
        const trimmed = value.trim();
        
        // Check if it's an Excel serial number
        if (!isNaN(Number(trimmed)) && Number(trimmed) > 25569) {
          const serial = Number(trimmed);
          const date = new Date((serial - 25569) * 86400 * 1000);
          return format(date, 'yyyy-MM-dd');
        }
        
        // Try DD-MM-YYYY or DD/MM/YYYY
        const ddmmyyyy = trimmed.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
        if (ddmmyyyy) {
          const [, day, month, year] = ddmmyyyy;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        // Try YYYY-MM-DD
        const yyyymmdd = trimmed.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
        if (yyyymmdd) {
          const [, year, month, day] = yyyymmdd;
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
        
        return '';
      };
      
      // Get existing hospitals
      const existingHospitals = hospitals;
      const existingNames = new Set(existingHospitals.map(h => h.name.toLowerCase()));
      
      const newHospitals: Hospital[] = [];
      let skippedCount = 0;
      
      lines.slice(1).filter(line => line.trim()).forEach((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        
        const getValue = (field: string): string => {
          const idx = columnMap[field];
          return idx !== undefined ? (values[idx] || '') : '';
        };
        
        const name = getValue('name');
        if (!name) return;
        
        // Skip if hospital with same name already exists
        if (existingNames.has(name.toLowerCase())) {
          skippedCount++;
          return;
        }
        
        const newHospital: Hospital = {
          id: String(Date.now() + index),
          name,
          alternateName: getValue('alternateName'),
          address: getValue('address'),
          area: getValue('area'),
          city: getValue('city'),
          state: getValue('state'),
          pinCode: getValue('pinCode'),
          opShare: parseFloat(getValue('opShare').replace('%', '')) || 0,
          ipShare: parseFloat(getValue('ipShare').replace('%', '')) || 0,
          diagnosticShare: parseFloat(getValue('diagnosticShare').replace('%', '')) || 0,
          contactPerson: getValue('contactPerson'),
          phone: getValue('phone'),
          email: getValue('email'),
          mouStartDate: parseExcelDate(getValue('mouStartDate')),
          mouEndDate: parseExcelDate(getValue('mouEndDate')),
          status: 'Active',
        };
        newHospitals.push(newHospital);
      });

      try {
        await Promise.all(
          newHospitals.map((hospital) => {
            const payload = { ...hospital } as Partial<Hospital>;
            delete payload.id;
            return apiFetch('/api/hospitals', { method: 'POST', body: JSON.stringify(payload) });
          }),
        );

        await fetchHospitals();
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        toast({ title: 'Import failed', description: 'Could not import hospitals.', variant: 'destructive' });
        return;
      }
      
      let message = `${newHospitals.length} new hospitals imported.`;
      if (skippedCount > 0) {
        message += ` ${skippedCount} duplicates skipped.`;
      }
      toast({ title: 'Import complete', description: message });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteClick = (hospital: Hospital) => {
    setHospitalToDelete(hospital);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!hospitalToDelete) return;

    apiFetch(`/api/hospitals/${hospitalToDelete.id}`, { method: 'DELETE' })
      .then(() => {
        const updatedHospitals = safeHospitals.filter(h => h.id !== hospitalToDelete.id);
        setHospitals(updatedHospitals);
        toast({ title: 'Hospital deleted', description: `${hospitalToDelete.name} has been removed.` });
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(error);
        toast({ title: 'Failed to delete hospital', variant: 'destructive' });
      });
    
    // Remove associated MOU file
    const storedFiles = localStorage.getItem('mouFiles');
    if (storedFiles) {
      const files = JSON.parse(storedFiles);
      delete files[hospitalToDelete.id];
      localStorage.setItem('mouFiles', JSON.stringify(files));
    }
    setDeleteDialogOpen(false);
    setHospitalToDelete(null);
  };

  const isPdf = previewData?.startsWith('data:application/pdf');

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 overflow-y-auto">
        <PageHeader
          title="Hospital Master"
          description="Manage hospital partnerships and agreements"
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => downloadTemplate('hospital')}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Template
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImport}
                className="hidden"
              />
              {hasEditAccess && (
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              )}
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              {hasEditAccess && (
                <Button onClick={() => navigate('/hospitals/add')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Hospital
                </Button>
              )}
            </div>
          }
        />

        {/* Live Summary Heading */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Live Summary</h3>
          {hasMouFilter && (
            <Button variant="outline" size="sm" onClick={clearMouFilters}>
              <FilterX className="w-4 h-4 mr-2" />
              Clear MOU Filters
            </Button>
          )}
        </div>

        {/* Alert Cards - Show original totals, highlight active filter */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div 
            onClick={() => { setStatusFilter([]); setMouAttachedFilter('all'); setMouSignedFilter('all'); }}
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
              statusFilter.length === 0 && !hasMouFilter 
                ? 'bg-primary/15 border-primary ring-2 ring-primary/30' 
                : 'bg-primary/5 border-primary/30 hover:bg-primary/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <Building className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{originalTotals.total}</p>
                <p className="text-xs text-muted-foreground">Total Hospitals</p>
              </div>
            </div>
          </div>
          <div 
            onClick={() => { setStatusFilter(['Active']); setMouAttachedFilter('all'); setMouSignedFilter('all'); }}
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
              statusFilter.length === 1 && statusFilter[0] === 'Active' 
                ? 'bg-success/15 border-success ring-2 ring-success/30' 
                : 'bg-success/5 border-success/30 hover:bg-success/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-success" />
              <div>
                <p className="text-2xl font-bold">{originalTotals.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </div>
          <div 
            onClick={() => { setStatusFilter(['Inactive']); setMouAttachedFilter('all'); setMouSignedFilter('all'); }}
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
              statusFilter.length === 1 && statusFilter[0] === 'Inactive' 
                ? 'bg-muted ring-2 ring-border' 
                : 'bg-muted/50 hover:bg-muted'
            }`}
          >
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{originalTotals.inactive}</p>
                <p className="text-xs text-muted-foreground">Inactive</p>
              </div>
            </div>
          </div>
          <div 
            onClick={() => { setStatusFilter(['Expired Soon']); setMouAttachedFilter('all'); setMouSignedFilter('all'); }}
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
              statusFilter.length === 1 && statusFilter[0] === 'Expired Soon' 
                ? 'bg-warning/15 border-warning ring-2 ring-warning/30' 
                : 'bg-warning/5 border-warning/30 hover:bg-warning/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <div>
                <p className="text-2xl font-bold">{originalTotals.expiredSoon}</p>
                <p className="text-xs text-muted-foreground">Expired Soon</p>
              </div>
            </div>
          </div>
          <div 
            onClick={() => { setStatusFilter(['Expired']); setMouAttachedFilter('all'); setMouSignedFilter('all'); }}
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
              statusFilter.length === 1 && statusFilter[0] === 'Expired' 
                ? 'bg-destructive/15 border-destructive ring-2 ring-destructive/30' 
                : 'bg-destructive/5 border-destructive/30 hover:bg-destructive/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{originalTotals.expired}</p>
                <p className="text-xs text-muted-foreground">Expired</p>
              </div>
            </div>
          </div>
          
          {/* MOU Summary Card - Improved layout */}
          <div 
            onClick={() => { setMouAttachedFilter('all'); setMouSignedFilter('all'); }}
            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
              hasMouFilter 
                ? 'bg-accent/15 border-accent ring-2 ring-accent/30' 
                : 'bg-accent/5 border-accent/30 hover:bg-accent/10'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <FileCheck className="w-4 h-4 text-accent" />
              <p className="text-sm font-semibold">Total MOU Count</p>
              <span className="text-xs font-bold text-foreground ml-auto">({mouCounts.total})</span>
            </div>
            
            {/* Attached Section */}
            <div className="space-y-2 text-xs">
              <div>
                <p className="text-muted-foreground font-medium mb-1">MOU Attached:</p>
                <div className="flex gap-3 ml-2">
                  <span 
                    onClick={(e) => { e.stopPropagation(); setMouAttachedFilter('yes'); setMouSignedFilter('all'); }}
                    className={`cursor-pointer hover:underline ${mouAttachedFilter === 'yes' && mouSignedFilter === 'all' ? 'font-bold text-success' : 'text-success font-medium'}`}
                  >
                    Yes ({mouCounts.attachedYes})
                  </span>
                  <span 
                    onClick={(e) => { e.stopPropagation(); setMouAttachedFilter('no'); setMouSignedFilter('all'); }}
                    className={`cursor-pointer hover:underline ${mouAttachedFilter === 'no' ? 'font-bold text-destructive' : 'text-destructive font-medium'}`}
                  >
                    No ({mouCounts.attachedNo})
                  </span>
                </div>
              </div>
              
              {/* Divider */}
              <div className="border-t border-border/50 my-1" />
              
              {/* Signed Section - only from Attached=Yes */}
              <div>
                <p className="text-muted-foreground font-medium mb-1">MOU Signed <span className="text-[10px]">(from Attached)</span>:</p>
                <div className="flex gap-3 ml-2">
                  <span 
                    onClick={(e) => { e.stopPropagation(); setMouAttachedFilter('yes'); setMouSignedFilter('yes'); }}
                    className={`cursor-pointer hover:underline ${mouAttachedFilter === 'yes' && mouSignedFilter === 'yes' ? 'font-bold text-success' : 'text-success font-medium'}`}
                  >
                    Yes ({mouCounts.signedYes})
                  </span>
                  <span 
                    onClick={(e) => { e.stopPropagation(); setMouAttachedFilter('yes'); setMouSignedFilter('no'); }}
                    className={`cursor-pointer hover:underline ${mouAttachedFilter === 'yes' && mouSignedFilter === 'no' ? 'font-bold text-destructive' : 'text-destructive font-medium'}`}
                  >
                    No ({mouCounts.signedNo})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border shadow-sm">
          <div className="p-4 border-b flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search hospitals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
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
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="table-finance">
              <thead className="sticky top-0 bg-card z-10">
                <tr>
                  <th>Hospital Name</th>
                  <th>Alternate Name</th>
                  <th>City</th>
                  <th>Area</th>
                  <th>Contact Person</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>MOU Start</th>
                  <th>MOU End</th>
                  <th>Duration</th>
                  <th>MOU File</th>
                  <th>MOU Attached</th>
                  <th>MOU Signed</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedHospitals.map((hospital) => {
                  const calculatedEndDate = getCalculatedEndDate(hospital);
                  return (
                    <tr key={hospital.id}>
                      <td className="font-medium">{hospital.name}</td>
                      <td className="text-muted-foreground">{hospital.alternateName || '-'}</td>
                      <td>{hospital.city}</td>
                      <td>{hospital.area || '-'}</td>
                      <td>{hospital.contactPerson || '-'}</td>
                      <td>{hospital.phone || '-'}</td>
                      <td className="min-w-[200px]" title={hospital.email || ''}>{hospital.email || '-'}</td>
                      <td>{formatDate(hospital.mouStartDate)}</td>
                      <td>{formatDate(calculatedEndDate)}</td>
                      <td>{getAgreementDuration(hospital.mouStartDate, calculatedEndDate)}</td>
                      <td>
                        {hospital.mouFileUrl ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMouPreview(hospital)}
                              className="h-7 w-7 p-0"
                            >
                              <Eye className="w-4 h-4 text-accent" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMouDownload(hospital)}
                              className="h-7 w-7 p-0"
                            >
                              <Download className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                      <td>
                        <Select
                          value={getMouAttached(hospital) ? 'yes' : 'no'}
                          onValueChange={(val) => updateMouStatus(hospital.id, 'mouAttached', val === 'yes')}
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
                        {getMouAttached(hospital) ? (
                          <Select
                            value={getMouSigned(hospital) ? 'yes' : 'no'}
                            onValueChange={(val) => updateMouStatus(hospital.id, 'mouSigned', val === 'yes')}
                          >
                            <SelectTrigger className="h-7 w-16 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="yes">Yes</SelectItem>
                              <SelectItem value="no">No</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={hospital.status} />
                      </td>
                      <td>
                        {hasEditAccess ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/hospitals/${hospital.id}/edit`)}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(hospital)}
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
          {allFilteredHospitals.length === 0 && <div className="p-8 text-center text-muted-foreground">No hospitals found.</div>}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, allFilteredHospitals.length)} of {allFilteredHospitals.length} records
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
      </div>

      {/* MOU Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>MOU Preview - {previewHospitalName}</DialogTitle>
          </DialogHeader>
          {previewData && (
            <div className="mt-4">
              {isPdf ? (
                <iframe
                  src={previewData}
                  className="w-full h-[70vh] border rounded-lg"
                  title="MOU Preview"
                />
              ) : (
                <img
                  src={previewData}
                  alt="MOU Preview"
                  className="max-w-full h-auto rounded-lg"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Hospital</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{hospitalToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default HospitalList;
