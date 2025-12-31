// 파일 경로: src/app/layout.tsx
// SilverBridge - 루트 레이아웃

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "실버브릿지 - SilverBridge",
  description: "어르신을 위한 디지털 연결 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
