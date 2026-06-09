import React from 'react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

const GlassPanel: React.FC<GlassPanelProps> = ({ children, className = '', as }) => {
  const Component = (as ?? 'div') as keyof JSX.IntrinsicElements;
  return (
    <Component className={`bg-white/[0.055] border border-white/[0.12] backdrop-blur-xl shadow-2xl shadow-black/40 rounded-[1.75rem] ${className}`}>
      {children}
    </Component>
  );
};

export default GlassPanel;
