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
        <div className="px-burst px-burst--1">
          <div className="px-spark px-spark--gold px-spark--pos-1" />
          <div className="px-spark px-spark--flower px-spark--pos-2" />
          <div className="px-spark px-spark--cloud px-spark--pos-3" />
          <div className="px-spark px-spark--gold px-spark--pos-4" />
        </div>
        <div className="px-burst px-burst--2">
          <div className="px-spark px-spark--flower px-spark--pos-1" />
          <div className="px-spark px-spark--gold px-spark--pos-2" />
          <div className="px-spark px-spark--cloud px-spark--pos-3" />
          <div className="px-spark px-spark--flower px-spark--pos-4" />
          <div className="px-spark px-spark--gold px-spark--pos-5" />
        </div>
        <div className="px-burst px-burst--3">
          <div className="px-spark px-spark--cloud px-spark--pos-1" />
          <div className="px-spark px-spark--gold px-spark--pos-2" />
          <div className="px-spark px-spark--flower px-spark--pos-3" />
          <div className="px-spark px-spark--gold px-spark--pos-4" />
        </div>
      </div>
      <div className="px-static-sparkle">
        <div className="px-spark px-spark--gold px-spark--static-1" />
        <div className="px-spark px-spark--flower px-spark--static-2" />
        <div className="px-spark px-spark--cloud px-spark--static-3" />
      </div>
    </div>
  );
}
