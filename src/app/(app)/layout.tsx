"use client";

import {
  DashboardOutlined,
  KeyOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, Typography } from "antd";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useState } from "react";

const { Header, Content, Sider } = Layout;

export default function AppLayout({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();

  const selectedKeys = [pathname === "/" ? "/dashboard" : pathname];
  const [allowedKeys, setAllowedKeys] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (session.status !== "authenticated") return;
    (async () => {
      const resp = await fetch("/api/me/pages", { cache: "no-store" });
      if (!resp.ok) return;
      const json = (await resp.json()) as { data: { keys: string[] } };
      if (cancelled) return;
      setAllowedKeys(json.data.keys);
    })();
    return () => {
      cancelled = true;
    };
  }, [session.status]);

  const menuItems = useMemo(() => {
    const can = (key: string) => (allowedKeys ? allowedKeys.includes(key) : false);
    return [
      {
        key: "/dashboard",
        icon: <DashboardOutlined />,
        label: <Link href="/dashboard">仪表盘</Link>,
      },
      ...(can("users")
        ? [
            {
              key: "/users",
              icon: <TeamOutlined />,
              label: <Link href="/users">用户</Link>,
            },
          ]
        : []),
      ...(can("roles")
        ? [
            {
              key: "/roles",
              icon: <SafetyCertificateOutlined />,
              label: <Link href="/roles">角色</Link>,
            },
          ]
        : []),
      ...(can("access")
        ? [
            {
              key: "/access",
              icon: <KeyOutlined />,
              label: <Link href="/access">权限</Link>,
            },
          ]
        : []),
    ];
  }, [allowedKeys]);

  return (
    <Layout style={{ minHeight: "100dvh" }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div style={{ padding: 16 }}>
          <Typography.Title level={4} style={{ margin: 0, color: "#fff" }}>
            Admin
          </Typography.Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fff",
            paddingInline: 16,
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Typography.Text type="secondary">
            {session.data?.user?.email ?? ""}
          </Typography.Text>
          <Button
            icon={<LogoutOutlined />}
            onClick={async () => {
              await signOut({ redirect: false });
              router.push("/login");
            }}
          >
            退出
          </Button>
        </Header>

        <Content style={{ padding: 16 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
