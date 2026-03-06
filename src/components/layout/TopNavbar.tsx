import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Receipt,
  LogOut,
  KeyRound,
  Menu,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import logoImage from '@/assets/logo.png';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { clearAuthToken } from '@/lib/apiClient';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

interface LoggedInUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isWebsiteHead?: boolean;
}

export const TopNavbar = () => {
  const [loggedInUser, setLoggedInUser] = useState<LoggedInUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canView, isWebsiteHead } = usePermissions();

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

  const NavLinks = ({ mobile = false, onClose }: { mobile?: boolean; onClose?: () => void }) => (
    <>
      {menuItems.map((item) => {
        const isActive = location.pathname === item.path || 
          (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
        
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium',
              mobile ? 'w-full' : '',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted text-foreground/80 hover:text-foreground'
            )}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 lg:px-6">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 mr-6">
          <img src={logoImage} alt="Medagg" className="w-8 h-8 object-contain" />
          <span className="font-semibold text-lg hidden sm:block">Medagg</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 flex-1">
          <NavLinks />
        </nav>

        {/* User Info + Logout (Desktop) */}
        <div className="hidden lg:flex items-center gap-4 ml-auto">
          {loggedInUser && (
            <div className="text-right">
              <p className="text-sm font-medium truncate max-w-[150px]">{loggedInUser.name}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[150px]">{loggedInUser.email}</p>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Mobile Menu */}
        <div className="lg:hidden ml-auto">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={logoImage} alt="Medagg" className="w-8 h-8 object-contain" />
                    <span className="font-semibold">Medagg</span>
                  </div>
                </div>
                
                <nav className="flex-1 p-4 space-y-1">
                  <NavLinks mobile onClose={() => setMobileMenuOpen(false)} />
                </nav>

                <div className="p-4 border-t space-y-3">
                  {loggedInUser && (
                    <div>
                      <p className="text-sm font-medium truncate">{loggedInUser.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{loggedInUser.email}</p>
                      {loggedInUser.isWebsiteHead && (
                        <p className="text-xs text-primary mt-1">Website Head</p>
                      )}
                    </div>
                  )}
                  <Button variant="outline" className="w-full" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
