import {cn} from '@/lib/utils';

type ParticleFieldProps = {
  density?: 'low' | 'medium';
  colorMode?: 'brand-blue';
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

export function ParticleField({density = 'low', colorMode = 'brand-blue', className}: ParticleFieldProps) {
  const particles = density === 'medium' ? PARTICLES_MEDIUM : PARTICLES_LOW;

  return (
    <div className={cn('particle-field', colorMode === 'brand-blue' && 'particle-field--brand-blue', className)} aria-hidden="true">
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
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
