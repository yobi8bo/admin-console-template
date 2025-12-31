"use client";

import { Card, Col, Row, Statistic, Typography } from "antd";
import { useEffect, useState } from "react";

type Stats = {
  usersTotal: number;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await fetch("/api/users?page=1&pageSize=1", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const json = (await response.json()) as {
        data: { total: number };
      };
      if (cancelled) return;
      setStats({ usersTotal: json.data.total });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ maxWidth: 1100, marginInline: "auto" }}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        仪表盘
      </Typography.Title>
      <Row gutter={16}>
        <Col xs={24} sm={12} md={8}>
          <Card bordered>
            <Statistic
              title="用户总数"
              value={stats?.usersTotal ?? 0}
              loading={!stats}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

