import Image from "next/image";

export function BrandLogo({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`brand-logo${inverse ? " brand-logo--inverse" : ""}`}>
      <Image
        className="brand-logo-mark"
        src="/brand/primoria-mark.svg"
        width={80}
        height={88}
        alt=""
        aria-hidden="true"
        loading="eager"
        unoptimized
      />
      <span>Primoria</span>
    </span>
  );
}
