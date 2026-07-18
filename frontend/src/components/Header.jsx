import BrandLogo from "./BrandLogo";

function Header() {
  return (
    <header className="flex justify-center items-center px-4 py-3 bg-spring-green border-b-2 border-rich-black shadow-sm">
      <BrandLogo className="text-4xl sm:text-5xl md:text-6xl" />
    </header>
  );
}

export default Header;
