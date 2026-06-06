import { Link } from "react-router-dom";
import { Container } from "../components";

export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <p className="font-heading text-6xl font-bold text-brand">404</p>
      <p className="mt-2 text-ink/70">This page doesn&apos;t exist.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-white hover:opacity-90"
      >
        Back home
      </Link>
    </Container>
  );
}
