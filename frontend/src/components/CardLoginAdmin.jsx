import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiUrl } from "../config/api";

function CardLoginAdmin() {
  const [userLogin, setUserLogin] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(apiUrl("/auth/loginAdmin"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userLogin, password }),
      });

      if (!response.ok) {
        throw new Error("Invalid login or password.");
      }

      const data = await response.json();
      localStorage.setItem("libraryManagerToken", data.result);
      alert("Login bem-sucedido!");
      navigate("/admin");
    } catch (error) {
      console.error("Erro ao realizar login:", error);
      alert("Erro ao realizar login. Tente novamente.");
    }
  };

  return (
    <div className="bg-spring-green shadow-lg border-2 border-green-500 p-10 max-w-lg mx-auto aspect-[4/3] flex flex-col gap-8 font-chakraPetch justify-center rounded-md">
      <form className="flex flex-col gap-3" onSubmit={handleLogin}>
        <label className="text-2xl">Usuario</label>
        <input
          type="text"
          className="bg-white rounded-lg block w-full border border-black"
          value={userLogin}
          onChange={(event) => setUserLogin(event.target.value)}
        />
        <label className="text-2xl">Senha</label>
        <input
          type="password"
          className="bg-white rounded-lg block w-full border border-black"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="flex items-center justify-between mt-6">
          <Link to="/registerAdmin">
            <button type="button" className="underline text-sm">
              Nao possuo cadastro
            </button>
          </Link>
          <button type="button" className="underline text-sm">
            Preciso de ajuda
          </button>
        </div>
        <button
          type="submit"
          className="bg-white text-black border border-black hover:bg-black hover:text-white transition-all py-2 px-4 rounded-lg"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}

export default CardLoginAdmin;
