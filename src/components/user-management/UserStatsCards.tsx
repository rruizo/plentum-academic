
import { Card, CardContent } from "@/components/ui/card";
import { User } from "@/hooks/useUserManagement";

interface UserStatsCardsProps {
  users: User[];
}

const UserStatsCards = ({ users }: UserStatsCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold">{users.length}</div>
          <p className="text-sm text-muted-foreground">Total de usuarios</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold">{users.filter(u => u.role === 'teacher').length}</div>
          <p className="text-sm text-muted-foreground">Usuarios Instructor</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold">{users.filter(u => u.role === 'student').length}</div>
          <p className="text-sm text-muted-foreground">Usuarios Evaluado</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="text-2xl font-bold">{users.filter(u => u.role === 'supervisor').length}</div>
          <p className="text-sm text-muted-foreground">Supervisores</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserStatsCards;
