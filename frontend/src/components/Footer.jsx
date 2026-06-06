import Container from "./Container.jsx";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <Container className="flex flex-col items-center justify-between gap-2 py-8 text-sm text-ink/60 sm:flex-row">
        <p>© {new Date().getFullYear()} Auctionary — a demo auction platform.</p>
        <p>Built with the MERN stack + Socket.io.</p>
      </Container>
    </footer>
  );
}
