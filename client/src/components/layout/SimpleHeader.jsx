import { useAuthContext } from '@/contexts/AuthContext';
import { useSettings } from '@/hooks/useSettings';
import { config } from '@/config/environment';
import { Button } from '@/components/ui/button';
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
import { 
  User, 
  Settings, 
  LogOut, 
  Menu,
  Bell,
  Search 
} from 'lucide-react';

export default function SimpleHeader({ title = "Dashboard", onSidebarToggle }) {
  const { user, logout } = useAuthContext();
  const { settings } = useSettings();

  const getProfileImageUrl = (profilePicture) => {
    if (!profilePicture) return null;
    if (profilePicture.startsWith('http')) return profilePicture;
    return `${config.baseURL}${profilePicture}`;
  };

  // Check if notifications are enabled for this user's role
  const isNotificationEnabled = () => {
    if (!user || !settings?.notifications?.roleSettings) {
      return true; // Default to enabled if no settings
    }

    // Role key mapping
    const roleKeyMapping = {
      'Sales': 'salesPerson',
      'Unit Head': 'unitHead',
      'Unit Manager': 'unitManager', 
      'Production': 'production',
      'Accounts': 'accounts',
      'Superadmin': 'superAdmin'
    };

    const roleKey = roleKeyMapping[user.role];
    if (!roleKey) {
      return true; // Default to enabled for unknown roles
    }

    // Check if role notifications are enabled (default to true if not set)
    return settings.notifications.roleSettings[roleKey]?.enabled !== false;
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={onSidebarToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications - only show if enabled for user's role */}
          {isNotificationEnabled() && <NotificationBell />}

          {/* Search */}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getProfileImageUrl(user?.profilePicture)} alt={user?.fullName || user?.username} />
                  <AvatarFallback>
                    {user?.fullName 
                      ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)
                      : user?.username?.slice(0, 2).toUpperCase() || 'U'
                    }
                  </AvatarFallback>
                </Avatar>
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
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.role}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}