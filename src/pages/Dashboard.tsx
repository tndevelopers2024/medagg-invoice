import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { MultiSelect } from '@/components/ui/multi-select';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Percent,
  Settings2,
  Users,
  Stethoscope,
  Activity,
  PauseCircle,
} from 'lucide-react';
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

const Dashboard = () => {
  const [monthFilter, setMonthFilter] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState<string[]>(['2026']);
  const [appointmentMonthFilter, setAppointmentMonthFilter] = useState<string[]>([]);
  const [hospitalFilter, setHospitalFilter] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [areaFilter, setAreaFilter] = useState<string[]>([]);
  
  const navigate = useNavigate();

  const [hospitals, setHospitals] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [h, i, p] = await Promise.all([
          apiFetch<any[]>('/api/hospitals'),
          apiFetch<any[]>('/api/invoices'),
          apiFetch<any[]>('/api/patients'),
        ]);
        setHospitals(asArray(h));
        setInvoices(asArray(i));
        setPatients(asArray(p));
      } catch {
        // keep UI usable even if API temporarily fails
        setHospitals([]);
        setInvoices([]);
        setPatients([]);
      }
    };

    load();
  }, []);
  
  const safeHospitals = useMemo(() => asArray<any>(hospitals), [hospitals]);
  const safeInvoices = useMemo(() => asArray<any>(invoices), [invoices]);
  const safePatients = useMemo(() => asArray<any>(patients), [patients]);

  const cities = useMemo(() => [...new Set(safeHospitals.map(h => h.city).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [safeHospitals]);
  const areas = useMemo(() => [...new Set(safeHospitals.map(h => h.area).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [safeHospitals]);
  

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

  // Dashboard Summary - filtered by Invoice Month only (not appointment month)
  const dashboardStats = useMemo(() => {
    let filtered = safeInvoices;
    if (yearFilter.length > 0) {
      const selectedYears = yearFilter.map(y => parseInt(y));
      filtered = filtered.filter(inv => selectedYears.includes(inv.year));
      if (monthFilter.length > 0) {
        const selectedMonths = monthFilter.map(m => parseInt(m));
        filtered = filtered.filter(inv => selectedMonths.includes(inv.month));
      }
    }
    if (hospitalFilter.length > 0) {
      filtered = filtered.filter(inv => hospitalFilter.includes(inv.hospitalId));
    }
    if (cityFilter.length > 0) {
      filtered = filtered.filter(inv => inv.hospitalCity && cityFilter.includes(inv.hospitalCity));
    }
    if (areaFilter.length > 0) {
      filtered = filtered.filter(inv => inv.hospitalArea && areaFilter.includes(inv.hospitalArea));
    }

    const nonCancelled = filtered.filter(inv => inv.status !== 'Cancelled' && inv.status !== 'Hold');
    const cancelled = filtered.filter(inv => inv.status === 'Cancelled');
    const hold = filtered.filter(inv => inv.status === 'Hold');

    return {
      totalInvoiceAmount: nonCancelled.reduce((sum, inv) => sum + inv.totalAmount, 0),
      totalPaidAmount: nonCancelled.reduce((sum, inv) => sum + inv.paidAmount, 0),
      totalAdjustmentAmount: nonCancelled.reduce((sum, inv) => sum + inv.adjustedAmount, 0),
      totalTdsAmount: nonCancelled.reduce((sum, inv) => sum + inv.tdsAmount, 0),
      totalCancelledAmount: cancelled.reduce((sum, inv) => sum + inv.totalAmount, 0),
      totalUnpaidAmount: nonCancelled.reduce((sum, inv) => sum + inv.balanceAmount, 0),
      holdAmount: hold.reduce((sum, inv) => sum + inv.totalAmount, 0),
      totalInvoices: filtered.length,
      paidCount: nonCancelled.filter(inv => inv.status === 'Paid').length,
      adjustedCount: nonCancelled.filter(inv => inv.adjustedAmount > 0).length,
      tdsCount: nonCancelled.filter(inv => inv.tdsAmount > 0).length,
      unpaidCount: nonCancelled.filter(inv => inv.status === 'Unpaid').length,
      totalCancelled: cancelled.length,
      holdCount: hold.length,
    };
  }, [safeInvoices, yearFilter, monthFilter, hospitalFilter, cityFilter, areaFilter]);

  // Monthly Invoice Amount data for Line Chart (Invoice Month based)
  const monthlyInvoiceData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let filtered = safeInvoices.filter(inv => inv.status !== 'Cancelled' && inv.status !== 'Hold');
    
    if (yearFilter.length > 0) {
      const selectedYears = yearFilter.map(y => parseInt(y));
      filtered = filtered.filter(inv => selectedYears.includes(inv.year));
    }
    if (hospitalFilter.length > 0) {
      filtered = filtered.filter(inv => hospitalFilter.includes(inv.hospitalId));
    }
    if (cityFilter.length > 0) {
      filtered = filtered.filter(inv => inv.hospitalCity && cityFilter.includes(inv.hospitalCity));
    }
    if (areaFilter.length > 0) {
      filtered = filtered.filter(inv => inv.hospitalArea && areaFilter.includes(inv.hospitalArea));
    }

    const monthlyData = monthNames.map((name, idx) => {
      const monthInvoices = filtered.filter(inv => inv.month === idx + 1);
      return {
        month: name,
        totalAmount: monthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
      };
    });

    return monthlyData.filter(m => m.totalAmount > 0);
  }, [safeInvoices, yearFilter, hospitalFilter, cityFilter, areaFilter]);

  // Service Type Summary - filtered by Appointment Month (patient date)
  const serviceTypeStats = useMemo(() => {
    let filtered = safePatients;
    if (yearFilter.length > 0) {
      const selectedYears = yearFilter.map(y => parseInt(y));
      filtered = filtered.filter(p => selectedYears.includes(p.year));
      if (appointmentMonthFilter.length > 0) {
        const selectedMonths = appointmentMonthFilter.map(m => parseInt(m));
        filtered = filtered.filter(p => selectedMonths.includes(p.month));
      }
    }
    if (hospitalFilter.length > 0) {
      filtered = filtered.filter(p => hospitalFilter.includes(p.hospitalId));
    }
    if (cityFilter.length > 0) {
      filtered = filtered.filter(p => p.city && cityFilter.includes(p.city));
    }
    if (areaFilter.length > 0) {
      filtered = filtered.filter(p => p.area && areaFilter.includes(p.area));
    }

    const getStats = (serviceType: string) => {
      const servicePatients = filtered.filter(p => p.serviceType === serviceType);
      
      // No Share includes patients with invoiceStatus = 'No Share' OR sharePercent = 0
      const noSharePatients = servicePatients.filter(p => p.invoiceStatus === 'No Share' || p.sharePercent === 0);
      
      return {
        count: servicePatients.length,
        total: servicePatients.reduce((s, p) => s + p.shareAmount, 0),
        raised: {
          amount: servicePatients.filter(p => p.invoiceStatus === 'Invoice Raised').reduce((s, p) => s + p.shareAmount, 0),
          count: servicePatients.filter(p => p.invoiceStatus === 'Invoice Raised').length,
        },
        toBeRaised: {
          amount: servicePatients.filter(p => p.invoiceStatus === 'To Be Raised').reduce((s, p) => s + p.shareAmount, 0),
          count: servicePatients.filter(p => p.invoiceStatus === 'To Be Raised').length,
        },
        noShare: {
          // No Share amount = SUM of Final Amount (or Bill Amount if not available)
          amount: noSharePatients.reduce((s, p) => s + (p.finalAmount || p.billAmount || 0), 0),
          count: noSharePatients.length,
        },
      };
    };

    return {
      op: getStats('OP'),
      ip: getStats('IP'),
      diagnostic: getStats('Diagnostic'),
    };
  }, [safePatients, yearFilter, appointmentMonthFilter, hospitalFilter, cityFilter, areaFilter]);

  // Bar Chart Data - based on Appointment Month
  const barChartData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let filtered = safePatients;
    
    if (yearFilter.length > 0) {
      const selectedYears = yearFilter.map(y => parseInt(y));
      filtered = filtered.filter(p => selectedYears.includes(p.year));
      if (appointmentMonthFilter.length > 0) {
        const selectedMonths = appointmentMonthFilter.map(m => parseInt(m));
        filtered = filtered.filter(p => selectedMonths.includes(p.month));
      }
    }
    if (hospitalFilter.length > 0) {
      filtered = filtered.filter(p => hospitalFilter.includes(p.hospitalId));
    }
    if (cityFilter.length > 0) {
      filtered = filtered.filter(p => p.city && cityFilter.includes(p.city));
    }
    if (areaFilter.length > 0) {
      filtered = filtered.filter(p => p.area && areaFilter.includes(p.area));
    }

    const monthlyData = monthNames.map((name, idx) => {
      const monthPatients = filtered.filter(p => p.month === idx + 1);
      return {
        month: name,
        op: monthPatients.filter(p => p.serviceType === 'OP').reduce((s, p) => s + p.shareAmount, 0),
        ip: monthPatients.filter(p => p.serviceType === 'IP').reduce((s, p) => s + p.shareAmount, 0),
        diagnostic: monthPatients.filter(p => p.serviceType === 'Diagnostic').reduce((s, p) => s + p.shareAmount, 0),
        opCount: monthPatients.filter(p => p.serviceType === 'OP').length,
        ipCount: monthPatients.filter(p => p.serviceType === 'IP').length,
        diagnosticCount: monthPatients.filter(p => p.serviceType === 'Diagnostic').length,
      };
    });

    return monthlyData.filter(m => m.op > 0 || m.ip > 0 || m.diagnostic > 0);
  }, [safePatients, yearFilter, appointmentMonthFilter, hospitalFilter, cityFilter, areaFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getFilterLabel = () => {
    if (yearFilter.length === 0) return 'All Time';
    if (monthFilter.length === 0) return `Year ${yearFilter.join(', ')}`;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const selectedMonthNames = monthFilter.map(m => monthNames[parseInt(m) - 1]).join(', ');
    return `${selectedMonthNames} ${yearFilter.join(', ')}`;
  };

  // Multi-select options - sorted A-Z
  const hospitalOptions = useMemo(() => 
    safeHospitals.slice().sort((a, b) => a.name.localeCompare(b.name)).map(h => ({ value: h.id, label: h.name, sublabel: `${h.city}${h.area ? `, ${h.area}` : ''}` }))
  , [safeHospitals]);

  const cityOptions = useMemo(() => 
    cities.map(c => ({ value: c, label: c }))
  , [cities]);

  const areaOptions = useMemo(() => 
    areas.map(a => ({ value: a, label: a }))
  , [areas]);


  // Custom tooltip for line chart
  const CustomLineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          <p className="text-lg font-bold text-primary">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for bar chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <span style={{ color: entry.color }}>
                {entry.name === 'op' ? 'OP' : entry.name === 'ip' ? 'IP' : 'Diagnostic'}
              </span>
              <span className="font-bold">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 overflow-y-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <PageHeader
            title="Dashboard"
            description={`Overview for ${getFilterLabel()}`}
          />
        </div>

        {/* Date Filters - No Status Filter */}
        <div className="flex flex-wrap items-end gap-4 p-4 rounded-lg border mb-6 bg-card">
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
              options={monthOptions}
              value={appointmentMonthFilter}
              onValueChange={setAppointmentMonthFilter}
              placeholder="All Months"
              searchPlaceholder="Search month..."
              className="w-[150px]"
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
        </div>

        {/* Dashboard Summary */}
        <h2 className="text-lg font-semibold mb-4">Dashboard Summary</h2>
        
        {/* 7 Summary Cards in One Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <div className="p-3 rounded-lg border bg-card shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/invoices')}>
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">Total Invoice</p>
            </div>
            <p className="text-lg font-bold">{formatCurrency(dashboardStats.totalInvoiceAmount + dashboardStats.totalCancelledAmount)}</p>
            <p className="text-xs text-muted-foreground">{dashboardStats.totalInvoices} invoices</p>
          </div>
          <div className="p-3 rounded-lg border bg-success/5 border-success/30 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/invoices?status=Paid')}>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <p className="text-xs text-muted-foreground">Paid</p>
            </div>
            <p className="text-lg font-bold text-success">{formatCurrency(dashboardStats.totalPaidAmount)}</p>
            <p className="text-xs text-muted-foreground">{dashboardStats.paidCount} paid</p>
          </div>
          <div className="p-3 rounded-lg border bg-sky-500/5 border-sky-500/30 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-1">
              <Settings2 className="w-4 h-4 text-sky-500" />
              <p className="text-xs text-muted-foreground">Adjusted</p>
            </div>
            <p className="text-lg font-bold text-sky-500">{formatCurrency(dashboardStats.totalAdjustmentAmount)}</p>
            <p className="text-xs text-muted-foreground">{dashboardStats.adjustedCount} adjusted</p>
          </div>
          <div className="p-3 rounded-lg border bg-card shadow-sm cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">TDS</p>
            </div>
            <p className="text-lg font-bold">{formatCurrency(dashboardStats.totalTdsAmount)}</p>
            <p className="text-xs text-muted-foreground">{dashboardStats.tdsCount} with TDS</p>
          </div>
          <div className="p-3 rounded-lg border bg-destructive/5 border-destructive/30 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/invoices?status=Cancelled')}>
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-destructive" />
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </div>
            <p className="text-lg font-bold text-destructive">{formatCurrency(dashboardStats.totalCancelledAmount)}</p>
            <p className="text-xs text-muted-foreground">{dashboardStats.totalCancelled} cancelled</p>
          </div>
          <div className="p-3 rounded-lg border bg-warning/5 border-warning/30 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/invoices?status=Unpaid')}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-warning" />
              <p className="text-xs text-muted-foreground">Unpaid</p>
            </div>
            <p className="text-lg font-bold text-warning">{formatCurrency(dashboardStats.totalUnpaidAmount)}</p>
            <p className="text-xs text-muted-foreground">{dashboardStats.unpaidCount} unpaid</p>
          </div>
          <div className="p-3 rounded-lg border bg-purple-500/5 border-purple-500/30 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/invoices?status=Hold')}>
            <div className="flex items-center gap-2 mb-1">
              <PauseCircle className="w-4 h-4 text-purple-500" />
              <p className="text-xs text-muted-foreground">Hold</p>
            </div>
            <p className="text-lg font-bold text-purple-500">{formatCurrency(dashboardStats.holdAmount)}</p>
            <p className="text-xs text-muted-foreground">{dashboardStats.holdCount} hold</p>
          </div>
        </div>

        {/* Monthly Invoice Analysis Line Chart */}
        <div className="bg-card rounded-lg border p-6 shadow-sm mb-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Invoice Amount Analysis</h3>
          {monthlyInvoiceData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyInvoiceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} className="text-xs" />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="totalAmount" 
                    stroke="hsl(217, 91%, 60%)" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(217, 91%, 60%)', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">No invoice data available</div>
          )}
        </div>

        {/* Service Type Summary Heading */}
        <h2 className="text-lg font-semibold mb-4">Service Type Summary (Appointment Based)</h2>

        {/* Service Type Summary Cards with Status Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">OP Details</p>
                <p className="text-2xl font-bold">{formatCurrency(serviceTypeStats.op.total)}</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground mb-2">{serviceTypeStats.op.count} patients</div>
            <div className="border-t pt-2 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Raised:</span><span className="font-medium text-success">{formatCurrency(serviceTypeStats.op.raised.amount)} ({serviceTypeStats.op.raised.count})</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">To Be Raised:</span><span className="font-medium text-warning">{formatCurrency(serviceTypeStats.op.toBeRaised.amount)} ({serviceTypeStats.op.toBeRaised.count})</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">No Share:</span><span className="font-medium">{formatCurrency(serviceTypeStats.op.noShare.amount)} ({serviceTypeStats.op.noShare.count})</span></div>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-sm font-medium">IP Details</p>
                <p className="text-2xl font-bold">{formatCurrency(serviceTypeStats.ip.total)}</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground mb-2">{serviceTypeStats.ip.count} patients</div>
            <div className="border-t pt-2 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Raised:</span><span className="font-medium text-success">{formatCurrency(serviceTypeStats.ip.raised.amount)} ({serviceTypeStats.ip.raised.count})</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">To Be Raised:</span><span className="font-medium text-warning">{formatCurrency(serviceTypeStats.ip.toBeRaised.amount)} ({serviceTypeStats.ip.toBeRaised.count})</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">No Share:</span><span className="font-medium">{formatCurrency(serviceTypeStats.ip.noShare.amount)} ({serviceTypeStats.ip.noShare.count})</span></div>
            </div>
          </div>
          <div className="p-4 rounded-lg border bg-card shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-sm font-medium">Diagnostic Details</p>
                <p className="text-2xl font-bold">{formatCurrency(serviceTypeStats.diagnostic.total)}</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground mb-2">{serviceTypeStats.diagnostic.count} patients</div>
            <div className="border-t pt-2 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Raised:</span><span className="font-medium text-success">{formatCurrency(serviceTypeStats.diagnostic.raised.amount)} ({serviceTypeStats.diagnostic.raised.count})</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">To Be Raised:</span><span className="font-medium text-warning">{formatCurrency(serviceTypeStats.diagnostic.toBeRaised.amount)} ({serviceTypeStats.diagnostic.toBeRaised.count})</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">No Share:</span><span className="font-medium">{formatCurrency(serviceTypeStats.diagnostic.noShare.amount)} ({serviceTypeStats.diagnostic.noShare.count})</span></div>
            </div>
          </div>
        </div>

        {/* Month-wise Invoice Chart - Bar Chart Only */}
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Month-wise Share Amount by Service Type (Appointment Based)</h3>
          
          {barChartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} className="text-xs" />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend formatter={(value) => value === 'op' ? 'OP' : value === 'ip' ? 'IP' : 'Diagnostic'} />
                  <Bar dataKey="op" fill="hsl(217, 91%, 60%)" name="op" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="ip" fill="hsl(142, 71%, 45%)" name="ip" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="diagnostic" fill="hsl(38, 92%, 50%)" name="diagnostic" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              No service data available for the selected filters
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
