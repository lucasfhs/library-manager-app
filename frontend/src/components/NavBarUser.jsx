import { User, LogOut } from "lucide-react";
import BrandLogo from "./BrandLogo";

function NavBarUser() {
  return (
    <nav className="bg-spring-green border-2 border-rich-black px-6 py-4 flex justify-between items-center">
      {/* Logo e Título */}
      <BrandLogo className="text-2xl lg:text-3xl" />

      {/* Navegação Central */}
      <div className="flex gap-8 font-semibold text-rich-black text-lg">
        <button className="hover:underline">Consultar Catálogo</button>
        <button className="hover:underline">Empréstimos Ativos</button>
      </div>

      {/* Usuário e Logout */}
      <div className="flex items-center gap-4 text-rich-black">
        <div className="flex items-center gap-2">
          <User size={24} />
          <span>Obi Wan Kenobi</span>
        </div>
        <button className="flex items-center gap-2 font-semibold hover:text-india-green transition">
          <LogOut size={24} />
          Deslogar
        </button>
      </div>
    </nav>
  );
}

export default NavBarUser;
