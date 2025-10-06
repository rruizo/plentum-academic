
export const getPageTitle = (activeTab: string): string => {
  switch (activeTab) {
    case "student-dashboard": return "Mis Exámenes";
    case "dashboard": return "Dashboard";
    case "courses": return "Gestión de Cursos";
    case "categories": return "Gestión de Categorías";
    case "questions": return "Gestión de Preguntas";
    case "exams": return "Sistema de Exámenes";
    case "psychometric": return "Tests Psicométricos";
    case "analytics": return "Análisis";
    case "users": return "Gestión de Usuarios";
    case "admin": return "Panel de Administración";
    case "supervisors": return "Asignación de Supervisores";
    case "audit": return "Auditoría de Roles y Permisos";
    default: return "Dashboard";
  }
};
