import Link from "next/link";

const links = [
  { href: "/#ultimatum", label: "Ultimatum" },
  { href: "/#seven", label: "The Seven" },
  { href: "/#operator", label: "Operator" },
  { href: "/#system", label: "System" },
];

export function Nav() {
  return (
    <div
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{
        borderColor: "rgba(140,122,79,.22)",
        background: "rgba(10,10,10,.74)",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full border text-xs font-semibold tracking-[0.2em]"
            style={{ borderColor: "#8C7A4F", color: "#8C7A4F" }}
          >
            SVVR
          </div>
          <div>
            <div
              className="text-sm tracking-[0.38em]"
              style={{ color: "#8C7A4F" }}
            >
              SURVIVORS
            </div>
            <div className="text-[10px] uppercase tracking-[0.32em] text-white/50">
              888 on Ethereum
            </div>
          </div>
        </Link>

        <div
          className="hidden items-center gap-8 text-sm md:flex"
          style={{ color: "rgba(232,228,220,.84)" }}
        >
          {links.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-white transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/apply"
            className="rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: "#7A0F14", color: "#E8E4DC" }}
          >
            Applications
          </Link>
        </div>
      </div>
    </div>
  );
}
