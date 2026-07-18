import NavBar from "./components/Header";
import { Outlet } from "react-router-dom";
import "./App.css";

function App() {
  return (
    <>
      <div className="flex justify-center items-center">
        <h1 className="text-3xl text-gray-900 bg-slate-200 p-6">
          Library Manager
        </h1>
      </div>
      <Outlet></Outlet>
      <NavBar></NavBar>
      <p>Footer</p>
    </>
  );
}

export default App;
