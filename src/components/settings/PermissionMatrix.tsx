import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import {
  usePermissions,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  CONFIGURABLE_ROLES,
  type PermissionKey,
} from '@/hooks/use-permissions';

export function PermissionMatrix() {
  const { loading, getPermissionForRole, setPermission } = usePermissions();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Права доступа</CardTitle>
        <CardDescription>Настройте права для каждой роли. Администратор всегда имеет полный доступ.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Разрешение</th>
                {CONFIGURABLE_ROLES.map(role => (
                  <th key={role.key} className="text-center py-2 px-3 font-medium">
                    {role.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_GROUPS.map(group => (
                <GroupRows
                  key={group.key}
                  group={group}
                  getPermissionForRole={getPermissionForRole}
                  setPermission={setPermission}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function GroupRows({
  group,
  getPermissionForRole,
  setPermission,
}: {
  group: typeof PERMISSION_GROUPS[number];
  getPermissionForRole: (role: string, permission: string) => boolean;
  setPermission: (role: string, permission: string, granted: boolean) => Promise<void>;
}) {
  return (
    <>
      <tr>
        <td colSpan={CONFIGURABLE_ROLES.length + 1} className="pt-4 pb-1">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {group.label}
          </span>
        </td>
      </tr>
      {group.permissions.map(perm => (
        <tr key={perm} className="border-b last:border-0">
          <td className="py-2 pr-4 text-sm">
            {PERMISSION_LABELS[perm as PermissionKey]}
          </td>
          {CONFIGURABLE_ROLES.map(role => {
            const granted = getPermissionForRole(role.key, perm);
            return (
              <td key={role.key} className="text-center py-2 px-3">
                <Switch
                  checked={granted}
                  onCheckedChange={(checked) => setPermission(role.key, perm, checked)}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
