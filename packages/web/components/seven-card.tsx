import Image from "next/image";

type Revealed = {
  kind: "revealed";
  index: number;
  title: string;
  tagline: string;
  image: string;
};

type Sealed = {
  kind: "sealed";
  index: number;
};

export type SevenEntry = Revealed | Sealed;

export function SevenCard({ entry }: { entry: SevenEntry }) {
  const idxLabel = `0${entry.index + 1}`;

  if (entry.kind === "sealed") {
    return (
      <div
        className="group relative overflow-hidden rounded-[1.75rem] border transition-transform duration-300 hover:-translate-y-1"
        style={{
          borderColor: "rgba(140,122,79,.2)",
          background: "rgba(10,10,10,.56)",
        }}
      >
        <div
          className="relative aspect-square w-full"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(122,15,20,.18), rgba(10,10,10,.9))",
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full border text-[10px] uppercase tracking-[0.35em]"
              style={{ borderColor: "#8C7A4F", color: "#8C7A4F" }}
            >
              Sealed
            </div>
          </div>
        </div>
        <div className="p-6">
          <div
            className="mb-4 text-xs uppercase tracking-[0.3em]"
            style={{ color: "#8C7A4F" }}
          >
            {idxLabel}
          </div>
          <div className="mb-3 text-2xl">Unrevealed</div>
          <div className="text-sm leading-7 text-white/60">
            Two of the Seven remain unseen. Selection does not show itself all at once.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group relative overflow-hidden rounded-[1.75rem] border transition-transform duration-300 hover:-translate-y-1"
      style={{
        borderColor: "rgba(140,122,79,.2)",
        background:
          entry.index % 2 === 0 ? "rgba(10,10,10,.56)" : "rgba(28,34,51,.28)",
      }}
    >
      <div className="relative aspect-square w-full overflow-hidden">
        <Image
          src={entry.image}
          alt={entry.title}
          fill
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 44vw, 90vw"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          priority={entry.index < 3}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,10,10,0) 55%, rgba(10,10,10,.85) 100%)",
          }}
        />
      </div>
      <div className="p-6">
        <div
          className="mb-4 text-xs uppercase tracking-[0.3em]"
          style={{ color: "#8C7A4F" }}
        >
          {idxLabel}
        </div>
        <div className="mb-3 text-2xl">{entry.title}</div>
        <div className="text-sm leading-7 text-white/68">{entry.tagline}</div>
      </div>
    </div>
  );
}
