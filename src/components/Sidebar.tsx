//prueba
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LayoutDashboard, BookOpen, Users, GraduationCap, BarChart3, Settings, FileText, Brain, FolderTree, UserCheck, Shield, Menu, X, HelpCircle, TrendingDown, Key } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "./auth/AuthProvider";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate, useLocation } from "react-router-dom";

type Role = "admin" | "teacher" | "student" | "supervisor";

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
  path: string;
}

// Definición de Menu - paths internos usan '#' para indicar que son tabs
const SIDEBAR_MENU_ITEMS: MenuItem[] = [
  { id: "student-dashboard", label: "Mis Exámenes", icon: GraduationCap, roles: ["student"], path: "#student-dashboard" },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "teacher", "supervisor"], path: "#dashboard" },
  { id: "categories", label: "Categorías", icon: FolderTree, roles: ["admin", "teacher"], path: "#categories" },
  { id: "questions", label: "Preguntas", icon: HelpCircle, roles: ["admin", "teacher"], path: "#questions" },
  { id: "exams", label: "Exámenes", icon: GraduationCap, roles: ["admin", "teacher"], path: "#exams" },
  { id: "psychometric", label: "Tests Psicométricos", icon: Brain, roles: ["admin", "teacher"], path: "/psychometric-tests" },
  { id: "turnover", label: "Rotación Personal", icon: TrendingDown, roles: ["admin", "teacher"], path: "#turnover" },
  { id: "htp", label: "Exámenes HTP", icon: FileText, roles: ["admin", "teacher", "student"], path: "#htp" },
  { id: "analytics", label: "Análisis", icon: BarChart3, roles: ["admin", "teacher", "supervisor"], path: "#analytics" },
  { id: "users", label: "Usuarios", icon: Users, roles: ["admin"], path: "#users" },
  { id: "credentials", label: "Credenciales", icon: Key, roles: ["admin"], path: "#credentials" },
  { id: "supervisors", label: "Supervisores", icon: UserCheck, roles: ["admin"], path: "#supervisors" },
  { id: "admin", label: "Administración", icon: Settings, roles: ["admin"], path: "#admin" },
  { id: "audit", label: "Auditoría", icon: Shield, roles: ["admin"], path: "#audit" },
  { id: "security", label: "Seguridad", icon: Shield, roles: ["admin"], path: "/security" }
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar = ({ activeTab, setActiveTab, isOpen, onToggle }: SidebarProps) => {
  const { user, role, roleLoading } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  // Memoize filtered menu items and only recalculate when role actually changes
  const filteredMenuItems = useMemo(() => {
    if (!role) return [];
    return SIDEBAR_MENU_ITEMS.filter(item => 
      item.roles.includes(role as Role)
    );
  }, [role]);

  // Determinar el ítem activo de forma más robusta y explícita
  const activeItemId = useMemo(() => {
    // Para rutas externas, encontrar el ítem que coincide con la URL actual
    const externalMatch = filteredMenuItems.find(
      item => !item.path.startsWith('#') && location.pathname === item.path
    );
    
    if (externalMatch) {
      return externalMatch.id;
    }
    
    // Para rutas internas, usar activeTab
    return activeTab;
  }, [filteredMenuItems, location.pathname, activeTab]);

  const getRoleLabel = useCallback((r: Role | string) => {
    switch (r) {
      case 'admin': return 'Administrador';
      case 'teacher': return 'Profesor';
      case 'student': return 'Estudiante';
      case 'supervisor': return 'Supervisor';
      default: return 'Usuario';
    }
  }, []);

  const handleItemClick = useCallback((item: MenuItem) => {
    // Si el path empieza con #, es un tab interno
    if (item.path.startsWith('#')) {
      const tabId = item.path.substring(1); // Quitar el #
      setActiveTab(tabId);
      if (isMobile) {
        onToggle();
      }
    } else {
      // Es una ruta externa, navegar normalmente
      navigate(item.path);
      if (isMobile) {
        onToggle();
      }
    }
  }, [setActiveTab, navigate, isMobile, onToggle]);

  // Determinar si debemos mostrar el estado de carga
  const isLoading = roleLoading;
  
  // Determinar si hay items para mostrar
  const hasMenuItems = !isLoading && role && filteredMenuItems.length > 0;
  const showEmptyState = !isLoading && (!role || filteredMenuItems.length === 0);

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 z-50 h-screen bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col",
        isMobile ? "w-80" : "w-64",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b lg:justify-center flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            Menú Principal
          </h2>
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="lg:hidden"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto min-h-0">
          {isLoading ? (
            // Show skeleton loading state while role is being fetched
            Array.from({ length: 5 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="space-y-2">
                <Skeleton className="h-10 w-full" />
              </div>
            ))
          ) : hasMenuItems ? (
            // Show menu items when loaded and available
            filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.id === activeItemId;

              return (
                <Button
                  key={item.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start text-left",
                    isActive && "bg-gray-100"
                  )}
                  onClick={() => handleItemClick(item)}
                >
                  <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Button>
              );
            })
          ) : showEmptyState ? (
            // Show empty state when no role or no items
            <div className="text-center text-sm text-gray-500 py-4">
              <p className="mb-2">No hay opciones disponibles</p>
              {!role && (
                <p className="text-xs text-gray-400">
                  No se pudo determinar el rol de usuario
                </p>
              )}
            </div>
          ) : null}
        </nav>
        
        {/* Footer */}
        <div className="p-4 border-t flex-shrink-0">
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : role ? (
            <div className="bg-gray-50 rounded-lg p-3 text-center border shadow-sm">
              <p className="text-xs text-gray-500 mb-1">Rol actual:</p>
              <p className="text-sm font-medium text-gray-900">
                {getRoleLabel(role)}
              </p>
            </div>
          ) : (
            <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
              <p className="text-xs text-red-600">Sin rol asignado</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;
