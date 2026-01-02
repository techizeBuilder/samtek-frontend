import React, { useState } from 'react';
import Sidebar from './Sidebar';
import NavBar from './NavBar';
import { useAuth } from '@/hooks/useAuth';

const UnitManagerLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className="md:ml-80 lg:ml-72">
        <NavBar onSidebarToggle={() => setSidebarOpen(true)} />
        
        {/* Main Content - Full Width with Spacing */}
        <main className="min-h-[calc(100vh-4rem)] p-2 sm:p-6">
          <div className="max-w-screen-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default UnitManagerLayout;
