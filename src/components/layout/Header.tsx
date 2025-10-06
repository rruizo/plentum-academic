
import { Button } from "@/components/ui/button";
import { 
  LogOut,
  UserCircle,
  Menu,
  Database
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeaderProps {
  pageTitle: string;
  logoUrl: string;
  systemName: string;
  onToggleSidebar: () => void;
  onShowSupabaseTest: () => void;
}

const Header = ({ pageTitle, logoUrl, systemName, onToggleSidebar, onShowSupabaseTest }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    console.log('Signing out user');
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="border-b border-border bg-background sticky top-0 z-40">
      <div className="container flex h-14 sm:h-16 items-center justify-between py-2 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Hamburger menu for mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="shrink-0 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img 
              src={logoUrl} 
              alt={systemName}
              className="h-6 w-auto sm:h-8 shrink-0"
            />
            <h1 className="text-responsive-lg font-semibold truncate">
              {pageTitle}
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Welcome message - hidden on mobile */}
          <span className="text-xs text-muted-foreground hidden md:block truncate max-w-32 lg:max-w-none">
            Bienvenido, {user?.email}
          </span>
          
          {/* Mobile compact actions */}
          <div className="flex items-center gap-1 sm:hidden">
            <Button
              onClick={() => navigate('/profile')}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Perfil"
            >
              <UserCircle className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-1 lg:gap-2">
            <Button
              onClick={() => navigate('/profile')}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3"
            >
              <UserCircle className="h-4 w-4" />
              <span className="hidden lg:inline text-xs lg:text-sm">Perfil</span>
            </Button>
            
            <Button
              onClick={handleSignOut}
              variant="outline"
              size="sm"
              className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden lg:inline text-xs lg:text-sm">Salir</span>
            </Button>
            
            <Button 
              onClick={onShowSupabaseTest} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3"
            >
              <Database className="h-4 w-4" />
              <span className="hidden xl:inline text-xs lg:text-sm">Test DB</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
