"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const hasToken = window.localStorage.getItem("sa_access_token");
    router.replace(hasToken ? "/dashboard" : "/login");
  }, [router]);

  return null;
}
