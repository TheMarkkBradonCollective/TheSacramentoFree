import { useRef, type ReactNode } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';

interface HomeScrollStageProps {
  children: ReactNode;
}

/** Ambient orbs + perspective root for the public home scroll experience. */
export default function HomeScrollStage({ children }: HomeScrollStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: rootRef,
    offset: ['start start', 'end end'],
  });

  const farY = useTransform(scrollYProgress, [0, 1], [0, 420]);
  const midY = useTransform(scrollYProgress, [0, 1], [0, 260]);
  const nearY = useTransform(scrollYProgress, [0, 1], [0, 140]);
  const farRotate = useTransform(scrollYProgress, [0, 1], [0, 18]);
  const midRotate = useTransform(scrollYProgress, [0, 1], [0, -14]);

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, { stiffness: 120, damping: 22 });
  const springY = useSpring(pointerY, { stiffness: 120, damping: 22 });
  const tiltX = useTransform(springY, [-0.5, 0.5], [6, -6]);
  const tiltY = useTransform(springX, [-0.5, 0.5], [-8, 8]);
  const glowX = useTransform(springX, [-0.5, 0.5], [-24, 24]);
  const glowY = useTransform(springY, [-0.5, 0.5], [-18, 18]);
  const glowPosition = useMotionTemplate`calc(50% + ${glowX}px) calc(20% + ${glowY}px)`;

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const onPointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <div
      ref={rootRef}
      className="home-scroll-stage relative max-w-5xl mx-auto px-4 py-12 md:py-16"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div className="home-scroll-stage__ambient pointer-events-none" aria-hidden>
        <motion.div
          className="home-scroll-stage__orb home-scroll-stage__orb--far"
          style={{ y: farY, rotate: farRotate }}
        />
        <motion.div
          className="home-scroll-stage__orb home-scroll-stage__orb--mid"
          style={{ y: midY, rotate: midRotate }}
        />
        <motion.div
          className="home-scroll-stage__orb home-scroll-stage__orb--near"
          style={{ y: nearY }}
        />
        <motion.div className="home-scroll-stage__glow" style={{ backgroundPosition: glowPosition }} />
      </div>

      <motion.div
        className="home-scroll-stage__content"
        style={{ rotateX: tiltX, rotateY: tiltY }}
      >
        {children}
      </motion.div>
    </div>
  );
}

interface DepthSectionProps {
  children: ReactNode;
  depth?: number;
  className?: string;
  id?: string;
}

/** Section that moves through Z-space as it crosses the viewport while scrolling. */
export function DepthSection({ children, depth = 1, className = '', id }: DepthSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.92', 'end 0.08'],
  });

  const y = useTransform(scrollYProgress, [0, 0.45, 1], [depth * 36, 0, -depth * 28]);
  const z = useTransform(scrollYProgress, [0, 0.45, 1], [-depth * 90, 0, depth * 50]);
  const rotateX = useTransform(scrollYProgress, [0, 0.45, 1], [depth * 5, 0, -depth * 2.5]);
  const scale = useTransform(scrollYProgress, [0, 0.45, 1], [0.94, 1, 0.97]);
  const opacity = useTransform(scrollYProgress, [0, 0.12, 0.88, 1], [0.55, 1, 1, 0.85]);

  return (
    <motion.section
      ref={ref}
      id={id}
      className={`home-scroll-stage__section ${className}`.trim()}
      style={{
        y,
        z,
        rotateX,
        scale,
        opacity,
        transformPerspective: 1200,
      }}
    >
      {children}
    </motion.section>
  );
}

interface DepthPanelProps {
  children: ReactNode;
  className?: string;
  floatDelay?: number;
}

/** Card/panel with scroll depth + subtle pointer tilt. */
export function DepthPanel({ children, className = '', floatDelay = 0 }: DepthPanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.95', 'end 0.05'],
  });

  const y = useTransform(scrollYProgress, [0, 0.5, 1], [48 + floatDelay, 0, -24]);
  const z = useTransform(scrollYProgress, [0, 0.5, 1], [-60, 20, -30]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [7, 0, -4]);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 200, damping: 24 });
  const sy = useSpring(py, { stiffness: 200, damping: 24 });
  const hoverRotateX = useTransform(sy, [-0.5, 0.5], [4, -4]);
  const hoverRotateY = useTransform(sx, [-0.5, 0.5], [-6, 6]);

  return (
    <motion.div
      ref={ref}
      className={`home-scroll-stage__panel ${className}`.trim()}
      style={{
        y,
        z,
        rotateX,
        rotateY: hoverRotateY,
        rotateZ: hoverRotateX,
        transformPerspective: 900,
      }}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        px.set((e.clientX - rect.left) / rect.width - 0.5);
        py.set((e.clientY - rect.top) / rect.height - 0.5);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
    >
      {children}
    </motion.div>
  );
}
