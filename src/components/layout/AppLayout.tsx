import { ReactNode } from 'react';
import { TopNavbar } from './TopNavbar';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopNavbar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};
