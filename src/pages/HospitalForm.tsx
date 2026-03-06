import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { calculateHospitalStatus } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { differenceInYears, parseISO, differenceInDays } from 'date-fns';
import { ArrowLeft, Upload, Eye, Download, X, FileText } from 'lucide-react';
import { Hospital } from '@/types';
import { usePermissions } from '@/hooks/usePermissions';
import { apiFetch } from '@/lib/apiClient';

const HospitalForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit, isLoading: permissionsLoading } = usePermissions();
  const isEditing = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [existingHospital, setExistingHospital] = useState<Hospital | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    alternateName: '',
    address: '',
    area: '',
    city: '',
    state: '',
    pinCode: '',
    opShare: 0,
    ipShare: 0,
    diagnosticShare: 0,
    contactPerson: '',
    phone: '',
    email: '',
    mouStartDate: '',
    mouEndDate: '',
    mouFileUrl: '',
    manualInactive: false,
  });

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [storedFileData, setStoredFileData] = useState<string | null>(null);

  // Check permissions and redirect if no edit access
  useEffect(() => {
    if (!permissionsLoading && !canEdit('hospitals')) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to add or edit hospitals.',
        variant: 'destructive',
      });
      navigate('/hospitals');
    }
  }, [permissionsLoading, canEdit, navigate, toast]);

  // Load hospital from API when editing
  useEffect(() => {
    const load = async () => {
      if (!isEditing || !id) return;
      try {
        const hospital = await apiFetch<Hospital>(`/api/hospitals/${id}`);
        setExistingHospital(hospital);
        setFormData({
          name: hospital?.name || '',
          alternateName: hospital?.alternateName || '',
          address: hospital?.address || '',
          area: hospital?.area || '',
          city: hospital?.city || '',
          state: hospital?.state || '',
          pinCode: hospital?.pinCode || '',
          opShare: hospital?.opShare || 0,
          ipShare: hospital?.ipShare || 0,
          diagnosticShare: hospital?.diagnosticShare || 0,
          contactPerson: hospital?.contactPerson || '',
          phone: hospital?.phone || '',
          email: hospital?.email || '',
          mouStartDate: hospital?.mouStartDate || '',
          mouEndDate: hospital?.mouEndDate || '',
          mouFileUrl: hospital?.mouFileUrl || '',
          manualInactive: hospital?.manualInactive || false,
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        toast({ title: 'Failed to load hospital', variant: 'destructive' });
        navigate('/hospitals');
      }
    };

    load();
  }, [id, isEditing, navigate, toast]);

  // Load stored file data for existing hospitals
  useEffect(() => {
    if (existingHospital?.mouFileUrl) {
      // Check if it's a base64 stored file
      const storedFiles = localStorage.getItem('mouFiles');
      if (storedFiles) {
        const files = JSON.parse(storedFiles);
        if (files[existingHospital.id]) {
          setStoredFileData(files[existingHospital.id]);
        }
      }
    }
  }, [existingHospital]);

  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calculateDuration = () => {
    if (formData.mouStartDate && formData.mouEndDate) {
      const years = differenceInYears(parseISO(formData.mouEndDate), parseISO(formData.mouStartDate));
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
    return '-';
  };

  const getAutoStatus = (): Hospital['status'] => {
    if (formData.manualInactive) return 'Inactive';
    if (!formData.mouStartDate || !formData.mouEndDate) return 'Active';
    
    const today = new Date();
    const endDate = parseISO(formData.mouEndDate);
    const startDate = parseISO(formData.mouStartDate);
    
    if (today < startDate) return 'Active';
    
    const daysUntilExpiry = differenceInDays(endDate, today);
    
    if (daysUntilExpiry < 0) return 'Expired';
    if (daysUntilExpiry <= 30) return 'Expired Soon';
    return 'Active';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a PDF, PNG, or JPG file.',
          variant: 'destructive',
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please upload a file smaller than 10MB.',
          variant: 'destructive',
        });
        return;
      }
      
      // Convert to base64 for persistent storage
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setStoredFileData(base64);
        setUploadedFile(file);
        handleChange('mouFileUrl', `stored:${file.name}`);
        toast({
          title: 'File uploaded',
          description: `${file.name} has been uploaded successfully.`,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setStoredFileData(null);
    handleChange('mouFileUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadFile = () => {
    if (storedFileData) {
      const link = document.createElement('a');
      link.href = storedFileData;
      link.download = uploadedFile?.name || 'mou-document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hospitalId = isEditing ? id! : undefined;

    const hospitalData: Hospital = {
      id: hospitalId || '',
      name: formData.name,
      alternateName: formData.alternateName,
      address: formData.address,
      area: formData.area,
      city: formData.city,
      state: formData.state,
      pinCode: formData.pinCode,
      opShare: formData.opShare,
      ipShare: formData.ipShare,
      diagnosticShare: formData.diagnosticShare,
      contactPerson: formData.contactPerson,
      phone: formData.phone,
      email: formData.email,
      mouStartDate: formData.mouStartDate,
      mouEndDate: formData.mouEndDate,
      mouFileUrl: formData.mouFileUrl,
      manualInactive: formData.manualInactive,
      status: getAutoStatus(),
    };

    try {
      let saved: Hospital;
      if (isEditing && id) {
        saved = await apiFetch<Hospital>(`/api/hospitals/${id}`, { method: 'PUT', body: JSON.stringify(hospitalData) });
      } else {
        const payload = { ...hospitalData } as Partial<Hospital>;
        delete payload.id;
        saved = await apiFetch<Hospital>('/api/hospitals', { method: 'POST', body: JSON.stringify(payload) });
      }

      // Store file data in localStorage (keyed by the saved hospital id)
      if (storedFileData && saved?.id) {
        const storedFiles = JSON.parse(localStorage.getItem('mouFiles') || '{}');
        storedFiles[saved.id] = storedFileData;
        localStorage.setItem('mouFiles', JSON.stringify(storedFiles));
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      toast({ title: 'Failed to save hospital', variant: 'destructive' });
      return;
    }

    toast({
      title: isEditing ? 'Hospital updated' : 'Hospital added',
      description: `${formData.name} has been ${isEditing ? 'updated' : 'added'} successfully.`,
    });
    navigate('/hospitals');
  };

  const isPdf = storedFileData?.startsWith('data:application/pdf') || formData.mouFileUrl.endsWith('.pdf');
  const autoStatus = getAutoStatus();
  const previewUrl = storedFileData || formData.mouFileUrl;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-4xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/hospitals')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Hospitals
          </Button>
          <PageHeader
            title={isEditing ? 'Edit Hospital' : 'Add New Hospital'}
            description="Enter hospital details and partnership information"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Hospital Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Hospital Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="alternateName">Alternate Name (Optional)</Label>
                <Input
                  id="alternateName"
                  value={formData.alternateName}
                  onChange={(e) => handleChange('alternateName', e.target.value)}
                  placeholder="E.g., short name or alias"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">Address Line</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="area">Area / Place</Label>
                <Input
                  id="area"
                  value={formData.area}
                  onChange={(e) => handleChange('area', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="pinCode">PIN Code</Label>
                <Input
                  id="pinCode"
                  value={formData.pinCode}
                  onChange={(e) => handleChange('pinCode', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Share Percentage</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="opShare">OP Share %</Label>
                <Input
                  id="opShare"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.opShare}
                  onChange={(e) => handleChange('opShare', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="ipShare">IP Share %</Label>
                <Input
                  id="ipShare"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.ipShare}
                  onChange={(e) => handleChange('ipShare', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="diagnosticShare">Diagnostic Share %</Label>
                <Input
                  id="diagnosticShare"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.diagnosticShare}
                  onChange={(e) => handleChange('diagnosticShare', parseFloat(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Point of Contact</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="contactPerson">Contact Person Name</Label>
                <Input
                  id="contactPerson"
                  value={formData.contactPerson}
                  onChange={(e) => handleChange('contactPerson', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="email">Email ID</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Agreement (MOU)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="mouStartDate">MOU Start Date</Label>
                <Input
                  id="mouStartDate"
                  type="date"
                  value={formData.mouStartDate}
                  onChange={(e) => handleChange('mouStartDate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="mouEndDate">MOU End Date</Label>
                <Input
                  id="mouEndDate"
                  type="date"
                  value={formData.mouEndDate}
                  onChange={(e) => handleChange('mouEndDate', e.target.value)}
                />
              </div>
              <div>
                <Label>Agreement Duration</Label>
                <div className="h-10 px-3 py-2 rounded-md border bg-muted text-sm flex items-center">
                  {calculateDuration()}
                </div>
              </div>
              <div className="md:col-span-3">
                <Label>Upload MOU Document</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {(formData.mouFileUrl || storedFileData) ? (
                  <div className="mt-1 flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
                    <FileText className="w-8 h-8 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{uploadedFile?.name || 'MOU Document'}</p>
                      <p className="text-xs text-muted-foreground">
                        {uploadedFile ? `${(uploadedFile.size / 1024).toFixed(1)} KB` : 'Uploaded file'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={handleDownloadFile}>
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={handleRemoveFile}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg hover:border-accent transition-colors cursor-pointer"
                  >
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PDF, PNG, JPG up to 10MB</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <Label>Auto-calculated Status</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on MOU dates
                  </p>
                </div>
                <StatusBadge status={autoStatus} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Manual Override to Inactive</Label>
                  <p className="text-sm text-muted-foreground">
                    Mark hospital as inactive regardless of MOU dates
                  </p>
                </div>
                <Switch
                  checked={formData.manualInactive}
                  onCheckedChange={(checked) => handleChange('manualInactive', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/hospitals')}>
              Cancel
            </Button>
            <Button type="submit">{isEditing ? 'Update Hospital' : 'Save Hospital'}</Button>
          </div>
        </form>

        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>MOU Document Preview</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              {previewUrl && (
                isPdf ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[70vh]"
                    title="MOU Document"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="MOU Document"
                    className="max-w-full h-auto mx-auto"
                  />
                )
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default HospitalForm;
