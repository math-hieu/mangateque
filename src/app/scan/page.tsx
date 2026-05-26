import { IsbnScanner } from "@/components/IsbnScanner";
import Link from "next/link";

export default function ScanPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="mt-mono text-xs text-muted" style={{ letterSpacing: "0.06em" }}>
            BIBLIOTHÈQUE › SCANNER
          </p>
          <h1 className="mt-2 text-2xl font-medium tracking-tight">Scanner un ISBN</h1>
        </div>
        <Link href="/" className="mt-ghost text-xs">Retour</Link>
      </div>
      <IsbnScanner />
    </div>
  );
}
