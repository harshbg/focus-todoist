import './pixel.css';

export interface FireworksProps {
  className?: string;
}

export function Fireworks({ className }: FireworksProps = {}) {
  return (
    <div
      aria-hidden="true"
      className={className ? `px-fireworks ${className}` : 'px-fireworks'}
    >
      <div className="px-fireworks-animated">
        {/* Burst 1: staggered at 0s */}
        <div className="px-burst px-burst--1">
          <div className="px-spark px-spark--gold px-spark--pos-1" />
          <div className="px-spark px-spark--flower px-spark--pos-2" />
          <div className="px-spark px-spark--cloud px-spark--pos-3" />
          <div className="px-spark px-spark--gold px-spark--pos-4" />
          <div className="px-spark px-spark--flower px-spark--pos-5" />
          <div className="px-spark px-spark--gold px-spark--pos-6" />
          <div className="px-spark px-spark--cloud px-spark--pos-7" />
          <div className="px-spark px-spark--flower px-spark--pos-8" />
          <div className="px-spark px-spark--gold px-spark--pos-9" />
          <div className="px-spark px-spark--cloud px-spark--pos-10" />
        </div>
        {/* Burst 2: staggered at 0.55s */}
        <div className="px-burst px-burst--2">
          <div className="px-spark px-spark--flower px-spark--pos-1" />
          <div className="px-spark px-spark--gold px-spark--pos-2" />
          <div className="px-spark px-spark--cloud px-spark--pos-3" />
          <div className="px-spark px-spark--flower px-spark--pos-4" />
          <div className="px-spark px-spark--gold px-spark--pos-5" />
          <div className="px-spark px-spark--cloud px-spark--pos-6" />
          <div className="px-spark px-spark--flower px-spark--pos-7" />
          <div className="px-spark px-spark--gold px-spark--pos-8" />
          <div className="px-spark px-spark--flower px-spark--pos-9" />
          <div className="px-spark px-spark--cloud px-spark--pos-10" />
        </div>
        {/* Burst 3: staggered at 1.1s */}
        <div className="px-burst px-burst--3">
          <div className="px-spark px-spark--cloud px-spark--pos-1" />
          <div className="px-spark px-spark--gold px-spark--pos-2" />
          <div className="px-spark px-spark--flower px-spark--pos-3" />
          <div className="px-spark px-spark--gold px-spark--pos-4" />
          <div className="px-spark px-spark--cloud px-spark--pos-5" />
          <div className="px-spark px-spark--flower px-spark--pos-6" />
          <div className="px-spark px-spark--gold px-spark--pos-7" />
          <div className="px-spark px-spark--cloud px-spark--pos-8" />
          <div className="px-spark px-spark--flower px-spark--pos-9" />
          <div className="px-spark px-spark--gold px-spark--pos-10" />
        </div>
      </div>
      <div className="px-static-sparkle">
        {/* Cluster 1: upper left */}
        <div className="px-spark px-spark--gold px-spark--static-1" />
        <div className="px-spark px-spark--flower px-spark--static-2" />
        <div className="px-spark px-spark--cloud px-spark--static-3" />
        {/* Cluster 2: upper center */}
        <div className="px-spark px-spark--flower px-spark--static-4" />
        <div className="px-spark px-spark--gold px-spark--static-5" />
        <div className="px-spark px-spark--cloud px-spark--static-6" />
        {/* Cluster 3: upper right */}
        <div className="px-spark px-spark--cloud px-spark--static-7" />
        <div className="px-spark px-spark--gold px-spark--static-8" />
        <div className="px-spark px-spark--flower px-spark--static-9" />
      </div>
    </div>
  );
}
