
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserManagement } from "@/hooks/useUserManagement";
import UserFilters from "./user-management/UserFilters";
import UserStatsCards from "./user-management/UserStatsCards";
import CreateUserDialog from "./user-management/CreateUserDialog";
import BulkImportDialog from "./user-management/BulkImportDialog";
import UserList from "./user-management/UserList";
import AlternateReportMapping from "./user-management/AlternateReportMapping";
import GeneratedReportsManager from "./report/GeneratedReportsManager";
import PdfTestButton from "./testing/PdfTestButton";
import BulkExamAssignment from "./user-management/BulkExamAssignment";
import BulkPasswordGeneration from "./user-management/BulkPasswordGeneration";
import BulkWelcomeEmail from "./user-management/BulkWelcomeEmail";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [examFilter, setExamFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [reportContactFilter, setReportContactFilter] = useState("all");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isPurging, setIsPurging] = useState(false);
  const { 
    users, 
    loading, 
    fetchUsers, 
    generateTempPassword, 
    createUser,
    deleteUser,
    purgeUserData,
    sendInvitation 
  } = useUserManagement();

  // Extract unique values for filters
  const companies = useMemo(() => {
    const uniqueCompanies = [...new Set(users.map(user => user.company))];
    return uniqueCompanies.filter(company => company && company.trim() !== '');
  }, [users]);

  const areas = useMemo(() => {
    const uniqueAreas = [...new Set(users.map(user => user.area))];
    return uniqueAreas.filter(area => area && area.trim() !== '');
  }, [users]);

  const sections = useMemo(() => {
    const uniqueSections = [...new Set(users.map(user => user.section))];
    return uniqueSections.filter(section => section && section.trim() !== '');
  }, [users]);

  const reportContacts = useMemo(() => {
    const uniqueContacts = [...new Set(users.map(user => user.report_contact))];
    return uniqueContacts.filter(contact => contact && contact.trim() !== '');
  }, [users]);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesCompany = companyFilter === "all" || user.company === companyFilter;
    const matchesArea = areaFilter === "all" || user.area === areaFilter;
    const matchesSection = sectionFilter === "all" || user.section === sectionFilter;
    const matchesReportContact = reportContactFilter === "all" || user.report_contact === reportContactFilter;
    
    let matchesExam = true;
    if (examFilter === "with_reliability") {
      matchesExam = user.exam_completed === true;
    } else if (examFilter === "without_reliability") {
      matchesExam = user.exam_completed !== true;
    }
    
    return matchesSearch && matchesRole && matchesExam && matchesCompany && 
           matchesArea && matchesSection && matchesReportContact;
  });

  const handlePurgeSpecificUsersData = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Selecciona al menos un usuario para purgar sus datos');
      return;
    }
    
    try {
      setIsPurging(true);
      
      const { data, error } = await supabase.rpc('purge_specific_users_data', {
        user_ids: selectedUsers
      });
      
      if (error) {
        console.error('Error purgando datos de usuarios específicos:', error);
        toast.error(`Error: ${error.message}`);
        return;
      }
      
      toast.success(`Purga completada: ${data}`);
      // Refrescar la lista de usuarios después de la purga
      fetchUsers();
      // Limpiar selección
      setSelectedUsers([]);
      
    } catch (error) {
      console.error('Error ejecutando purga:', error);
      toast.error('Error ejecutando la purga de datos');
    } finally {
      setIsPurging(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando usuarios...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra usuarios, roles y permisos del sistema
          </p>
        </div>
        <div className="flex gap-2">
          <BulkImportDialog 
            showImportDialog={showImportDialog}
            setShowImportDialog={setShowImportDialog}
            onUsersImported={fetchUsers}
            generateTempPassword={generateTempPassword}
          />
          <CreateUserDialog 
            onUserCreated={fetchUsers}
            createUser={createUser}
            generateTempPassword={generateTempPassword}
          />
          <BulkExamAssignment
            users={filteredUsers}
            selectedUsers={selectedUsers}
            onSelectionChange={setSelectedUsers}
          />
          <BulkPasswordGeneration
            users={filteredUsers}
            selectedUsers={selectedUsers}
            onSelectionChange={setSelectedUsers}
            onPasswordsGenerated={fetchUsers}
          />
          <BulkWelcomeEmail
            users={filteredUsers}
            selectedUsers={selectedUsers}
            onSelectionChange={setSelectedUsers}
          />
          
          {/* Botón de Purgar Datos de Usuarios Seleccionados */}
          {selectedUsers.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Purgar Datos ({selectedUsers.length} usuarios)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                    <Trash2 className="h-5 w-5" />
                    ⚠️ PURGAR DATOS DE USUARIOS SELECCIONADOS ⚠️
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="font-medium text-red-800">¡ATENCIÓN! Esta acción es COMPLETAMENTE IRREVERSIBLE</p>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <p className="font-medium text-blue-800">
                        Se purgarán los datos de {selectedUsers.length} usuario(s) seleccionado(s)
                      </p>
                    </div>
                    
                    <div>
                      <p className="font-medium mb-2">Esta operación eliminará PERMANENTEMENTE de los usuarios seleccionados:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                        <li>Todos los intentos de examen</li>
                        <li>Todas las sesiones de examen</li>
                        <li>Todas las asignaciones de examen</li>
                        <li>Todas las notificaciones de email</li>
                        <li>Todas las credenciales de examen</li>
                        <li>Todas las respuestas psicométricas</li>
                        <li>Todos los resultados psicométricos</li>
                        <li>Todas las submissions HTP</li>
                        <li>Todos los análisis HTP</li>
                      </ul>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <p className="text-sm font-medium">
                        ⚠️ Los usuarios NO serán eliminados, solo sus datos de evaluación
                      </p>
                    </div>

                    <p className="text-sm font-medium text-red-600">
                      Los flags de examen se reiniciarán permitiendo nuevas evaluaciones
                    </p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handlePurgeSpecificUsersData}
                    disabled={isPurging}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {isPurging ? "Purgando..." : `SÍ, PURGAR DATOS DE ${selectedUsers.length} USUARIOS`}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Gestión de Usuarios</TabsTrigger>
          <TabsTrigger value="reports">Reportes Alternativos</TabsTrigger>
          <TabsTrigger value="pdfs">Reportes PDF Generados</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <UserFilters 
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            roleFilter={roleFilter}
            setRoleFilter={setRoleFilter}
            examFilter={examFilter}
            setExamFilter={setExamFilter}
            companyFilter={companyFilter}
            setCompanyFilter={setCompanyFilter}
            areaFilter={areaFilter}
            setAreaFilter={setAreaFilter}
            sectionFilter={sectionFilter}
            setSectionFilter={setSectionFilter}
            reportContactFilter={reportContactFilter}
            setReportContactFilter={setReportContactFilter}
            companies={companies}
            areas={areas}
            sections={sections}
            reportContacts={reportContacts}
          />

          <UserStatsCards users={users} />

          <UserList 
            users={filteredUsers}
            onDeleteUser={deleteUser}
            onPurgeUserData={purgeUserData}
            onSendInvitation={sendInvitation}
            onUserUpdated={fetchUsers}
            selectedUsers={selectedUsers}
            onUserSelection={(userId, checked) => {
              if (checked) {
                setSelectedUsers([...selectedUsers, userId]);
              } else {
                setSelectedUsers(selectedUsers.filter(id => id !== userId));
              }
            }}
            onSelectAll={() => {
              if (selectedUsers.length === filteredUsers.length) {
                setSelectedUsers([]);
              } else {
                setSelectedUsers(filteredUsers.map(user => user.id));
              }
            }}
          />
        </TabsContent>

        <TabsContent value="reports">
          <AlternateReportMapping users={users} />
        </TabsContent>

        <TabsContent value="pdfs">
          <div className="space-y-6">
            <GeneratedReportsManager userRole="admin" />
            
            {/* Botón de prueba para desarrolladores */}
            <div className="mt-8 p-4 border rounded-lg bg-muted/20">
              <h3 className="font-medium mb-4">Herramientas de Desarrollo</h3>
              <PdfTestButton />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserManagement;
