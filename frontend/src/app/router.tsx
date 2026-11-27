import type { ComponentType } from "react";
import { createBrowserRouter, type RouteObject } from "react-router";
import { RouteFallback } from "@/components/route-fallback";
import { RequireRole } from "@/components/require-role";
import NotFoundPage from "@/pages/not-found";

const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({ Component: (await load()).default });

const publicRoutes: RouteObject[] = [
  { index: true, lazy: page(() => import("@/pages/landing")) },
  { path: "home", lazy: page(() => import("@/pages/landing")) },
  {
    path: "loginUser",
    lazy: async () => {
      const { default: LoginPage } = await import("@/pages/login");
      return { Component: () => <LoginPage role="reader" /> };
    },
  },
  {
    path: "loginAdmin",
    lazy: async () => {
      const { default: LoginPage } = await import("@/pages/login");
      return { Component: () => <LoginPage role="operator" /> };
    },
  },
  { path: "registerUser", lazy: page(() => import("@/pages/register-reader")) },
  { path: "registerAdmin", lazy: page(() => import("@/pages/register-operator")) },
];

export const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <NotFoundPage />,
    HydrateFallback: RouteFallback,
    children: [
      ...publicRoutes,
      {
        lazy: async () => {
          const { ReaderLayout } = await import("@/layouts/reader-layout");
          return {
            Component: () => (
              <RequireRole role="reader">
                <ReaderLayout />
              </RequireRole>
            ),
          };
        },
        children: [
          { path: "user", lazy: page(() => import("@/pages/reader/catalog")) },
          { path: "loan", lazy: page(() => import("@/pages/reader/loans")) },
        ],
      },
      {
        lazy: async () => {
          const { AdminLayout } = await import("@/layouts/admin-layout");
          return {
            Component: () => (
              <RequireRole role="operator">
                <AdminLayout />
              </RequireRole>
            ),
          };
        },
        children: [
          { path: "admin", lazy: page(() => import("@/pages/admin/overview")) },
          { path: "admin/books", lazy: page(() => import("@/pages/admin/books")) },
          { path: "library", lazy: page(() => import("@/pages/admin/inventory")) },
          { path: "admin/libraries", lazy: page(() => import("@/pages/admin/libraries")) },
          { path: "admin/loans", lazy: page(() => import("@/pages/admin/loans")) },
          { path: "admin/readers", lazy: page(() => import("@/pages/admin/readers")) },
          { path: "admin/reports", lazy: page(() => import("@/pages/admin/reports")) },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
