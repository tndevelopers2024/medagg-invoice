import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Receipt,
  LogOut,
  ChevronLeft,
  ChevronRight,
  KeyRound,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import logoImage from '@/assets/logo.png';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { clearAuthToken } from '@/lib/apiClient';

interface LoggedInUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isWebsiteHead?: boolean;
}

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canView, isWebsiteHead, isLoading: permissionsLoading } = usePermissions();

  useEffect(() => {
    const stored = localStorage.getItem('loggedInUser');
    if (stored) {
      setLoggedInUser(JSON.parse(stored));
    }
  }, []);

  const handleLogout = async () => {
    clearAuthToken();
    localStorage.removeItem('loggedInUser');
    toast({ title: 'Logged out', description: 'You have been logged out successfully.' });
    navigate('/login');
  };

  // All possible menu items with their permission page names
  const allMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', permPage: 'dashboard' },
    { icon: Building2, label: 'Hospitals', path: '/hospitals', permPage: 'hospitals' },
    { icon: Users, label: 'Patients', path: '/patients', permPage: 'patients' },
    { icon: FileText, label: 'Create Invoice', path: '/invoices/create', permPage: 'invoices' },
    { icon: Receipt, label: 'Invoice Dashboard', path: '/invoices', permPage: 'invoices' },
  ];

  // Filter menu items based on permissions
  const menuItems = [
    ...allMenuItems.filter(item => canView(item.permPage)),
    // Only show Credentials to Website Head
    ...(isWebsiteHead ? [{ icon: KeyRound, label: 'Credentials', path: '/credentials', permPage: 'credentials' }] : []),
  ];

  return (
    <>
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col transition-all duration-300 z-50',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <img src={logoImage} alt="Medagg" className="w-8 h-8 object-contain" />
              <span className="font-semibold text-lg">Medagg</span>
            </div>
          )}
          {collapsed && (
            <img src={logoImage} alt="Medagg" className="w-8 h-8 object-contain mx-auto" />
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 py-4">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground'
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="font-medium">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-2">
          {!collapsed && loggedInUser && (
            <div className="mb-3 px-3">
              <p className="text-sm font-medium truncate">{loggedInUser.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{loggedInUser.email}</p>
              {loggedInUser.isWebsiteHead && (
                <p className="text-xs text-primary mt-1">Website Head</p>
              )}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full hover:bg-sidebar-accent transition-colors text-sidebar-foreground/80 hover:text-sidebar-foreground"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
