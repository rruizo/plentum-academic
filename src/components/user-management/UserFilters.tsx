
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface UserFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  roleFilter: string;
  setRoleFilter: (role: string) => void;
  examFilter: string;
  setExamFilter: (filter: string) => void;
  companyFilter: string;
  setCompanyFilter: (company: string) => void;
  areaFilter: string;
  setAreaFilter: (area: string) => void;
  sectionFilter: string;
  setSectionFilter: (section: string) => void;
  reportContactFilter: string;
  setReportContactFilter: (contact: string) => void;
  companies: string[];
  areas: string[];
  sections: string[];
  reportContacts: string[];
}

const UserFilters = ({ 
  searchTerm, setSearchTerm, 
  roleFilter, setRoleFilter, 
  examFilter, setExamFilter,
  companyFilter, setCompanyFilter,
  areaFilter, setAreaFilter,
  sectionFilter, setSectionFilter,
  reportContactFilter, setReportContactFilter,
  companies, areas, sections, reportContacts
}: UserFiltersProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar usuarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            <SelectItem value="admin">Administradores</SelectItem>
            <SelectItem value="teacher">Usuarios Instructor</SelectItem>
            <SelectItem value="student">Usuarios Evaluado</SelectItem>
            <SelectItem value="supervisor">Supervisores</SelectItem>
          </SelectContent>
        </Select>
        <Select value={examFilter} onValueChange={setExamFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por examen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los usuarios</SelectItem>
            <SelectItem value="with_reliability">Con examen de confiabilidad</SelectItem>
            <SelectItem value="without_reliability">Sin examen de confiabilidad</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center space-x-4">
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las empresas</SelectItem>
            {companies.filter(company => company && company.trim() !== '').map(company => (
              <SelectItem key={company} value={company || 'unknown'}>{company}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las áreas</SelectItem>
            {areas.filter(area => area && area.trim() !== '').map(area => (
              <SelectItem key={area} value={area || 'unknown'}>{area}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por sección" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las secciones</SelectItem>
            {sections.filter(section => section && section.trim() !== '').map(section => (
              <SelectItem key={section} value={section || 'unknown'}>{section}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={reportContactFilter} onValueChange={setReportContactFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por contacto de reporte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los contactos</SelectItem>
            {reportContacts.filter(contact => contact && contact.trim() !== '').map(contact => (
              <SelectItem key={contact} value={contact || 'unknown'}>{contact}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default UserFilters;
