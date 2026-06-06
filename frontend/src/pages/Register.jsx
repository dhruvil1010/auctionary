import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser, loginUser } from "../api/auth.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Container, Input, Button } from "../components";

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await registerUser(form);
      // Auto-login right after a successful signup so the user lands signed-in.
      const res = await loginUser({ email: form.email, password: form.password });
      login(res.data.data);
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="font-heading text-3xl font-bold text-ink">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          Buy and sell — one account does both.
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Input
            label="Username"
            name="username"
            value={form.username}
            onChange={onChange}
            placeholder="janedoe"
            required
          />
          <Input
            label="Email"
            type="email"
            name="email"
            value={form.email}
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
            placeholder="At least 6 characters"
            required
            minLength={6}
          />
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating…" : "Sign up"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/60">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </Container>
  );
}
