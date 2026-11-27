import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { Providers } from "@/app/providers";
import "./index.css";
import AdminMainPage from "./pages/AdminMainPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import LoginAdmin from "./pages/LoginAdmin.jsx";
import LoginUser from "./pages/LoginUser.jsx";
import NotFoundPage from "./pages/not-found";
import RegisterAdmin from "./pages/RegisterAdmin.jsx";
import RegisterUser from "./pages/RegisterUser.jsx";
import UserLoanHistory from "./pages/UserLoanHistory.jsx";
import UserMainPage from "./pages/UserMainPage.jsx";
import BibliotecaPage from "./components/BibliotecaPage.jsx";

const router = createBrowserRouter([
  { path: "/", element: <LandingPage />, errorElement: <NotFoundPage /> },
  { path: "/home", element: <LandingPage /> },
  { path: "/loginUser", element: <LoginUser /> },
  { path: "/loginAdmin", element: <LoginAdmin /> },
  { path: "/registerUser", element: <RegisterUser /> },
  { path: "/registerAdmin", element: <RegisterAdmin /> },
  { path: "/user", element: <UserMainPage /> },
  { path: "/admin", element: <AdminMainPage /> },
  { path: "/loan", element: <UserLoanHistory /> },
  { path: "/library", element: <BibliotecaPage /> },
  { path: "*", element: <NotFoundPage /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>
);
