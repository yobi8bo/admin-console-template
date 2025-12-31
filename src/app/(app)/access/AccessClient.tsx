"use client";

import { App, Button, Card, Modal, Space, Switch, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  role: { id: string; name: string } | null;
};

type UsersResponse = {
  data: { items: UserRow[]; total: number; page: number; pageSize: number };
};

type AccessItem = {
  key: string;
  label: string;
  path: string;
  adminOnly: boolean;
  alwaysAllow: boolean;
  locked: boolean;
  allowed: boolean;
};

type AccessResponse = {
  data: {
    user: { id: string; email: string };
    items: AccessItem[];
  };
};

export default function AccessClient() {
  const { message } = App.useApp();
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);

  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [accessItems, setAccessItems] = useState<AccessItem[]>([]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch("/api/users?page=1&pageSize=100&q=", {
        cache: "no-store",
      });
      if (!response.ok) {
        message.error("加载用户失败");
        return;
      }
      const json = (await response.json()) as UsersResponse;
      setUsers(json.data.items);
    } finally {
      setLoadingUsers(false);
    }
  }, [message]);

  const loadAccess = useCallback(
    async (userId: string) => {
      setLoadingAccess(true);
      try {
        const response = await fetch(`/api/access?userId=${encodeURIComponent(userId)}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          message.error("加载权限失败");
          return;
        }
        const json = (await response.json()) as AccessResponse;
        setAccessItems(json.data.items);
      } finally {
        setLoadingAccess(false);
      }
    },
    [message]
  );

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const columns: ColumnsType<UserRow> = useMemo(
    () => [
      { title: "邮箱", dataIndex: "email" },
      { title: "姓名", dataIndex: "name", render: (v) => v ?? "-" },
      { title: "角色", dataIndex: "role", render: (r) => r?.name ?? "-" },
      {
        title: "操作",
        key: "actions",
        render: (_, record) => (
          <Button
            onClick={async () => {
              setEditingUser(record);
              await loadAccess(record.id);
            }}
          >
            配置权限
          </Button>
        ),
      },
    ],
    [loadAccess]
  );

  const visibleItems = accessItems.filter((i) => !i.alwaysAllow);

  return (
    <div style={{ maxWidth: 1100, marginInline: "auto" }}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        权限配置
      </Typography.Title>

      <Card variant="outlined">
        <Table
          rowKey="id"
          loading={loadingUsers}
          columns={columns}
          dataSource={users}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingUser ? `配置权限：${editingUser.email}` : "配置权限"}
        open={!!editingUser}
        onCancel={() => {
          setEditingUser(null);
          setAccessItems([]);
        }}
        footer={
          <Space>
            <Button
              onClick={() => {
                setEditingUser(null);
                setAccessItems([]);
              }}
            >
              关闭
            </Button>
          </Space>
        }
      >
        <div style={{ display: "grid", gap: 12 }}>
          {visibleItems.map((item) => (
            <div
              key={item.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: 12,
                border: "1px solid #f0f0f0",
                borderRadius: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{item.label}</div>
                <div style={{ color: "rgba(0,0,0,0.45)" }}>{item.path}</div>
              </div>
              <Switch
                checked={item.allowed}
                disabled={loadingAccess || item.locked}
                onChange={async (checked) => {
                  if (!editingUser) return;
                  setAccessItems((prev) =>
                    prev.map((p) => (p.key === item.key ? { ...p, allowed: checked } : p))
                  );
                  const resp = await fetch(
                    `/api/access?userId=${encodeURIComponent(editingUser.id)}`,
                    {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ pageKey: item.key, allowed: checked }),
                    }
                  );
                  if (!resp.ok) {
                    message.error("保存失败");
                    setAccessItems((prev) =>
                      prev.map((p) =>
                        p.key === item.key ? { ...p, allowed: !checked } : p
                      )
                    );
                    return;
                  }
                  message.success("已保存");
                }}
              />
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

