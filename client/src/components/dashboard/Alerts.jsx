import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Clock, AlertCircle } from 'lucide-react';

export default function Alerts() {
  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['/api/dashboard/alerts'],
    enabled: true
  });

  const getAlertIcon = (type) => {
    switch (type) {
      case 'warning':
        return AlertTriangle;
      case 'error':
        return AlertCircle;
      default:
        return Clock;
    }
  };

  const getAlertClass = (type) => {
    switch (type) {
      case 'warning':
        return 'border-orange-200 bg-orange-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const alerts = alertsData?.alerts || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No alerts at this time
            </p>
          ) : (
            alerts.map((alert, index) => {
              const Icon = getAlertIcon(alert.type);
              return (
                <Alert key={index} className={getAlertClass(alert.type)}>
                  <Icon className="h-4 w-4" />
                  <AlertDescription>
                    <div>
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alert.message}
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
