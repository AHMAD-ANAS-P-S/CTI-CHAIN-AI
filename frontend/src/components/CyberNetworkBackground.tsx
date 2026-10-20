import React from 'react';

/**
 * CyberNetworkBackground
 * Full-screen cybersecurity network visualization with:
 * - Base background: #001314 with dark teal radial gradients (#001B1D, #002629)
 * - Thin interconnected network lines: #087F88
 * - Small glowing cyan nodes: #00E5F0 & #00AEB8
 * - Restrained threat indicator nodes: #E52535
 * - Resolution-independent vector rendering, 0 CPU loop overhead, respects prefers-reduced-motion
 */
export const CyberNetworkBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0"
      style={{
        backgroundColor: '#001314',
        backgroundImage: `
          radial-gradient(ellipse 1100px 650px at 50% 12%, rgba(0, 38, 41, 0.75) 0%, rgba(0, 27, 29, 0.95) 55%, #001314 100%),
          radial-gradient(circle 800px at 85% 80%, rgba(0, 38, 41, 0.45) 0%, transparent 70%),
          radial-gradient(circle 700px at 15% 85%, rgba(0, 27, 29, 0.5) 0%, transparent 65%)
        `,
      }}
    >
      <svg
        className="w-full h-full opacity-65 transition-opacity duration-1000"
        viewBox="0 0 1920 1080"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Cyan Glow Filter */}
          <filter id="cyan-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Red Threat Indicator Glow Filter */}
          <filter id="red-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Linear Gradients for Connecting Paths */}
          <linearGradient id="line-cyan-teal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00E5F0" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#087F88" stopOpacity="0.15" />
          </linearGradient>

          <linearGradient id="line-threat" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E52535" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#087F88" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {/* Network Constellation Grid Lines */}
        <g strokeWidth="1" strokeLinecap="round">
          {/* Upper Cluster (Threat Ingestion & Ingress) */}
          <line x1="210" y1="120" x2="380" y2="240" stroke="#087F88" strokeOpacity="0.32" />
          <line x1="380" y1="240" x2="560" y2="160" stroke="#087F88" strokeOpacity="0.4" />
          <line x1="560" y1="160" x2="720" y2="280" stroke="#087F88" strokeOpacity="0.25" />
          <line x1="720" y1="280" x2="960" y2="180" stroke="#087F88" strokeOpacity="0.45" />
          <line x1="960" y1="180" x2="1200" y2="260" stroke="#087F88" strokeOpacity="0.35" />
          <line x1="1200" y1="260" x2="1420" y2="150" stroke="#087F88" strokeOpacity="0.4" />
          <line x1="1420" y1="150" x2="1640" y2="230" stroke="#087F88" strokeOpacity="0.3" />
          <line x1="1640" y1="230" x2="1780" y2="110" stroke="#087F88" strokeOpacity="0.25" />

          {/* Diagonal Cross-links */}
          <line x1="380" y1="240" x2="480" y2="440" stroke="#087F88" strokeOpacity="0.28" />
          <line x1="560" y1="160" x2="680" y2="390" stroke="#087F88" strokeOpacity="0.22" />
          <line x1="720" y1="280" x2="880" y2="460" stroke="#087F88" strokeOpacity="0.35" />
          <line x1="960" y1="180" x2="960" y2="420" stroke="#00AEB8" strokeOpacity="0.4" />
          <line x1="1200" y1="260" x2="1080" y2="460" stroke="#087F88" strokeOpacity="0.3" />
          <line x1="1420" y1="150" x2="1320" y2="380" stroke="#087F88" strokeOpacity="0.26" />
          <line x1="1640" y1="230" x2="1520" y2="450" stroke="#087F88" strokeOpacity="0.3" />

          {/* Threat Indicator Paths (Red accented connections) */}
          <line x1="880" y1="460" x2="960" y2="600" stroke="url(#line-threat)" strokeWidth="1.25" />
          <line x1="960" y1="600" x2="1140" y2="520" stroke="url(#line-threat)" strokeWidth="1.25" />

          {/* Mid-layer Cross Interconnections */}
          <line x1="160" y1="480" x2="320" y2="420" stroke="#087F88" strokeOpacity="0.2" />
          <line x1="320" y1="420" x2="480" y2="440" stroke="#087F88" strokeOpacity="0.32" />
          <line x1="480" y1="440" x2="680" y2="390" stroke="#087F88" strokeOpacity="0.3" />
          <line x1="680" y1="390" x2="880" y2="460" stroke="#087F88" strokeOpacity="0.45" />
          <line x1="880" y1="460" x2="960" y2="420" stroke="#00E5F0" strokeOpacity="0.5" strokeWidth="1.2" />
          <line x1="960" y1="420" x2="1080" y2="460" stroke="#00E5F0" strokeOpacity="0.5" strokeWidth="1.2" />
          <line x1="1080" y1="460" x2="1320" y2="380" stroke="#087F88" strokeOpacity="0.4" />
          <line x1="1320" y1="380" x2="1520" y2="450" stroke="#087F88" strokeOpacity="0.3" />
          <line x1="1520" y1="450" x2="1760" y2="410" stroke="#087F88" strokeOpacity="0.25" />

          {/* Lower Network Mesh */}
          <line x1="280" y1="640" x2="480" y2="440" stroke="#087F88" strokeOpacity="0.2" />
          <line x1="280" y1="640" x2="420" y2="760" stroke="#087F88" strokeOpacity="0.28" />
          <line x1="420" y1="760" x2="620" y2="680" stroke="#087F88" strokeOpacity="0.35" />
          <line x1="620" y1="680" x2="680" y2="390" stroke="#087F88" strokeOpacity="0.22" />
          <line x1="620" y1="680" x2="820" y2="740" stroke="#087F88" strokeOpacity="0.3" />
          <line x1="820" y1="740" x2="960" y2="600" stroke="#087F88" strokeOpacity="0.4" />
          <line x1="960" y1="600" x2="1040" y2="760" stroke="#087F88" strokeOpacity="0.32" />
          <line x1="1040" y1="760" x2="1240" y2="670" stroke="#087F88" strokeOpacity="0.38" />
          <line x1="1240" y1="670" x2="1140" y2="520" stroke="#087F88" strokeOpacity="0.35" />
          <line x1="1240" y1="670" x2="1460" y2="730" stroke="#087F88" strokeOpacity="0.25" />
          <line x1="1460" y1="730" x2="1520" y2="450" stroke="#087F88" strokeOpacity="0.28" />
          <line x1="1460" y1="730" x2="1680" y2="650" stroke="#087F88" strokeOpacity="0.2" />

          {/* Deep Foundation Links */}
          <line x1="420" y1="760" x2="520" y2="920" stroke="#087F88" strokeOpacity="0.2" />
          <line x1="520" y1="920" x2="780" y2="880" stroke="#087F88" strokeOpacity="0.24" />
          <line x1="780" y1="880" x2="820" y2="740" stroke="#087F88" strokeOpacity="0.22" />
          <line x1="780" y1="880" x2="1010" y2="930" stroke="#087F88" strokeOpacity="0.3" />
          <line x1="1010" y1="930" x2="1040" y2="760" stroke="#087F88" strokeOpacity="0.25" />
          <line x1="1010" y1="930" x2="1280" y2="900" stroke="#087F88" strokeOpacity="0.26" />
          <line x1="1280" y1="900" x2="1240" y2="670" stroke="#087F88" strokeOpacity="0.22" />
          <line x1="1280" y1="900" x2="1540" y2="890" stroke="#087F88" strokeOpacity="0.18" />
        </g>

        {/* Small Distant Nodes (Blurred depth) */}
        <g fill="#00AEB8" opacity="0.3">
          <circle cx="210" cy="120" r="2" />
          <circle cx="160" cy="480" r="2" />
          <circle cx="280" cy="640" r="2" />
          <circle cx="520" cy="920" r="2" />
          <circle cx="1780" cy="110" r="2" />
          <circle cx="1760" cy="410" r="2" />
          <circle cx="1680" cy="650" r="2" />
          <circle cx="1540" cy="890" r="2" />
        </g>

        {/* Standard Telemetry Nodes (Soft cyan glow) */}
        <g fill="#00AEB8" opacity="0.65">
          <circle cx="380" cy="240" r="2.8" />
          <circle cx="560" cy="160" r="3.2" />
          <circle cx="720" cy="280" r="2.8" />
          <circle cx="1200" cy="260" r="3" />
          <circle cx="1420" cy="150" r="3.2" />
          <circle cx="1640" cy="230" r="2.8" />
          <circle cx="320" cy="420" r="2.5" />
          <circle cx="480" cy="440" r="3.2" />
          <circle cx="680" cy="390" r="3" />
          <circle cx="1320" cy="380" r="3.2" />
          <circle cx="1520" cy="450" r="3" />
          <circle cx="420" cy="760" r="2.8" />
          <circle cx="620" cy="680" r="3.2" />
          <circle cx="820" cy="740" r="3" />
          <circle cx="1040" cy="760" r="3.2" />
          <circle cx="1240" cy="670" r="3.5" />
          <circle cx="1460" cy="730" r="2.8" />
          <circle cx="780" cy="880" r="2.5" />
          <circle cx="1010" cy="930" r="3" />
          <circle cx="1280" cy="900" r="2.5" />
        </g>

        {/* Primary Interconnecting Nodes (Bright Cyan with Glow) */}
        <g fill="#00E5F0" filter="url(#cyan-glow)">
          <circle cx="960" cy="180" r="4" />
          <circle cx="880" cy="460" r="3.8" />
          <circle cx="960" cy="420" r="4.5" />
          <circle cx="1080" cy="460" r="3.8" />
          <circle cx="1140" cy="520" r="3.8" />
        </g>

        {/* Restrained Threat Indicator Nodes (Red Glow #E52535) */}
        <g fill="#E52535" filter="url(#red-glow)">
          <circle cx="960" cy="600" r="4.5" />
          <circle cx="1380" cy="290" r="3" opacity="0.8" />
          <circle cx="580" cy="530" r="2.8" opacity="0.75" />
        </g>

        {/* Pulse Ring around Central Threat Alert */}
        <circle
          cx="960"
          cy="600"
          r="9"
          fill="none"
          stroke="#E52535"
          strokeWidth="1"
          opacity="0.35"
        />
        <circle
          cx="960"
          cy="420"
          r="10"
          fill="none"
          stroke="#00E5F0"
          strokeWidth="1"
          opacity="0.3"
        />
      </svg>
    </div>
  );
};
