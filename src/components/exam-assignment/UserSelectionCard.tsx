
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Users } from 'lucide-react';

interface User {
  id: string;
  full_name: string;
  email: string;
  company: string;
  area: string;
  section: string;
  role: string;
}

interface UserSelectionCardProps {
  users: User[];
  selectedUsers: string[];
  onUserSelection: (userId: string, checked: boolean) => void;
  onSelectAll: () => void;
  loading: boolean;
}

const UserSelectionCard = ({
  users,
  selectedUsers,
  onUserSelection,
  onSelectAll,
  loading
}: UserSelectionCardProps) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Cargando usuarios...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all"
            checked={selectedUsers.length === users.length && users.length > 0}
            onCheckedChange={onSelectAll}
          />
          <label htmlFor="select-all" className="text-sm font-medium">
            Seleccionar todos ({users.length} usuarios)
          </label>
        </div>
        <Badge variant="outline">
          {selectedUsers.length} seleccionados
        </Badge>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedUsers.includes(user.id)}
                onCheckedChange={(checked) => onUserSelection(user.id, checked as boolean)}
              />
              <div>
                <p className="font-medium">{user.full_name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  {user.company} - {user.area} - {user.section}
                </p>
              </div>
            </div>
            <Badge variant="outline">Usuario Evaluado</Badge>
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No hay usuarios evaluados disponibles
          </h3>
          <p className="text-sm text-muted-foreground">
            Crea usuarios con rol "Usuario Evaluado" primero
          </p>
        </div>
      )}
    </div>
  );
};

export default UserSelectionCard;
