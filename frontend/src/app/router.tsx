import type { ComponentType } from "react";
import { createBrowserRouter, type RouteObject } from "react-router";
import { RouteFallback } from "@/components/route-fallback";
import { RequireRole } from "@/components/require-role";
import { AdminLayout } from "@/layouts/admin-layout";
import { ReaderLayout } from "@/layouts/reader-layout";
import NotFoundPage from "@/pages/not-found";
import BibliotecaPage from "@/components/BibliotecaPage.jsx";

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
        element: (
          <RequireRole role="reader">
            <ReaderLayout />
          </RequireRole>
        ),
        children: [
          { path: "user", lazy: page(() => import("@/pages/reader/catalog")) },
          { path: "loan", lazy: page(() => import("@/pages/reader/loans")) },
        ],
      },
      {
        element: (
          <RequireRole role="operator">
            <AdminLayout />
          </RequireRole>
        ),
        children: [
          { path: "admin", lazy: page(() => import("@/pages/admin/overview")) },
          { path: "admin/books", lazy: page(() => import("@/pages/admin/books")) },
          { path: "library", element: <BibliotecaPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
