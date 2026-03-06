import { useState, useEffect } from 'react';

interface PagePermission {
  page_name: string;
  can_view: boolean;
  can_edit: boolean;
}

interface LoggedInUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isWebsiteHead?: boolean;
  permissions?: PagePermission[];
}

interface UsePermissionsResult {
  permissions: PagePermission[];
  isWebsiteHead: boolean;
  isLoading: boolean;
  canView: (pageName: string) => boolean;
  canEdit: (pageName: string) => boolean;
}

export const usePermissions = (): UsePermissionsResult => {
  const [permissions, setPermissions] = useState<PagePermission[]>([]);
  const [isWebsiteHead, setIsWebsiteHead] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const stored = localStorage.getItem('loggedInUser');
        if (!stored) {
          setPermissions([]);
          setIsWebsiteHead(false);
          return;
        }

        const user = JSON.parse(stored) as LoggedInUser;
        const isHead = !!user.isWebsiteHead || user.role === 'website_head';
        setIsWebsiteHead(isHead);
        setPermissions(user.permissions || []);
      } catch (error) {
        console.error('Error fetching permissions:', error);
        setPermissions([]);
        setIsWebsiteHead(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'loggedInUser') fetchPermissions();
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const canView = (pageName: string): boolean => {
    if (isWebsiteHead) return true;
    const perm = permissions.find(p => p.page_name === pageName);
    return perm?.can_view || false;
  };

  const canEdit = (pageName: string): boolean => {
    if (isWebsiteHead) return true;
    const perm = permissions.find(p => p.page_name === pageName);
    return perm?.can_edit || false;
  };

  return {
    permissions,
    isWebsiteHead,
    isLoading,
    canView,
    canEdit,
  };
};
