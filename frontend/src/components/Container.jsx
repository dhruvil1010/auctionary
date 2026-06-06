// Centers content and caps its width — used to keep consistent page gutters.
export default function Container({ children, className = "" }) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}
