import Link from "next/link";

export function BrandMark() {
  return (
    <Link href="/" className="inline-flex items-center gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2d6b6a_0%,#88b7b5_100%)] text-sm font-bold tracking-[0.28em] text-white">
        ME
      </div>
      <div>
        <p className="font-[family:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--color-text)]">
          MedElite Academy
        </p>
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--color-text-subtle)]">Medical Education</p>
      </div>
    </Link>
  );
}
