import React, { useState } from 'react';

// Observatory Design System
const colors = {
  void: '#0a0a12',
  deep: '#0d0d1a',
  navy: '#1a1a2e',
  gold: '#c9a227',
  goldMuted: 'rgba(201, 162, 39, 0.15)',
  blue: '#4a6fa5',
  blueMuted: 'rgba(74, 111, 165, 0.3)',
  cream: '#e8e4dc',
  creamMuted: '#9a9aaa',
  creamDim: '#6a6a7a',
  border: '#2a2a4a',
  cardBg: 'rgba(26, 26, 46, 0.6)',
};

// Star field background component
const StarField = ({ count = 80 }) => {
  const stars = React.useMemo(() => 
    [...Array(count)].map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() > 0.8 ? 2 : 1,
      opacity: 0.2 + Math.random() * 0.5,
      delay: Math.random() * 3
    })), [count]
  );
  
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {stars.map(star => (
        <div
          key={star.id}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            background: colors.cream,
            borderRadius: '50%',
            opacity: star.opacity,
            animation: `twinkle 4s ease-in-out ${star.delay}s infinite`
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

// Navigation
const Nav = () => (
  <nav style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    borderBottom: `1px solid ${colors.border}`,
    background: 'rgba(10, 10, 18, 0.8)',
    backdropFilter: 'blur(12px)',
    position: 'sticky',
    top: 0,
    zIndex: 100
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {/* Logo mark - abstract telescope/eye */}
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="12" stroke={colors.gold} strokeWidth="1.5" />
        <circle cx="14" cy="14" r="6" stroke={colors.gold} strokeWidth="1" />
        <circle cx="14" cy="14" r="2" fill={colors.gold} />
      </svg>
      <span style={{ 
        fontFamily: '"Cormorant Garamond", Georgia, serif',
        fontSize: '22px',
        fontStyle: 'italic',
        color: colors.cream,
        letterSpacing: '0.5px'
      }}>
        Observatory
      </span>
    </div>
    <div style={{ display: 'flex', gap: '32px', fontFamily: '"DM Sans", system-ui' }}>
      {['Dashboard', 'Companies', 'Digest', 'Alerts'].map((item, i) => (
        <a
          key={item}
          href="#"
          style={{
            color: i === 0 ? colors.gold : colors.creamMuted,
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'color 0.2s'
          }}
        >
          {item}
        </a>
      ))}
    </div>
    <div style={{ 
      fontSize: '12px', 
      color: colors.creamDim,
      fontFamily: '"DM Sans", system-ui'
    }}>
      Week 47, 2025
    </div>
  </nav>
);

// Metric card component
const MetricCard = ({ label, value, change, small }) => (
  <div style={{
    background: colors.cardBg,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: small ? '16px' : '24px',
    backdropFilter: 'blur(8px)'
  }}>
    <div style={{ 
      color: colors.creamDim, 
      fontSize: '11px', 
      letterSpacing: '1.5px',
      marginBottom: '8px',
      fontFamily: '"DM Sans", system-ui'
    }}>
      {label}
    </div>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
      <span style={{ 
        color: colors.cream, 
        fontSize: small ? '28px' : '36px',
        fontFamily: '"Cormorant Garamond", Georgia, serif',
        fontWeight: 300
      }}>
        {value}
      </span>
      {change && (
        <span style={{ 
          color: change > 0 ? '#4ade80' : change < 0 ? '#f87171' : colors.creamDim,
          fontSize: '13px',
          fontFamily: '"DM Sans", system-ui'
        }}>
          {change > 0 ? '+' : ''}{change}%
        </span>
      )}
    </div>
  </div>
);

// Company row component
const CompanyRow = ({ company, jobs, change, velocity, focus, onClick, selected }) => (
  <div
    onClick={onClick}
    style={{
      display: 'grid',
      gridTemplateColumns: '180px 100px 100px 120px 1fr',
      alignItems: 'center',
      padding: '16px 20px',
      background: selected ? colors.goldMuted : 'transparent',
      borderBottom: `1px solid ${colors.border}`,
      cursor: 'pointer',
      transition: 'background 0.2s'
    }}
  >
    <span style={{ color: colors.cream, fontSize: '14px', fontWeight: 500 }}>{company}</span>
    <span style={{ color: colors.cream, fontSize: '14px', fontFamily: 'monospace' }}>{jobs}</span>
    <span style={{ 
      color: change > 0 ? '#4ade80' : change < 0 ? '#f87171' : colors.creamDim,
      fontSize: '13px',
      fontFamily: 'monospace'
    }}>
      {change > 0 ? '+' : ''}{change}
    </span>
    <span style={{
      color: velocity === 'high' ? colors.gold : velocity === 'medium' ? colors.blue : colors.creamDim,
      fontSize: '11px',
      letterSpacing: '1px',
      textTransform: 'uppercase'
    }}>
      {velocity}
    </span>
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {focus.map(tag => (
        <span key={tag} style={{
          background: colors.blueMuted,
          color: colors.cream,
          fontSize: '11px',
          padding: '3px 8px',
          borderRadius: '4px'
        }}>
          {tag}
        </span>
      ))}
    </div>
  </div>
);

// Alert component
const Alert = ({ type, company, message }) => (
  <div style={{
    display: 'flex',
    gap: '16px',
    padding: '16px',
    background: type === 'anomaly' ? 'rgba(201, 162, 39, 0.08)' : colors.cardBg,
    border: `1px solid ${type === 'anomaly' ? 'rgba(201, 162, 39, 0.3)' : colors.border}`,
    borderRadius: '8px',
    alignItems: 'flex-start'
  }}>
    <div style={{
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: type === 'anomaly' ? colors.gold : colors.blue,
      marginTop: '6px',
      flexShrink: 0,
      animation: type === 'anomaly' ? 'pulse 2s infinite' : 'none'
    }} />
    <div>
      <div style={{ 
        color: colors.cream, 
        fontSize: '14px', 
        marginBottom: '4px',
        fontFamily: '"DM Sans", system-ui'
      }}>
        <strong>{company}</strong>
      </div>
      <div style={{ 
        color: colors.creamMuted, 
        fontSize: '13px',
        lineHeight: 1.5,
        fontFamily: '"DM Sans", system-ui'
      }}>
        {message}
      </div>
    </div>
    <span style={{
      marginLeft: 'auto',
      color: type === 'anomaly' ? colors.gold : colors.creamDim,
      fontSize: '10px',
      letterSpacing: '1px',
      textTransform: 'uppercase',
      flexShrink: 0
    }}>
      {type}
    </span>
    <style>{`
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
    `}</style>
  </div>
);

// Weekly digest entry
const DigestEntry = ({ title, summary, companies }) => (
  <div style={{
    padding: '20px 0',
    borderBottom: `1px solid ${colors.border}`
  }}>
    <h4 style={{
      color: colors.cream,
      fontSize: '18px',
      fontWeight: 400,
      margin: '0 0 8px 0',
      fontFamily: '"Cormorant Garamond", Georgia, serif',
      fontStyle: 'italic'
    }}>
      {title}
    </h4>
    <p style={{
      color: colors.creamMuted,
      fontSize: '14px',
      lineHeight: 1.6,
      margin: '0 0 12px 0',
      fontFamily: '"DM Sans", system-ui'
    }}>
      {summary}
    </p>
    <div style={{ display: 'flex', gap: '8px' }}>
      {companies.map(c => (
        <span key={c} style={{
          color: colors.gold,
          fontSize: '12px',
          fontFamily: '"DM Sans", system-ui'
        }}>
          {c}
        </span>
      ))}
    </div>
  </div>
);

// Company detail panel
const CompanyDetail = ({ company, onClose }) => {
  if (!company) return null;
  
  const data = {
    'OpenAI': { 
      jobs: 453, change: 67, valuation: '$500B (target)', 
      description: 'Consumer AI leader pushing into enterprise. GPT-5 unified architecture. Windsurf acquisition signals agentic focus.',
      hotRoles: ['Inference Engineer', 'Enterprise AE', 'Applied Research'],
      trend: 'Aggressive expansion across all functions. Watch for hardware team growth (Jony Ive collab).'
    },
    'Anthropic': { 
      jobs: 289, change: 47, valuation: '$183B',
      description: 'Safety-focused lab seeing rapid revenue growth ($1B→$5B in 8 months). Claude Code driving significant ARR.',
      hotRoles: ['Interpretability Researcher', 'Claude Code Engineer', 'Enterprise Sales'],
      trend: 'Balanced growth. Enterprise sales expansion without sacrificing research depth.'
    },
    'xAI': { 
      jobs: 312, change: -12, valuation: '$230B',
      description: 'Musk\'s lab with X/Twitter data advantage. Colossus supercomputer operational. Recent layoffs in annotation.',
      hotRoles: ['Infrastructure Engineer', 'ML Systems', 'Government Relations'],
      trend: 'Consolidation phase. Reduced recruiters, increased infra. Watch DoD contract execution.'
    },
    'Cursor': { 
      jobs: 156, change: 34, valuation: '$29.3B',
      description: 'Fastest-growing SaaS ever. AI-native code editor with 1M+ DAU. Rejected OpenAI acquisition.',
      hotRoles: ['AI Research', 'VS Code Platform', 'Enterprise Sales'],
      trend: 'Hypergrowth. Research team expansion suggests proprietary model development.'
    }
  }[company] || { jobs: 0, change: 0, valuation: 'N/A', description: '', hotRoles: [], trend: '' };

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: '420px',
      background: colors.deep,
      borderLeft: `1px solid ${colors.border}`,
      padding: '24px',
      zIndex: 200,
      overflowY: 'auto',
      animation: 'slideIn 0.3s ease'
    }}>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ 
            color: colors.gold, 
            fontSize: '10px', 
            letterSpacing: '2px', 
            marginBottom: '8px',
            fontFamily: '"DM Sans", system-ui'
          }}>
            OBSERVATION TARGET
          </div>
          <h2 style={{
            color: colors.cream,
            fontSize: '28px',
            fontWeight: 400,
            margin: 0,
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontStyle: 'italic'
          }}>
            {company}
          </h2>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: `1px solid ${colors.border}`,
            color: colors.creamMuted,
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '18px'
          }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <MetricCard label="OPEN ROLES" value={data.jobs} small />
        <MetricCard label="WEEK Δ" value={data.change > 0 ? `+${data.change}` : data.change} small />
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ color: colors.creamDim, fontSize: '10px', letterSpacing: '1.5px', marginBottom: '8px' }}>
          VALUATION
        </div>
        <div style={{ color: colors.cream, fontSize: '16px', fontFamily: '"DM Sans", system-ui' }}>
          {data.valuation}
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ color: colors.creamDim, fontSize: '10px', letterSpacing: '1.5px', marginBottom: '8px' }}>
          OVERVIEW
        </div>
        <p style={{ color: colors.creamMuted, fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
          {data.description}
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <div style={{ color: colors.creamDim, fontSize: '10px', letterSpacing: '1.5px', marginBottom: '12px' }}>
          HOT ROLES
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.hotRoles.map(role => (
            <div key={role} style={{
              background: colors.goldMuted,
              border: `1px solid rgba(201, 162, 39, 0.3)`,
              borderRadius: '6px',
              padding: '10px 14px',
              color: colors.cream,
              fontSize: '13px'
            }}>
              {role}
            </div>
          ))}
        </div>
      </div>

      <div style={{
        background: colors.cardBg,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        padding: '16px'
      }}>
        <div style={{ color: colors.gold, fontSize: '10px', letterSpacing: '1.5px', marginBottom: '8px' }}>
          TREND ANALYSIS
        </div>
        <p style={{ color: colors.creamMuted, fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
          {data.trend}
        </p>
      </div>
    </div>
  );
};

// Main Dashboard
export default function ObservatoryDashboard() {
  const [selectedCompany, setSelectedCompany] = useState(null);

  const companies = [
    { name: 'OpenAI', jobs: 453, change: 67, velocity: 'high', focus: ['inference', 'enterprise', 'agents'] },
    { name: 'Anthropic', jobs: 289, change: 47, velocity: 'high', focus: ['safety', 'enterprise', 'claude-code'] },
    { name: 'xAI', jobs: 312, change: -12, velocity: 'medium', focus: ['infrastructure', 'government'] },
    { name: 'Cursor', jobs: 156, change: 34, velocity: 'high', focus: ['ai-research', 'ide', 'enterprise'] },
    { name: 'Scale AI', jobs: 203, change: -28, velocity: 'low', focus: ['rlhf', 'defense'] },
    { name: 'Perplexity', jobs: 134, change: 23, velocity: 'high', focus: ['search', 'browser', 'monetization'] },
    { name: 'Mistral', jobs: 98, change: 12, velocity: 'medium', focus: ['open-source', 'europe', 'enterprise'] },
    { name: 'Cohere', jobs: 112, change: 8, velocity: 'medium', focus: ['enterprise', 'banking', 'on-prem'] },
    { name: 'Figure AI', jobs: 87, change: 15, velocity: 'medium', focus: ['robotics', 'manufacturing'] },
    { name: 'Together AI', jobs: 76, change: 11, velocity: 'medium', focus: ['inference', 'open-source'] },
    { name: 'Fireworks AI', jobs: 68, change: 19, velocity: 'high', focus: ['inference', 'optimization'] },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: `radial-gradient(ellipse at 20% 0%, ${colors.navy} 0%, ${colors.void} 50%)`,
      fontFamily: '"DM Sans", system-ui, sans-serif',
      color: colors.cream,
      position: 'relative'
    }}>
      <StarField count={100} />
      <Nav />

      <main style={{ 
        padding: '40px', 
        maxWidth: '1400px', 
        margin: '0 auto',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ 
            color: colors.gold, 
            fontSize: '11px', 
            letterSpacing: '3px', 
            marginBottom: '12px' 
          }}>
            WEEK 47 OBSERVATION LOG
          </div>
          <h1 style={{
            fontSize: '42px',
            fontWeight: 300,
            margin: 0,
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontStyle: 'italic',
            lineHeight: 1.2
          }}>
            AI Sector Intelligence
          </h1>
          <p style={{ 
            color: colors.creamMuted, 
            fontSize: '16px', 
            marginTop: '12px',
            maxWidth: '600px',
            lineHeight: 1.6
          }}>
            Tracking hiring patterns across 11 frontier AI companies. 
            1,625 active positions observed.
          </p>
        </div>

        {/* Metrics row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '20px',
          marginBottom: '48px'
        }}>
          <MetricCard label="TOTAL POSITIONS" value="1,625" change={8.3} />
          <MetricCard label="WEEKLY DELTA" value="+196" />
          <MetricCard label="COMPANIES TRACKED" value="11" />
          <MetricCard label="ANOMALIES DETECTED" value="3" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '40px' }}>
          {/* Companies table */}
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 400,
                margin: 0,
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontStyle: 'italic'
              }}>
                Active Observations
              </h2>
              <span style={{ color: colors.creamDim, fontSize: '12px' }}>
                Click row for details
              </span>
            </div>

            <div style={{
              background: colors.cardBg,
              border: `1px solid ${colors.border}`,
              borderRadius: '12px',
              overflow: 'hidden',
              backdropFilter: 'blur(8px)'
            }}>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '180px 100px 100px 120px 1fr',
                padding: '12px 20px',
                borderBottom: `1px solid ${colors.border}`,
                color: colors.creamDim,
                fontSize: '10px',
                letterSpacing: '1.5px'
              }}>
                <span>COMPANY</span>
                <span>POSITIONS</span>
                <span>WEEK Δ</span>
                <span>VELOCITY</span>
                <span>FOCUS AREAS</span>
              </div>
              
              {companies.map(company => (
                <CompanyRow
                  key={company.name}
                  company={company.name}
                  jobs={company.jobs}
                  change={company.change}
                  velocity={company.velocity}
                  focus={company.focus}
                  selected={selectedCompany === company.name}
                  onClick={() => setSelectedCompany(company.name)}
                />
              ))}
            </div>
          </div>

          {/* Right column: Alerts & Digest */}
          <div>
            {/* Alerts */}
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 400,
                margin: '0 0 16px 0',
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontStyle: 'italic'
              }}>
                Signals Detected
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Alert 
                  type="anomaly"
                  company="xAI"
                  message="Removed 12 recruiter roles while adding 28 infrastructure positions. Potential consolidation phase."
                />
                <Alert 
                  type="anomaly"
                  company="Scale AI"
                  message="Hiring velocity dropped 40% ahead of Meta acquisition close. Leadership roles frozen."
                />
                <Alert 
                  type="signal"
                  company="Cursor"
                  message="Added 8 AI research positions in one week. May indicate proprietary model development."
                />
              </div>
            </div>

            {/* Weekly Digest */}
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 400,
                margin: '0 0 16px 0',
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontStyle: 'italic'
              }}>
                Weekly Digest
              </h2>
              <div style={{
                background: colors.cardBg,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                padding: '4px 20px',
                backdropFilter: 'blur(8px)'
              }}>
                <DigestEntry
                  title="Enterprise Sales Surge"
                  summary="Three companies added 30+ enterprise sales roles this week, signaling renewed B2B focus across the sector."
                  companies={['Anthropic', 'OpenAI', 'Cohere']}
                />
                <DigestEntry
                  title="Inference Infrastructure Race"
                  summary="Together AI, Fireworks, and xAI all expanding systems engineering teams. Competition for inference efficiency intensifies."
                  companies={['Together AI', 'Fireworks', 'xAI']}
                />
                <DigestEntry
                  title="Research Team Movements"
                  summary="Cursor's aggressive research hiring and Anthropic's interpretability expansion suggest next-gen model development."
                  companies={['Cursor', 'Anthropic']}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Company detail panel */}
      <CompanyDetail 
        company={selectedCompany} 
        onClose={() => setSelectedCompany(null)} 
      />

      {/* Overlay when panel is open */}
      {selectedCompany && (
        <div 
          onClick={() => setSelectedCompany(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 150
          }}
        />
      )}
    </div>
  );
}
