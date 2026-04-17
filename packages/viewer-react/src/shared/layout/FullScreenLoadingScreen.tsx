import { useId, type CSSProperties } from 'react';
import { useCoreCopy } from '@/shared/theme/coreCopy';

const bootSplashParticles = [
  { left: '9%', fontSize: '20px', delay: '0.0s', duration: '5.2s', rotation: '7deg', symbol: 'π' },
  { left: '74%', fontSize: '15px', delay: '1.4s', duration: '4.8s', rotation: '-5deg', symbol: '∑' },
  { left: '88%', fontSize: '18px', delay: '2.8s', duration: '5.6s', rotation: '9deg', symbol: '√' },
  { left: '31%', fontSize: '13px', delay: '0.9s', duration: '4.5s', rotation: '-8deg', symbol: '∞' },
  { left: '54%', fontSize: '16px', delay: '3.6s', duration: '5.0s', rotation: '5deg', symbol: 'λ' },
  { left: '18%', fontSize: '12px', delay: '4.8s', duration: '4.6s', rotation: '-6deg', symbol: 'Δ' },
  { left: '44%', fontSize: '14px', delay: '2.1s', duration: '5.4s', rotation: '4deg', symbol: 'φ' },
  { left: '82%', fontSize: '13px', delay: '5.5s', duration: '4.9s', rotation: '-7deg', symbol: '∫' },
  { left: '62%', fontSize: '11px', delay: '1.7s', duration: '5.1s', rotation: '6deg', symbol: 'Ω' },
  { left: '5%', fontSize: '10px', delay: '3.2s', duration: '5.8s', rotation: '-4deg', symbol: 'α' },
] as const;

function BootSplashArtwork() {
  const idPrefix = useId().replace(/:/g, '-');
  const nucleusGradientId = `${idPrefix}-viewer-boot-nucleus-gradient`;
  const haloGradientId = `${idPrefix}-viewer-boot-halo-gradient`;
  const gleamGradientId = `${idPrefix}-viewer-boot-gleam-gradient`;
  const dotGlowId = `${idPrefix}-viewer-boot-dot-glow`;
  const sphereShadowId = `${idPrefix}-viewer-boot-sphere-shadow`;
  const pathAId = `${idPrefix}-viewer-boot-path-a`;
  const pathBId = `${idPrefix}-viewer-boot-path-b`;
  const pathCId = `${idPrefix}-viewer-boot-path-c`;

  return (
    <svg viewBox="0 0 360 360" className="viewer-boot-splash__orrery" aria-hidden="true">
      <defs>
        <radialGradient id={nucleusGradientId} cx="38%" cy="32%" r="68%">
          <stop className="viewer-boot-splash__nucleus-stop viewer-boot-splash__nucleus-stop--1" offset="0%" />
          <stop className="viewer-boot-splash__nucleus-stop viewer-boot-splash__nucleus-stop--2" offset="25%" />
          <stop className="viewer-boot-splash__nucleus-stop viewer-boot-splash__nucleus-stop--3" offset="62%" />
          <stop className="viewer-boot-splash__nucleus-stop viewer-boot-splash__nucleus-stop--4" offset="100%" />
        </radialGradient>
        <radialGradient id={haloGradientId} cx="50%" cy="50%" r="50%">
          <stop className="viewer-boot-splash__halo-stop viewer-boot-splash__halo-stop--1" offset="0%" />
          <stop className="viewer-boot-splash__halo-stop viewer-boot-splash__halo-stop--2" offset="70%" />
          <stop className="viewer-boot-splash__halo-stop viewer-boot-splash__halo-stop--3" offset="100%" />
        </radialGradient>
        <radialGradient id={gleamGradientId} cx="36%" cy="30%" r="54%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <filter id={dotGlowId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={sphereShadowId} x="-40%" y="-30%" width="180%" height="180%">
          <feDropShadow dx="0" dy="7" stdDeviation="9" floodColor="rgba(80,60,40,0.22)" floodOpacity="1" />
        </filter>
        <path
          id={pathAId}
          d="M 308,180
             A 128,46 0 1 0 52,180
             A 128,46 0 1 0 308,180 Z"
        />
        <path
          id={pathBId}
          d="M 238,280.5
             A 116,42 60 1 0 122,79.5
             A 116,42 60 1 0 238,280.5 Z"
        />
        <path
          id={pathCId}
          d="M 125,275.3
             A 110,40 120 1 0 235,84.7
             A 110,40 120 1 0 125,275.3 Z"
        />
      </defs>

      <ellipse className="viewer-boot-splash__orbit viewer-boot-splash__orbit--a" cx="180" cy="180" rx="128" ry="46" />
      <ellipse
        className="viewer-boot-splash__orbit viewer-boot-splash__orbit--b"
        cx="180"
        cy="180"
        rx="116"
        ry="42"
        transform="rotate(60 180 180)"
      />
      <ellipse
        className="viewer-boot-splash__orbit viewer-boot-splash__orbit--c"
        cx="180"
        cy="180"
        rx="110"
        ry="40"
        transform="rotate(120 180 180)"
      />

      <circle className="viewer-boot-splash__nucleus-halo" cx="180" cy="180" r="45" fill={`url(#${haloGradientId})`} />
      <circle className="viewer-boot-splash__nucleus-ring" cx="180" cy="180" r="37" />
      <circle
        className="viewer-boot-splash__nucleus-sphere"
        cx="180"
        cy="180"
        r="28"
        fill={`url(#${nucleusGradientId})`}
        filter={`url(#${sphereShadowId})`}
      />
      <circle cx="180" cy="180" r="28" fill={`url(#${gleamGradientId})`} />

      <g filter={`url(#${dotGlowId})`}>
        <g className="viewer-boot-splash__marker viewer-boot-splash__marker--a">
          <path d="M 0,-9.5 C 5,-5 5.8,1.5 0,9.5 C -5.8,1.5 -5,-5 0,-9.5 Z" />
          <line x1="0" y1="-7.8" x2="0" y2="7.8" />
          <animateMotion dur="5.7s" repeatCount="indefinite" rotate="auto">
            <mpath href={`#${pathAId}`} />
          </animateMotion>
        </g>
      </g>

      <g filter={`url(#${dotGlowId})`}>
        <g className="viewer-boot-splash__marker viewer-boot-splash__marker--b">
          <polygon points="0,-8.4 7.27,-4.2 7.27,4.2 0,8.4 -7.27,4.2 -7.27,-4.2" />
          <polygon className="viewer-boot-splash__marker-core" points="0,-4.4 3.8,-2.2 3.8,2.2 0,4.4 -3.8,2.2 -3.8,-2.2" />
          <animateMotion dur="8.3s" repeatCount="indefinite" rotate="none">
            <mpath href={`#${pathBId}`} />
          </animateMotion>
        </g>
      </g>

      <g filter={`url(#${dotGlowId})`}>
        <g className="viewer-boot-splash__marker viewer-boot-splash__marker--c">
          <path d="M 0,-10.2 L 2.6,-2.6 L 10.2,0 L 2.6,2.6 L 0,10.2 L -2.6,2.6 L -10.2,0 L -2.6,-2.6 Z" />
          <circle className="viewer-boot-splash__marker-core" r="2" />
          <animateMotion dur="6.7s" repeatCount="indefinite" rotate="none">
            <mpath href={`#${pathCId}`} />
          </animateMotion>
        </g>
      </g>

      <text x="314" y="176" className="viewer-boot-splash__orbit-label viewer-boot-splash__orbit-label--a" textAnchor="start">
        BIOLOGY
      </text>
      <text x="244" y="296" className="viewer-boot-splash__orbit-label viewer-boot-splash__orbit-label--b" textAnchor="middle">
        CHEMISTRY
      </text>
      <text x="116" y="296" className="viewer-boot-splash__orbit-label viewer-boot-splash__orbit-label--c" textAnchor="middle">
        PHYSICS
      </text>
    </svg>
  );
}

export function FullScreenLoadingScreen({ message }: { message?: string }) {
  const copy = useCoreCopy();

  return (
    <div className="viewer-full-screen-loader" role="status" aria-live="polite">
      <div className="viewer-boot-splash viewer-boot-splash--react" data-state="visible">
        <div className="viewer-boot-splash__particles" aria-hidden="true">
          {bootSplashParticles.map((particle) => (
            <span
              key={`${particle.left}-${particle.symbol}`}
              className="viewer-boot-splash__particle"
              style={
                {
                  left: particle.left,
                  fontSize: particle.fontSize,
                  '--boot-particle-delay': particle.delay,
                  '--boot-particle-duration': particle.duration,
                  '--boot-particle-rotation': particle.rotation,
                } as CSSProperties
              }
            >
              {particle.symbol}
            </span>
          ))}
        </div>
        <div className="viewer-boot-splash__core">
          <BootSplashArtwork />
          <p className="viewer-boot-splash__brand">Primoria</p>
          <div className="viewer-boot-splash__status-row">
            <span className="viewer-boot-splash__status-copy">{message ?? copy.common.loading}</span>
            <span className="viewer-boot-splash__dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
