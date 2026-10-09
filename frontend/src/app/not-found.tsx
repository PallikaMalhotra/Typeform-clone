import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-center">
      <h1 style={{ margin: 0, color: "var(--text)" }}>Page not found</h1>
      <p style={{ margin: 0 }}>The page you are looking for doesn&apos;t exist or was moved.</p>
      <Link href="/" className="btn btn-primary">
        Back to my workspace
      </Link>
    </div>
  );
}
