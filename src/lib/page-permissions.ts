export type PagePermission = {
  key: string;
  path: string;
  label: string;
  alwaysAllow?: boolean;
  adminOnly?: boolean;
};

export const PAGE_PERMISSIONS: PagePermission[] = [
  { key: "dashboard", path: "/dashboard", label: "仪表盘", alwaysAllow: true },
  { key: "users", path: "/users", label: "用户管理" },
  { key: "roles", path: "/roles", label: "角色管理" },
  { key: "access", path: "/access", label: "权限配置", adminOnly: true },
];

export function matchPageKeyByPath(pathname: string) {
  const sorted = [...PAGE_PERMISSIONS].sort((a, b) => b.path.length - a.path.length);
  return sorted.find((p) => pathname === p.path || pathname.startsWith(`${p.path}/`))
    ?.key;
}
