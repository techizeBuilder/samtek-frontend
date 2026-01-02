import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { config } from '@/config/environment';
import { 
  Menu,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Building
} from 'lucide-react';

export default function NavBar({ onSidebarToggle }) {
  const { user, logout } = useAuth();
  const { companyLogo, companyName } = useSettings();

  const getProfileImageUrl = (profilePicture) => {
    if (!profilePicture) return null;
    if (profilePicture.startsWith('http')) return profilePicture;
    return `${config.baseURL}${profilePicture}`;
  };




  return (
    <nav className="h-16 bg-white/80 backdrop-blur-sm border-b border-slate-200 px-6">
      <div className="flex items-center justify-between h-full">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onSidebarToggle}
            className="md:hidden text-slate-600 hover:bg-slate-100:bg-slate-800"
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="hidden md:flex items-center gap-3">
            {companyLogo ? (
              <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200">
                <img 
                  src={companyLogo} 
                  alt="Company Logo" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.log('Logo load error:', e);
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `
                      <div class="w-full h-full bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2L2 7L12 12L22 7L12 2Z"></path>
                          <path d="M2 17L12 22L22 17"></path>
                          <path d="M2 12L12 17L22 12"></path>
                        </svg>
                      </div>
                    `;
                  }}
                />
              </div>
            ) : (
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building className="w-4 h-4 text-blue-600" />
              </div>
            )}
            <h1 className="text-lg font-medium text-slate-900">
              {companyName}
            </h1>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <NotificationBell />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-slate-100:bg-slate-800">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getProfileImageUrl(user?.profilePicture)} alt={user?.fullName || user?.username} />
                  <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium">
                    {user?.fullName 
                      ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)
                      : user?.username?.slice(0, 2).toUpperCase() || 'U'
                    }
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-slate-900">
                    {user?.fullName || user?.username}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.fullName || user?.username}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/profile" className="flex items-center cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </a>
              </DropdownMenuItem>
              {user?.role === 'Super User' && (
                <DropdownMenuItem asChild>
                  <a href="/settings" className="flex items-center cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={logout} 
                className="text-red-600 hover:text-red-700:text-red-300"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}