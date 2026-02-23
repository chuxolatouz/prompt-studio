'use client';

import {useRef, useState} from 'react';
import type {CSSProperties, PointerEvent as ReactPointerEvent} from 'react';
import {cn} from '@/lib/utils';

type ParticleFieldProps = {
  density?: 'low' | 'medium';
  colorMode?: 'brand-blue';
  interactive?: boolean;
  className?: string;
};

const PARTICLES_LOW = [
  {size: 7, left: '8%', top: '18%', delay: '0s', duration: '14s'},
  {size: 6, left: '22%', top: '62%', delay: '1.4s', duration: '16s'},
  {size: 9, left: '34%', top: '28%', delay: '2.1s', duration: '17s'},
  {size: 5, left: '46%', top: '76%', delay: '0.8s', duration: '13s'},
  {size: 8, left: '56%', top: '16%', delay: '2.8s', duration: '15s'},
  {size: 6, left: '68%', top: '52%', delay: '1.1s', duration: '18s'},
  {size: 9, left: '81%', top: '30%', delay: '0.4s', duration: '14s'},
  {size: 7, left: '90%', top: '70%', delay: '2.3s', duration: '16s'},
];

const PARTICLES_MEDIUM = [
  ...PARTICLES_LOW,
  {size: 4, left: '14%', top: '42%', delay: '1.8s', duration: '12s'},
  {size: 5, left: '27%', top: '86%', delay: '0.6s', duration: '13s'},
  {size: 7, left: '41%', top: '48%', delay: '2.6s', duration: '15s'},
  {size: 4, left: '52%', top: '61%', delay: '1.2s', duration: '11s'},
  {size: 6, left: '63%', top: '83%', delay: '2.2s', duration: '13s'},
  {size: 5, left: '76%', top: '14%', delay: '0.9s', duration: '14s'},
  {size: 4, left: '86%', top: '46%', delay: '1.6s', duration: '12s'},
  {size: 5, left: '95%', top: '24%', delay: '2.5s', duration: '13s'},
];

type PointerState = {
  x: number;
  y: number;
  active: boolean;
};

export function ParticleField({
  density = 'low',
  colorMode = 'brand-blue',
  interactive = true,
  className,
}: ParticleFieldProps) {
  const particles = density === 'medium' ? PARTICLES_MEDIUM : PARTICLES_LOW;
  const rafRef = useRef<number | null>(null);
  const [pointer, setPointer] = useState<PointerState>({x: 50, y: 50, active: false});

  const updatePointer = (x: number, y: number, active: boolean) => {
    if (!interactive) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setPointer({x, y, active});
      rafRef.current = null;
    });
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    updatePointer(Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)), true);
  };

  const onPointerLeave = () => updatePointer(50, 50, false);

  return (
    <div
      className={cn('particle-field', colorMode === 'brand-blue' && 'particle-field--brand-blue', className)}
      aria-hidden="true"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={
        {
          '--pointer-x': `${pointer.x}%`,
          '--pointer-y': `${pointer.y}%`,
          '--pointer-active': pointer.active ? 1 : 0,
        } as CSSProperties
      }
    >
      {particles.map((particle, index) => (
        <span
          key={`${particle.left}-${particle.top}-${index}`}
          className="particle-field__dot"
          style={
            {
              '--particle-size': `${particle.size}px`,
              '--particle-left': particle.left,
              '--particle-top': particle.top,
              '--particle-delay': particle.delay,
              '--particle-duration': particle.duration,
              '--particle-interactive-x': `${(pointer.x - 50) * (0.035 + (index % 4) * 0.02)}px`,
              '--particle-interactive-y': `${(pointer.y - 50) * (0.03 + (index % 3) * 0.018)}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
