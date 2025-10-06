
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Edit, Mail, Trash2, AlertTriangle, FileBarChart, Clock, Activity, Download } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import UserExamAttempts from "./UserExamAttempts";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { User } from "@/hooks/useUserManagement";
import EditUserDialog from "./EditUserDialog";
import UserEvaluationReport from "../user-evaluation/UserEvaluationReport";
import ExtendAttemptsDialog from "./ExtendAttemptsDialog";
import UserActivityLogDialog from "./UserActivityLogDialog";
import GeneratedReportsManager from "../report/GeneratedReportsManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface UserListProps {
  users: User[];
  onDeleteUser: (userId: string) => void;
  onPurgeUserData: (userId: string) => void;
  onSendInvitation: (user: User) => void;
  onUserUpdated: () => void;
  selectedUsers?: string[];
  onUserSelection?: (userId: string, checked: boolean) => void;
  onSelectAll?: () => void;
}

const UserList = ({ users, onDeleteUser, onPurgeUserData, onSendInvitation, onUserUpdated, selectedUsers = [], onUserSelection, onSelectAll }: UserListProps) => {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [reportUser, setReportUser] = useState<User | null>(null);
  const [extendAttemptsUser, setExtendAttemptsUser] = useState<User | null>(null);
  const [activityLogUser, setActivityLogUser] = useState<User | null>(null);
  const [downloadReportsUser, setDownloadReportsUser] = useState<User | null>(null);

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { label: "Administrador", variant: "default" as const },
      teacher: { label: "Usuario Instructor", variant: "secondary" as const },
      student: { label: "Usuario Evaluado", variant: "outline" as const },
      supervisor: { label: "Supervisor", variant: "destructive" as const }
    };
    return roleConfig[role as keyof typeof roleConfig] || { label: role, variant: "outline" as const };
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Usuarios</CardTitle>
              <CardDescription>
                Gestiona todos los usuarios registrados en el sistema
              </CardDescription>
            </div>
            {onSelectAll && onUserSelection && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={users.length > 0 && selectedUsers.length === users.length}
                  onCheckedChange={onSelectAll}
                />
                <label htmlFor="select-all" className="text-sm font-medium">
                  Seleccionar todos ({selectedUsers.length}/{users.length})
                </label>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => {
              const roleBadge = getRoleBadge(user.role);
              
              return (
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                   <div className="flex items-center space-x-4">
                     {onUserSelection && (
                       <Checkbox
                         checked={selectedUsers.includes(user.id)}
                         onCheckedChange={(checked) => onUserSelection(user.id, checked as boolean)}
                       />
                     )}
                     <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                       <span className="text-primary font-medium">
                         {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                       </span>
                     </div>
                     <div className="flex-1">
                       <h3 className="font-medium">{user.full_name}</h3>
                       <p className="text-sm text-muted-foreground">{user.email}</p>
                       <p className="text-xs text-muted-foreground">{user.company} - {user.area}</p>
                     </div>
                   </div>
                  
                   <div className="flex items-center space-x-4">
                     <div className="text-center">
                       <Badge variant={roleBadge.variant}>
                         {roleBadge.label}
                       </Badge>
                       <p className="text-xs text-muted-foreground mt-1">
                         {user.section}
                       </p>
                     </div>
                     
                     <div className="text-center">
                       <Badge variant="default">
                         Activo
                       </Badge>
                       <p className="text-xs text-muted-foreground mt-1">
                         {new Date(user.created_at).toLocaleDateString()}
                       </p>
                     </div>
                     
                     <UserExamAttempts userId={user.id} />
                    
                    <div className="flex space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditingUser(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => onSendInvitation(user)}
                        title="Enviar invitación"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setReportUser(user)}
                        title="Revisar evaluación"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <FileBarChart className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => setExtendAttemptsUser(user)}
                        title="Extender intentos de examen"
                        className="text-green-600 hover:text-green-700"
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                      
                       <Button 
                         size="sm" 
                         variant="ghost" 
                         onClick={() => setActivityLogUser(user)}
                         title="Ver log de actividades"
                         className="text-purple-600 hover:text-purple-700"
                       >
                         <Activity className="h-4 w-4" />
                       </Button>
                       
                       <Dialog>
                         <DialogTrigger asChild>
                           <Button 
                             size="sm" 
                             variant="ghost" 
                             title="Descargar reportes PDF"
                             className="text-blue-600 hover:text-blue-700"
                           >
                             <Download className="h-4 w-4" />
                           </Button>
                         </DialogTrigger>
                         <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                           <DialogHeader>
                             <DialogTitle>Reportes PDF - {user.full_name}</DialogTitle>
                           </DialogHeader>
                           <GeneratedReportsManager 
                             userRole="admin" 
                             currentUserId={user.id}
                           />
                         </DialogContent>
                       </Dialog>
                      
                      {/* Purgar Datos del Usuario */}
                      <AlertDialog onOpenChange={() => setConfirmEmail("")}>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-orange-600 hover:text-orange-700" title="Purgar todos los datos">
                            <AlertTriangle className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-orange-600" />
                              ⚠️ PURGA COMPLETA DE DATOS ⚠️
                            </AlertDialogTitle>
                            <AlertDialogDescription className="space-y-3">
                              <div className="bg-red-50 border border-red-200 rounded p-3">
                                <p className="font-medium text-red-800">¡ATENCIÓN! Esta acción es IRREVERSIBLE</p>
                              </div>
                              
                              <div>
                                <p className="font-medium mb-2">Esta operación eliminará PERMANENTEMENTE:</p>
                                <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                                  <li>Usuario: <strong>{user.full_name}</strong></li>
                                  <li>Email: <strong>{user.email}</strong></li>
                                  <li>TODAS las sesiones de examen</li>
                                  <li>TODOS los análisis y respuestas</li>
                                  <li>TODAS las credenciales generadas</li>
                                  <li>TODAS las asignaciones de examen</li>
                                  <li>TODOS los resultados psicométricos</li>
                                  <li>TODOS los resultados cognitivos</li>
                                </ul>
                              </div>
                              
                              <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                <p className="text-sm font-medium mb-2">
                                  Para confirmar, escriba el email del usuario:
                                </p>
                                <Input
                                  type="email"
                                  placeholder={user.email}
                                  value={confirmEmail}
                                  onChange={(e) => setConfirmEmail(e.target.value)}
                                  className="font-mono"
                                />
                              </div>

                              <p className="text-sm font-medium text-red-600">
                                ⚠️ Solo usar cuando sea absolutamente necesario eliminar todos los datos
                              </p>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setConfirmEmail("")}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => {
                                onPurgeUserData(user.id);
                                setConfirmEmail("");
                              }}
                              disabled={confirmEmail !== user.email}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              SÍ, PURGAR TODOS LOS DATOS
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      
                      {/* Eliminar Usuario (Método Anterior) */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción eliminará el usuario {user.full_name} usando el método anterior. 
                              Si experimenta errores de dependencias, use el botón de "Purgar" en su lugar.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteUser(user.id)}>
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {users.length === 0 && (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                No se encontraron usuarios que coincidan con los filtros
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EditUserDialog 
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onUserUpdated={onUserUpdated}
      />

      {reportUser && (
        <UserEvaluationReport
          userId={reportUser.id}
          userName={reportUser.full_name}
          userEmail={reportUser.email}
          isOpen={!!reportUser}
          onClose={() => setReportUser(null)}
        />
      )}

      {extendAttemptsUser && (
        <ExtendAttemptsDialog
          isOpen={!!extendAttemptsUser}
          onClose={() => setExtendAttemptsUser(null)}
          userId={extendAttemptsUser.id}
          userName={extendAttemptsUser.full_name}
          userEmail={extendAttemptsUser.email}
          onExtended={onUserUpdated}
        />
      )}

      {activityLogUser && (
        <UserActivityLogDialog
          isOpen={!!activityLogUser}
          onClose={() => setActivityLogUser(null)}
          userId={activityLogUser.id}
          userName={activityLogUser.full_name}
          userEmail={activityLogUser.email}
        />
      )}
    </>
  );
};

export default UserList;
