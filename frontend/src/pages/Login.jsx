import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { loginUser } from "../api/auth.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Container, Input, Button } from "../components";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // If we were redirected here from a protected page, go back there after login.
  const from = location.state?.from || "/";

  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // The backend accepts email OR username — pick based on what was typed.
      const payload = form.identifier.includes("@")
        ? { email: form.identifier, password: form.password }
        : { username: form.identifier, password: form.password };

      const res = await loginUser(payload);
      login(res.data.data); // { user, accessToken, refreshToken }
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="font-heading text-3xl font-bold text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-ink/60">Log in to bid and sell.</p>

        {error && (
          <div className="mt-4 rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Input
            label="Email or username"
            name="identifier"
            value={form.identifier}
            onChange={onChange}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            name="password"
            value={form.password}
            onChange={onChange}
            placeholder="••••••••"
            required
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/60">
          New here?{" "}
          <Link to="/register" className="font-semibold text-brand hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </Container>
  );
}
