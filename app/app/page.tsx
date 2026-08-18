"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import RoleWelcomeCard from "./RoleWelcomeCard";

/**
 * App home page – hiển thị hero tùy theo vai trò người dùng.
 * Thay đổi giá trị `role` bằng việc lấy từ session/auth khi tích hợp thực tế.
 */
export default async function AppHome() {
  // TODO: Thay bằng dữ liệu thực tế (session, JWT, query param …)
  const role: "owner" | "reviewer" | "contributor" = "reviewer";

  return (
    <div className="mx-auto flex max-w-[1320px] flex-col px-6 py-10 md:py-12 gap-8">
      {/* Hero dựa trên vai trò */}
      <RoleWelcomeCard role={role} />

      {/* Nội dung phụ – vẫn giữ phần mô tả chung */}
      <div className="flex min-h-[200px] items-center justify-center bg-slate-900 text-white p-6 rounded-[1.5rem]">
        <h2 className="text-2xl font-medium">
          Đây là trang chính của ứng dụng sau khi bạn nhấn “Launch App”.
        </h2>
        <Button asChild variant="secondary" className="ml-4">
          <Link href="/">Quay lại Landing</Link>
        </Button>
      </div>
    </div>
  );
}
