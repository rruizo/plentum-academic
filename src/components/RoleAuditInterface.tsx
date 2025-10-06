import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { 
  Shield, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Database,
  Eye,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';

interface AuditResult {
  role: string;
  status: 'OK' | 'REQUIRES_ADJUSTMENTS' | 'CRITICAL_SECURITY_ISSUES';
  frontend: {
    correctVisibility: string[];
    incorrectVisibility: string[];
  };
  permissions: {
    allowedSuccessful: string[];
    deniedSuccessful: string[];
    securityBreaches: string[];
  };
  recommendations: string[];
}

interface RLSPolicy {
  table_name: string;
  policy_name: string;
  policy_command: string;
  policy_role: string;
  description: string;
}

const RoleAuditInterface = () => {
  const { user, role } = useAuth();
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [currentAudit, setCurrentAudit] = useState<AuditResult | null>(null);
  const [rlsPolicies, setRlsPolicies] = useState<RLSPolicy[]>([]);
  const [loading, setLoading] = useState(false);

  // Definición de permisos esperados por rol
  const rolePermissions = {
    admin: {
      canSee: ['dashboard', 'courses', 'categories', 'questions', 'exams', 'analytics', 'users', 'admin', 'supervisors'],
      canManage: ['users', 'courses', 'exams', 'categories', 'questions', 'system_config', 'reports'],
      restrictedFrom: []
    },
    teacher: {
      canSee: ['dashboard', 'courses', 'categories', 'questions', 'exams', 'analytics'],
      canManage: ['courses', 'exams', 'categories', 'questions'],
      restrictedFrom: ['users', 'admin', 'supervisors', 'system_config']
    },
    student: {
      canSee: ['dashboard', 'exams'],
      canManage: ['exam_attempts'],
      restrictedFrom: ['users', 'admin', 'supervisors', 'courses', 'categories', 'questions', 'analytics', 'system_config']
    },
    supervisor: {
      canSee: ['dashboard', 'analytics', 'supervisors'],
      canManage: ['supervisor_assignments'],
      restrictedFrom: ['users', 'admin', 'courses', 'categories', 'questions', 'exams', 'system_config']
    }
  };

  const fetchRLSPolicies = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_role_permissions_audit');
      if (error) {
        console.error('Error fetching RLS policies:', error);
        toast.error('Error al obtener políticas RLS');
        return;
      }
      setRlsPolicies(data || []);
    } catch (error) {
      console.error('Error fetching RLS policies:', error);
    }
  };

  const auditCurrentRole = async () => {
    if (!role) return;

    setLoading(true);
    setCurrentAudit(null);

    try {
      const audit: AuditResult = {
        role: role,
        status: 'OK',
        frontend: {
          correctVisibility: [],
          incorrectVisibility: []
        },
        permissions: {
          allowedSuccessful: [],
          deniedSuccessful: [],
          securityBreaches: []
        },
        recommendations: []
      };

      // Auditar visibilidad del frontend
      const expectedPermissions = rolePermissions[role as keyof typeof rolePermissions];
      
      if (expectedPermissions) {
        // Verificar elementos que deberían ser visibles
        const sidebarElements = document.querySelectorAll('[data-testid^="sidebar-"]');
        sidebarElements.forEach(element => {
          const elementId = element.getAttribute('data-testid')?.replace('sidebar-', '');
          if (elementId) {
            if (expectedPermissions.canSee.includes(elementId)) {
              if (element.checkVisibility && element.checkVisibility()) {
                audit.frontend.correctVisibility.push(`Sidebar: ${elementId} (visible correctly)`);
              } else {
                audit.frontend.incorrectVisibility.push(`Sidebar: ${elementId} (should be visible but hidden)`);
              }
            } else if (expectedPermissions.restrictedFrom.includes(elementId)) {
              if (element.checkVisibility && element.checkVisibility()) {
                audit.frontend.incorrectVisibility.push(`Sidebar: ${elementId} (should be hidden but visible)`);
              } else {
                audit.frontend.correctVisibility.push(`Sidebar: ${elementId} (hidden correctly)`);
              }
            }
          }
        });

        // Auditar permisos de base de datos
        await auditDatabasePermissions(audit, role, expectedPermissions);
      }

      // Determinar estado general
      if (audit.frontend.incorrectVisibility.length > 0 || audit.permissions.securityBreaches.length > 0) {
        audit.status = audit.permissions.securityBreaches.length > 0 ? 'CRITICAL_SECURITY_ISSUES' : 'REQUIRES_ADJUSTMENTS';
      }

      setCurrentAudit(audit);
      
    } catch (error) {
      console.error('Error during audit:', error);
      toast.error('Error durante la auditoría');
    } finally {
      setLoading(false);
    }
  };

  const auditDatabasePermissions = async (audit: AuditResult, role: string, permissions: any) => {
    // Probar operaciones CRUD según el rol
    const testOperations = [
      { table: 'profiles' as const, operation: 'SELECT', should_allow: ['admin'].includes(role) },
      { table: 'exams' as const, operation: 'SELECT', should_allow: ['admin', 'teacher'].includes(role) },
      { table: 'questions' as const, operation: 'SELECT', should_allow: ['admin', 'teacher'].includes(role) },
      { table: 'system_config' as const, operation: 'SELECT', should_allow: ['admin'].includes(role) },
      { table: 'exam_assignments' as const, operation: 'SELECT', should_allow: ['admin', 'teacher'].includes(role) }
    ];

    for (const test of testOperations) {
      try {
        // Solo hacer SELECT para probar permisos
        const result = await supabase.from(test.table).select('id').limit(1);

        if (test.should_allow) {
          if (!result.error) {
            audit.permissions.allowedSuccessful.push(`${test.operation} on ${test.table}`);
          } else {
            audit.permissions.deniedSuccessful.push(`${test.operation} on ${test.table} (incorrectly denied)`);
          }
        } else {
          if (result.error) {
            audit.permissions.deniedSuccessful.push(`${test.operation} on ${test.table}`);
          } else {
            audit.permissions.securityBreaches.push(`${test.operation} on ${test.table} (should be denied)`);
          }
        }
      } catch (error) {
        // Error expected for denied operations
        if (!test.should_allow) {
          audit.permissions.deniedSuccessful.push(`${test.operation} on ${test.table}`);
        }
      }
    }
  };

  useEffect(() => {
    fetchRLSPolicies();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'REQUIRES_ADJUSTMENTS': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'CRITICAL_SECURITY_ISSUES': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Shield className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OK': return 'bg-green-100 text-green-800';
      case 'REQUIRES_ADJUSTMENTS': return 'bg-yellow-100 text-yellow-800';
      case 'CRITICAL_SECURITY_ISSUES': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (role !== 'admin') {
    return (
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          Solo los administradores pueden acceder a la auditoría de roles y permisos.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Auditoría de Roles y Permisos</h1>
          <p className="text-muted-foreground">
            Validación de control de acceso y seguridad por roles
          </p>
        </div>
        <Button onClick={auditCurrentRole} disabled={loading}>
          <Shield className="h-4 w-4 mr-2" />
          {loading ? 'Auditando...' : 'Auditar Rol Actual'}
        </Button>
      </div>

      <Tabs defaultValue="current-audit" className="space-y-6">
        <TabsList>
          <TabsTrigger value="current-audit">Auditoría Actual</TabsTrigger>
          <TabsTrigger value="rls-policies">Políticas RLS</TabsTrigger>
          <TabsTrigger value="test-users">Usuarios de Prueba</TabsTrigger>
        </TabsList>

        <TabsContent value="current-audit">
          {currentAudit ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {getStatusIcon(currentAudit.status)}
                        Auditoría del Rol: {currentAudit.role}
                      </CardTitle>
                      <CardDescription>
                        Estado de la auditoría de permisos y visibilidad
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(currentAudit.status)}>
                      {currentAudit.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4" />
                      Visibilidad Frontend
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-sm font-medium text-green-600 mb-2">Correctos</h5>
                        <ul className="text-sm space-y-1">
                          {currentAudit.frontend.correctVisibility.map((item, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-red-600 mb-2">Incorrectos</h5>
                        <ul className="text-sm space-y-1">
                          {currentAudit.frontend.incorrectVisibility.map((item, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <XCircle className="h-3 w-3 text-red-500" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold flex items-center gap-2 mb-2">
                      <Database className="h-4 w-4" />
                      Permisos de Base de Datos
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h5 className="text-sm font-medium text-green-600 mb-2">Permitidos OK</h5>
                        <ul className="text-sm space-y-1">
                          {currentAudit.permissions.allowedSuccessful.map((item, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-blue-600 mb-2">Denegados OK</h5>
                        <ul className="text-sm space-y-1">
                          {currentAudit.permissions.deniedSuccessful.map((item, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <Shield className="h-3 w-3 text-blue-500" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-red-600 mb-2">Brechas de Seguridad</h5>
                        <ul className="text-sm space-y-1">
                          {currentAudit.permissions.securityBreaches.map((item, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No hay auditoría disponible
                </h3>
                <p className="text-sm text-muted-foreground">
                  Haz clic en "Auditar Rol Actual" para comenzar la validación
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rls-policies">
          <Card>
            <CardHeader>
              <CardTitle>Políticas de Row Level Security (RLS)</CardTitle>
              <CardDescription>
                Estado actual de las políticas de seguridad en la base de datos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rlsPolicies.map((policy, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{policy.policy_name}</h4>
                      <div className="flex gap-2">
                        <Badge variant="outline">{policy.table_name}</Badge>
                        <Badge variant="secondary">{policy.policy_command}</Badge>
                        <Badge className={`${policy.policy_role === 'admin' ? 'bg-red-100 text-red-800' : 
                          policy.policy_role === 'teacher' ? 'bg-blue-100 text-blue-800' :
                          policy.policy_role === 'student' ? 'bg-green-100 text-green-800' :
                          policy.policy_role === 'supervisor' ? 'bg-purple-100 text-purple-800' :
                          'bg-gray-100 text-gray-800'}`}>
                          {policy.policy_role}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">
                      {policy.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test-users">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios de Prueba</CardTitle>
              <CardDescription>
                Para crear usuarios de prueba, ve al panel de Supabase Auth
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <UserCheck className="h-4 w-4" />
                <AlertDescription>
                  <strong>Instrucciones para crear usuarios de prueba:</strong>
                  <br />
                  1. Ve a Supabase Dashboard → Authentication → Users
                  <br />
                  2. Crea usuarios con estos emails:
                  <br />
                  • admin_test@example.com (rol: admin)
                  <br />
                  • teacher_test@example.com (rol: teacher)
                  <br />
                  • student_test@example.com (rol: student)
                  <br />
                  • supervisor_test@example.com (rol: supervisor)
                  <br />
                  3. Los perfiles se crearán automáticamente con el trigger
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RoleAuditInterface;