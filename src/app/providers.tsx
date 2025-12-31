"use client";

import { App, ConfigProvider, theme } from "antd";
import type { PropsWithChildren } from "react";
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: PropsWithChildren) {
  return (
    <SessionProvider>
      <ConfigProvider
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: { borderRadius: 10 },
        }}
      >
        <App>{children}</App>
      </ConfigProvider>
    </SessionProvider>
  );
}
