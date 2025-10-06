import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Clock, User, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserActivityLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userEmail: string;
}

interface ActivityLog {
  id: string;
  activity_type: string;
  activity_description: string;
  previous_value: any;
  new_value: any;
  metadata: any;
  created_at: string;
  admin_id: string;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

const UserActivityLogDialog = ({ 
  isOpen, 
  onClose, 
  userId, 
  userName, 
  userEmail 
}: UserActivityLogDialogProps) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadActivityLog();
    }
  }, [isOpen, userId]);

  const loadActivityLog = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_activity_log')
        .select(`
          *,
          profiles!user_activity_log_admin_id_fkey(full_name, email)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities((data || []) as unknown as ActivityLog[]);
    } catch (error) {
      console.error('Error loading activity log:', error);
      toast.error('Error al cargar el log de actividades');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'extend_exam_attempts':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'user_created':
        return <User className="h-4 w-4 text-green-600" />;
      case 'user_modified':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'extend_exam_attempts':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Extensión Intentos</Badge>;
      case 'user_created':
        return <Badge variant="outline" className="text-green-600 border-green-600">Usuario Creado</Badge>;
      case 'user_modified':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Usuario Modificado</Badge>;
      default:
        return <Badge variant="outline">Actividad</Badge>;
    }
  };

  const formatActivityDetails = (activity: ActivityLog) => {
    if (activity.activity_type === 'extend_exam_attempts' && activity.metadata) {
      return (
        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Intentos añadidos:</strong> {activity.metadata.additional_attempts}</p>
          <p><strong>Motivo:</strong> {activity.metadata.admin_reason}</p>
          {activity.previous_value && (
            <p><strong>Intentos anteriores:</strong> {activity.previous_value.previous_max_attempts || 'N/A'}</p>
          )}
          {activity.new_value && (
            <p><strong>Nuevos intentos:</strong> {activity.new_value.new_max_attempts}</p>
          )}
        </div>
      );
    }
    
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Log de Actividades
          </DialogTitle>
          <DialogDescription>
            Historial de actividades para <strong>{userName}</strong> ({userEmail})
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[450px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay actividades registradas para este usuario</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <Card key={activity.id} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getActivityIcon(activity.activity_type)}
                        <CardTitle className="text-base">{activity.activity_description}</CardTitle>
                      </div>
                      {getActivityBadge(activity.activity_type)}
                    </div>
                    <CardDescription className="flex items-center gap-4 text-xs">
                      <span>Por: {activity.profiles?.full_name || 'Usuario desconocido'} ({activity.profiles?.email || 'N/A'})</span>
                      <span>{new Date(activity.created_at).toLocaleString()}</span>
                    </CardDescription>
                  </CardHeader>
                  
                  {formatActivityDetails(activity) && (
                    <CardContent className="pt-0">
                      {formatActivityDetails(activity)}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default UserActivityLogDialog;