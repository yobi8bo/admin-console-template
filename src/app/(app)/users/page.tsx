"use client";

import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
};

type UsersResponse = {
  data: { items: UserRow[]; total: number; page: number; pageSize: number };
};

type CreateUserValues = {
  email: string;
  name?: string;
  password: string;
};

type UpdateUserValues = {
  email?: string;
  name?: string;
  password?: string;
};

export default function UsersPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);

  const [createForm] = Form.useForm<CreateUserValues>();
  const [editForm] = Form.useForm<UpdateUserValues>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        q,
      });
      const response = await fetch(`/api/users?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        message.error("加载失败");
        return;
      }
      const json = (await response.json()) as UsersResponse;
      setItems(json.data.items);
      setTotal(json.data.total);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<UserRow> = useMemo(
    () => [
      { title: "邮箱", dataIndex: "email" },
      { title: "姓名", dataIndex: "name", render: (v) => v ?? "-" },
      {
        title: "创建时间",
        dataIndex: "createdAt",
        render: (v: string) => new Date(v).toLocaleString(),
      },
      {
        title: "操作",
        key: "actions",
        render: (_, record) => (
          <Space>
            <Button
              onClick={() => {
                setEditing(record);
                editForm.setFieldsValue({
                  email: record.email,
                  name: record.name ?? undefined,
                });
              }}
            >
              编辑
            </Button>
            <Button
              danger
              onClick={async () => {
                Modal.confirm({
                  title: "确认删除？",
                  content: record.email,
                  okText: "删除",
                  cancelText: "取消",
                  okButtonProps: { danger: true },
                  onOk: async () => {
                    const resp = await fetch(`/api/users/${record.id}`, {
                      method: "DELETE",
                    });
                    if (!resp.ok) {
                      message.error("删除失败");
                      return;
                    }
                    message.success("已删除");
                    await load();
                  },
                });
              }}
            >
              删除
            </Button>
          </Space>
        ),
      },
    ],
    [editForm, load]
  );

  return (
    <div style={{ maxWidth: 1100, marginInline: "auto" }}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        用户
      </Typography.Title>

      <Card bordered>
        <Space style={{ marginBottom: 12, width: "100%" }} wrap>
          <Input
            placeholder="按邮箱/姓名搜索"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onPressEnter={async () => {
              setPage(1);
              await load();
            }}
            style={{ width: 260 }}
          />
          <Button
            onClick={async () => {
              setPage(1);
              await load();
            }}
          >
            搜索
          </Button>
          <Button
            type="primary"
            onClick={() => {
              createForm.resetFields();
              setCreateOpen(true);
            }}
          >
            新建用户
          </Button>
        </Space>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
        />
      </Card>

      <Modal
        title="新建用户"
        open={createOpen}
        okText="创建"
        cancelText="取消"
        onCancel={() => setCreateOpen(false)}
        onOk={async () => {
          const values = await createForm.validateFields();
          const resp = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          });
          if (resp.status === 409) {
            message.error("邮箱已存在");
            return;
          }
          if (!resp.ok) {
            message.error("创建失败");
            return;
          }
          message.success("已创建");
          setCreateOpen(false);
          await load();
        }}
      >
        <Form form={createForm} layout="vertical" requiredMark={false}>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: "请输入邮箱" },
              { type: "email", message: "邮箱格式不正确" },
            ]}
          >
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item label="姓名" name="name">
            <Input />
          </Form.Item>
          <Form.Item
            label="初始密码"
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑用户"
        open={!!editing}
        okText="保存"
        cancelText="取消"
        onCancel={() => setEditing(null)}
        onOk={async () => {
          if (!editing) return;
          const values = await editForm.validateFields();
          const resp = await fetch(`/api/users/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          });
          if (resp.status === 409) {
            message.error("邮箱已存在");
            return;
          }
          if (!resp.ok) {
            message.error("保存失败");
            return;
          }
          message.success("已保存");
          setEditing(null);
          await load();
        }}
      >
        <Form form={editForm} layout="vertical" requiredMark={false}>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[{ type: "email", message: "邮箱格式不正确" }]}
          >
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item label="姓名" name="name">
            <Input />
          </Form.Item>
          <Form.Item label="重置密码" name="password">
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
