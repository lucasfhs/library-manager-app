function BrandLogo({ className = "" }) {
  return (
    <span
      className={`inline-flex items-baseline gap-[0.22em] whitespace-nowrap text-rich-black font-playfair leading-none ${className}`}
      aria-label="Library Manager"
    >
      <span className="font-bold tracking-[-0.045em]">Library</span>
      <span className="font-medium italic tracking-[-0.035em]">Manager</span>
    </span>
  );
}

export default BrandLogo;
