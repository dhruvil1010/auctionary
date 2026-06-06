// Reusable button with a few visual variants.
export default function Button({
  children,
  type = "button",
  variant = "brand",
  className = "",
  ...props
}) {
  const variants = {
    brand: "bg-brand text-white hover:opacity-90",
    accent: "bg-accent text-white hover:opacity-90",
    outline: "border border-border bg-surface text-ink hover:bg-page",
  };
  return (
    <button
      type={type}
      className={`rounded-full px-5 py-2.5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
