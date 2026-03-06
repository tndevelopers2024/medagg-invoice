import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, Clock, CheckCircle, XCircle, Settings, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { apiFetch } from '@/lib/apiClient';

const asArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const v = value as any;
    if (Array.isArray(v.items)) return v.items as T[];
    if (Array.isArray(v.data)) return v.data as T[];
    if (Array.isArray(v.results)) return v.results as T[];
    if (Array.isArray(v.users)) return v.users as T[];
  }
  return [];
};

interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  status: 'pending' | 'active' | 'inactive';
  createdAt: string;
  role?: 'website_head' | 'user';
  permissions?: PagePermission[];
}

interface PagePermission {
  page_name: string;
  can_view: boolean;
  can_edit: boolean;
}

const PAGES = [
  { name: 'dashboard', label: 'Dashboard' },
  { name: 'hospitals', label: 'Hospitals' },
  { name: 'patients', label: 'Patients' },
  { name: 'invoices', label: 'Invoices' },
  { name: 'credentials', label: 'Credentials' },
];

const DEPARTMENTS = [
  'HR',
  'DIGITAL MARKETING (SOFTWARE)',
  'SALES',
  'DIRECTOR',
  'FINANCE',
  'BUSINESS DEVELOPMENT',
  'OTHERS',
];

const Credentials = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState<PagePermission[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();
  const { toast } = useToast();

  const safeUsers = asArray<UserProfile>(users);
  
  // Department storage in localStorage (mock)
  const [userDepartments, setUserDepartments] = useState<Record<string, string>>(() => {
    const stored = localStorage.getItem('userDepartments');
    return stored ? JSON.parse(stored) : {};
  });
  
  const updateUserDepartment = (userId: string, department: string) => {
    const updated = { ...userDepartments, [userId]: department };
    setUserDepartments(updated);
    localStorage.setItem('userDepartments', JSON.stringify(updated));
    toast({ title: 'Department Updated', description: `Department changed to ${department}.` });
  };

  // Check if current user is website_head
  useEffect(() => {
    const checkAccess = async () => {
      const stored = localStorage.getItem('loggedInUser');
      if (!stored) {
        navigate('/login');
        return;
      }

      const me = JSON.parse(stored) as { role?: string; isWebsiteHead?: boolean };
      const isHead = !!me.isWebsiteHead || me.role === 'website_head';

      if (!isHead) {
        toast({
          title: 'Access Denied',
          description: 'Only the Website Head can access this page.',
          variant: 'destructive',
        });
        navigate('/dashboard');
        return;
      }

      fetchUsers();
    };

    checkAccess();
  }, [navigate, toast]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<UserProfile[]>('/api/admin/users');
      setUsers(asArray<UserProfile>(data));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, newStatus: 'pending' | 'active' | 'inactive') => {
    try {
      const updated = await apiFetch<UserProfile>(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });

      setUsers(prev => prev.map(u => (u.id === userId ? updated : u)));

      toast({
        title: 'Status Updated',
        description: `User status changed to ${newStatus}.`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user status.',
        variant: 'destructive',
      });
    }
  };

  const updateUserRole = async (userId: string, newRole: 'website_head' | 'user') => {
    try {
      const updated = await apiFetch<UserProfile>(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });

      setUsers(prev => prev.map(u => (u.id === userId ? updated : u)));

      // Update localStorage if this affects the current logged-in user
      const loggedInUser = localStorage.getItem('loggedInUser');
      if (loggedInUser) {
        const parsed = JSON.parse(loggedInUser);
        if (parsed.id === userId) {
          parsed.role = newRole;
          parsed.isWebsiteHead = newRole === 'website_head';
          localStorage.setItem('loggedInUser', JSON.stringify(parsed));
        }
      }

      toast({
        title: 'Role Updated',
        description: `User role changed to ${newRole === 'website_head' ? 'Website Head' : 'User'}.`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update user role.',
        variant: 'destructive',
      });
    }
  };

  const deleteUser = async (userId: string, userEmail: string | null) => {
    // Prevent deleting yourself
    const loggedInUser = localStorage.getItem('loggedInUser');
    if (loggedInUser) {
      const parsed = JSON.parse(loggedInUser);
      if (parsed.id === userId) {
        toast({
          title: 'Cannot Delete',
          description: 'You cannot delete your own account.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (!confirm(`Are you sure you want to delete user "${userEmail || 'Unknown'}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });

      setUsers(prev => prev.filter(u => u.id !== userId));

      toast({
        title: 'User Deleted',
        description: `User ${userEmail || 'Unknown'} has been deleted.`,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user.',
        variant: 'destructive',
      });
    }
  };

  const openPermissionsDialog = (user: UserProfile) => {
    setSelectedUser(user);
    const existingPerms = user.permissions || [];
    
    // Create permissions for all pages if they don't exist
    const allPerms = PAGES.map(page => {
      const existing = existingPerms.find(p => p.page_name === page.name);
      return existing || {
        page_name: page.name,
        can_view: false,
        can_edit: false,
      };
    });
    
    setUserPermissions(allPerms);
    setIsPermissionDialogOpen(true);
  };

  const updatePermission = (pageName: string, field: 'can_view' | 'can_edit', value: boolean) => {
    setUserPermissions(prev => prev.map(p => 
      p.page_name === pageName 
        ? { ...p, [field]: value, ...(field === 'can_edit' && value ? { can_view: true } : {}) }
        : p
    ));
  };

  const savePermissions = async () => {
    if (!selectedUser) return;

    try {
      const updated = await apiFetch<UserProfile>(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions: userPermissions }),
      });

      setUsers(prev => prev.map(u => (u.id === selectedUser.id ? updated : u)));

      toast({
        title: 'Permissions Saved',
        description: 'User permissions have been updated.',
      });

      setIsPermissionDialogOpen(false);
      // Refresh list to keep state consistent
      fetchUsers();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to save permissions.',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'inactive':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'inactive':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Inactive</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const pendingCount = safeUsers.filter(u => u.status === 'pending').length;
  const totalCount = safeUsers.length;
  const activeCount = safeUsers.filter(u => u.status === 'active').length;
  const inactiveCount = safeUsers.filter(u => u.status === 'inactive').length;

  const filteredUsers = safeUsers.filter(user => statusFilter === 'all' || user.status === statusFilter);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 overflow-y-auto">
        <PageHeader
          title="User Credentials"
          description="Manage user accounts, status, and page permissions"
        />

        {/* Container for cards and table */}
        <div className="bg-card rounded-lg border shadow-sm p-6 space-y-6">
          {/* Summary Cards - Clickable filters */}
          <div className="grid gap-4 md:grid-cols-4">
            <div 
              onClick={() => setStatusFilter('all')}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                statusFilter === 'all' 
                  ? 'bg-primary/15 border-primary ring-2 ring-primary/30' 
                  : 'bg-primary/5 border-primary/30 hover:bg-primary/10'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalCount}</p>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                </div>
              </div>
            </div>
            <div 
              onClick={() => setStatusFilter('pending')}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                statusFilter === 'pending' 
                  ? 'bg-yellow-100 border-yellow-400 ring-2 ring-yellow-300' 
                  : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">Pending Approval</p>
                </div>
              </div>
            </div>
            <div 
              onClick={() => setStatusFilter('active')}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                statusFilter === 'active' 
                  ? 'bg-green-100 border-green-400 ring-2 ring-green-300' 
                  : 'bg-green-50 border-green-200 hover:bg-green-100'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeCount}</p>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
              </div>
            </div>
            <div 
              onClick={() => setStatusFilter('inactive')}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                statusFilter === 'inactive' 
                  ? 'bg-red-100 border-red-400 ring-2 ring-red-300' 
                  : 'bg-red-50 border-red-200 hover:bg-red-100'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{inactiveCount}</p>
                  <p className="text-sm text-muted-foreground">Inactive Users</p>
                </div>
              </div>
            </div>
          </div>

          {/* Users Table Section */}
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
              <Users className="w-5 h-5" />
              All Users
            </h3>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading users...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No users found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {user.name || 'N/A'}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="block truncate">{user.email}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[300px]">
                              <p>{user.email}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={userDepartments[user.id] || ''}
                            onValueChange={(value) => updateUserDepartment(user.id, value)}
                          >
                            <SelectTrigger className="w-[220px]">
                              <SelectValue placeholder="Select Department" />
                            </SelectTrigger>
                            <SelectContent className="min-w-[220px]">
                              {DEPARTMENTS.map((dept) => (
                                <SelectItem key={dept} value={dept} className="whitespace-nowrap">{dept}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role || 'user'}
                            onValueChange={(value: 'website_head' | 'user') => 
                              updateUserRole(user.id, value)
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="min-w-[140px]">
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="website_head">Website Head</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(user.status)}
                            {getStatusBadge(user.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(user.createdAt), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={user.status}
                              onValueChange={(value: 'pending' | 'active' | 'inactive') => 
                                updateUserStatus(user.id, value)
                              }
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                            {user.role !== 'website_head' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openPermissionsDialog(user)}
                              >
                                <Settings className="w-4 h-4 mr-1" />
                                Permissions
                              </Button>
                            )}
                            {user.role === 'website_head' && (
                              <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded">Full Access</span>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => deleteUser(user.id, user.email)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {/* Permissions Dialog */}
        <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Page Permissions - {selectedUser?.name || selectedUser?.email}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {PAGES.map((page) => {
                const perm = userPermissions.find(p => p.page_name === page.name);
                return (
                  <div key={page.name} className="flex items-center justify-between py-2 border-b">
                    <span className="font-medium">{page.label}</span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`${page.name}-view`}
                          checked={perm?.can_view || false}
                          onCheckedChange={(checked) => updatePermission(page.name, 'can_view', checked)}
                        />
                        <Label htmlFor={`${page.name}-view`} className="text-sm">View</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          id={`${page.name}-edit`}
                          checked={perm?.can_edit || false}
                          onCheckedChange={(checked) => updatePermission(page.name, 'can_edit', checked)}
                        />
                        <Label htmlFor={`${page.name}-edit`} className="text-sm">Edit</Label>
                      </div>
                    </div>
                  </div>
                );
              })}
              <Button onClick={savePermissions} className="w-full mt-4">
                Save Permissions
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Credentials;
