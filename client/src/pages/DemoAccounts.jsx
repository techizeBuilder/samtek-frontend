import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Shield, 
  Factory, 
  Package, 
  Truck, 
  Calculator,
  Crown,
  LogIn,
  Eye
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'Super User',
    description: 'Full system access with all permissions',
    icon: Crown,
    color: 'bg-gradient-to-r from-purple-500 to-indigo-600',
    permissions: 'All modules with full CRUD access'
  },
  {
    username: 'unithead',
    password: 'unit123',
    role: 'Unit Head',
    description: 'Management level access across multiple units',
    icon: Shield,
    color: 'bg-gradient-to-r from-blue-500 to-cyan-600',
    permissions: 'Dashboard, Orders, Manufacturing, Sales, Dispatches'
  },
  {
    username: 'production',
    password: 'prod123',
    role: 'Production',
    description: 'Manufacturing and production management',
    icon: Factory,
    color: 'bg-gradient-to-r from-green-500 to-emerald-600',
    permissions: 'Dashboard, Orders, Manufacturing, Inventory'
  },
  {
    username: 'packing',
    password: 'pack123',
    role: 'Packing',
    description: 'Packaging operations and inventory',
    icon: Package,
    color: 'bg-gradient-to-r from-orange-500 to-red-600',
    permissions: 'Dashboard, Orders, Manufacturing, Dispatches, Inventory'
  },
  {
    username: 'dispatch',
    password: 'disp123',
    role: 'Dispatch',
    description: 'Shipping and delivery management',
    icon: Truck,
    color: 'bg-gradient-to-r from-yellow-500 to-orange-600',
    permissions: 'Dashboard, Orders, Dispatches, Inventory'
  },
  {
    username: 'accounts',
    password: 'acc123',
    role: 'Accounts',
    description: 'Financial management and reporting',
    icon: Calculator,
    color: 'bg-gradient-to-r from-teal-500 to-blue-600',
    permissions: 'Dashboard, Orders, Sales, Accounts, Customers, Suppliers'
  }
];

export default function DemoAccounts() {
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (account) => {
    setIsLoggingIn(true);
    setSelectedAccount(account.username);
    
    try {
      await login({
        username: account.username,
        password: account.password
      });
      
      toast({
        title: "Login Successful",
        description: `Welcome back, ${account.role}!`,
      });
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
      setSelectedAccount(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 md:p-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-400/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-8">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300">
                <Factory className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur opacity-20 animate-pulse"></div>
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-6 animate-fade-in">
            Manufacturing ERP Demo
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Experience our comprehensive ERP system with role-based access control. 
            Choose a demo account below to explore different user perspectives and capabilities.
          </p>
          <div className="mt-8 flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>

        {/* Demo Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
          {DEMO_ACCOUNTS.map((account) => {
            const Icon = account.icon;
            const isLoading = isLoggingIn && selectedAccount === account.username;
            
            return (
              <Card 
                key={account.username} 
                className="group hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border-0 bg-white/90 backdrop-blur-md relative overflow-hidden"
                onMouseEnter={() => setHoveredCard(account.username)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Animated Background Gradient */}
                <div className={cn(
                  "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500",
                  account.color
                )} />
                
                <CardHeader className="pb-4 relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn(
                      `w-14 h-14 ${account.color} rounded-2xl flex items-center justify-center shadow-lg transform transition-all duration-300`,
                      hoveredCard === account.username ? "scale-110 rotate-12" : ""
                    )}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <Badge variant="secondary" className="text-xs font-medium bg-white/70 backdrop-blur-sm">
                      {account.role}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl font-semibold text-slate-800">
                    {account.username}
                  </CardTitle>
                  <CardDescription className="text-slate-600">
                    {account.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <div className="p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200/50">
                      <div className="flex items-center gap-2 mb-3">
                        <Eye className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-semibold text-slate-700">
                          Module Access
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {account.permissions}
                      </p>
                    </div>
                    


                    <Button
                      onClick={() => handleLogin(account)}
                      disabled={isLoggingIn}
                      className={cn(
                        `w-full ${account.color} hover:opacity-90 text-white border-0 shadow-lg hover:shadow-2xl transition-all duration-300 relative overflow-hidden group/btn`,
                        isLoading && selectedAccount === account.username ? "animate-pulse" : "hover:scale-105"
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
                      {isLoading && selectedAccount === account.username ? (
                        <div className="flex items-center gap-2 relative z-10">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span className="font-medium">Connecting...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 relative z-10">
                          <LogIn className="w-5 h-5 transition-transform duration-200 group-hover/btn:translate-x-1" />
                          <span className="font-medium">Login as {account.role}</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Features Section */}
        <Card className="bg-white/60 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-slate-800">
              System Features
            </CardTitle>
            <CardDescription className="text-center">
              Comprehensive manufacturing ERP with role-based permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">User Management</h3>
                <p className="text-sm text-slate-600">
                  Complete user and permission management system
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Factory className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">Manufacturing</h3>
                <p className="text-sm text-slate-600">
                  Production planning and execution management
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">Inventory</h3>
                <p className="text-sm text-slate-600">
                  Real-time inventory tracking and management
                </p>
              </div>
              
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Calculator className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-2">Accounting</h3>
                <p className="text-sm text-slate-600">
                  Financial management and reporting tools
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}