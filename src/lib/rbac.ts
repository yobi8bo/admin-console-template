export function isAdmin(roles: string[] | undefined | null) {
  const list = roles ?? [];
  return (
    list.includes("管理员") ||
    list.includes("admin") ||
    list.includes("ADMIN") ||
    list.includes("Administrator")
  );
}

