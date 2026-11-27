import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import "./index.css";
import ErrorPage from "./routes/ErrorPage.jsx";
import LoginUser from "./pages/LoginUser.jsx";
import LoginAdmin from "./pages/LoginAdmin.jsx";
import RegisterUser from "./pages/RegisterUser.jsx";
import RegisterAdmin from "./pages/RegisterAdmin.jsx";
import UserMainPage from "./pages/UserMainPage.jsx";
import AdminMainPage from "./pages/AdminMainPage.jsx";
import BibliotecaPage from "./components/BibliotecaPage.jsx";
import UserLoanHistory from "./pages/UserLoanHistory.jsx";
import LandingPage from "./pages/LandingPage.jsx";
const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage></LandingPage>,
    errorElement: <ErrorPage></ErrorPage>,
  },
  {
    path: "/loginUser",
    element: <LoginUser></LoginUser>,
  },
  {
    path: "/loginAdmin",
    element: <LoginAdmin></LoginAdmin>,
  },
  {
    path: "/registerUser",
    element: <RegisterUser></RegisterUser>,
  },
  {
    path: "/registerAdmin",
    element: <RegisterAdmin></RegisterAdmin>,
  },
  {
    path: "/user",
    element: <UserMainPage></UserMainPage>,
  },
  {
    path: "/admin",
    element: <AdminMainPage></AdminMainPage>,
  },
  {
    path: "/loan",
    element: <UserLoanHistory></UserLoanHistory>,
  },
  {
    path: "/home",
    element: <LandingPage></LandingPage>,
  },
  {
    path: "/library",
    element: <BibliotecaPage></BibliotecaPage>,
  },
]);
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RouterProvider router={router}></RouterProvider>
  </StrictMode>
);
