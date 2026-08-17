"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AppHome() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 text-white p-6">
      <h1 className="text-4xl font-bold mb-4">SettleFlow App</h1>
      <p className="mb-8 max-w-xl text-center">
        Đây là trang chính của ứng dụng sau khi bạn nhấn “Launch App”. Bạn có thể mở rộng tại đây với dashboard, biểu đồ, hoặc các tính năng khác.
      </p>
      <Button asChild variant="secondary">
        <Link href="/">Quay lại Landing</Link>
      </Button>
    </div>
  );
}
