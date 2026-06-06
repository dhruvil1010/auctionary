// Reusable labelled text input used across all forms.
export default function Input({ label, type = "text", className = "", ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      )}
      <input
        type={type}
        className={`w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-brand ${className}`}
        {...props}
      />
    </label>
  );
}
