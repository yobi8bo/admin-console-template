"use client";

import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Select,
  Table,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";

type RoleRow = {
  id: string;
  name: string;
  description: "用户" | "管理员" | null;
  createdAt: string;
};

type RolesResponse = {
  data: { items: RoleRow[]; total: number; page: number; pageSize: number };
};

type CreateRoleValues = {
  name: string;
  description?: "用户" | "管理员";
};

type UpdateRoleValues = {
  name?: string;
  description?: "用户" | "管理员";
};

export default function RolesClient() {
  const { message, modal } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<RoleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);

  const [createForm] = Form.useForm<CreateRoleValues>();
  const [editForm] = Form.useForm<UpdateRoleValues>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        q,
      });
      const response = await fetch(`/api/roles?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        message.error("加载失败");
        return;
      }
      const json = (await response.json()) as RolesResponse;
      setItems(json.data.items);
      setTotal(json.data.total);
    } finally {
      setLoading(false);
    }
  }, [message, page, pageSize, q]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<RoleRow> = useMemo(
    () => [
      { title: "名称", dataIndex: "name" },
      {
        title: "描述",
        dataIndex: "description",
        render: (v) => v ?? "-",
      },
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
                  name: record.name,
                  description: record.description ?? undefined,
                });
              }}
            >
              编辑
            </Button>
            <Button
              danger
              onClick={() => {
                modal.confirm({
                  title: "确认删除？",
                  content: record.name,
                  okText: "删除",
                  cancelText: "取消",
                  okButtonProps: { danger: true },
                  onOk: async () => {
                    const resp = await fetch(`/api/roles/${record.id}`, {
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
    [editForm, load, message, modal]
  );

  return (
    <div style={{ maxWidth: 1100, marginInline: "auto" }}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        角色
      </Typography.Title>

      <Card variant="outlined">
        <Space style={{ marginBottom: 12, width: "100%" }} wrap>
          <Input
            placeholder="按名称/描述搜索"
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
            新建角色
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
        title="新建角色"
        open={createOpen}
        okText="创建"
        cancelText="取消"
        onCancel={() => setCreateOpen(false)}
        onOk={async () => {
          const values = await createForm.validateFields();
          const resp = await fetch("/api/roles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(values),
          });
          if (resp.status === 409) {
            message.error("角色名称已存在");
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
            label="名称"
            name="name"
            rules={[{ required: true, message: "请输入名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Select
              placeholder="选择描述（可选）"
              allowClear
              options={[
                { label: "用户", value: "用户" },
                { label: "管理员", value: "管理员" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="编辑角色"
        open={!!editing}
        okText="保存"
        cancelText="取消"
        onCancel={() => setEditing(null)}
        onOk={async () => {
          if (!editing) return;
          const values = await editForm.validateFields();
          const resp = await fetch(`/api/roles/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...values,
              description: values.description ?? null,
            }),
          });
          if (resp.status === 409) {
            message.error("角色名称已存在");
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
          <Form.Item label="名称" name="name">
            <Input />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Select
              placeholder="选择描述（可选）"
              allowClear
              options={[
                { label: "用户", value: "用户" },
                { label: "管理员", value: "管理员" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
