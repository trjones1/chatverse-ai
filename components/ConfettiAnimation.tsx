'use client';

import React, { useEffect, useRef } from 'react';

interface ConfettiAnimationProps {
  isActive: boolean;
  fanfareLevel: 'small' | 'medium' | 'large' | 'epic';
  onComplete?: () => void;
}

export default function ConfettiAnimation({
  isActive,
  fanfareLevel,
  onComplete
}: ConfettiAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    rotation: number;
    rotationSpeed: number;
    color: string;
    size: number;
    life: number;
    maxLife: number;
    shape: 'square' | 'circle' | 'heart' | 'star';
  }

  const colors = [
    '#ff69b4', '#ff1493', '#ffc0cb', '#ff6b6b', '#4ecdc4',
    '#45b7d1', '#96ceb4', '#ffeaa7', '#fab1a0', '#fd79a8'
  ];

  const heartShapes = ['💖', '💕', '💗', '🩷', '❤️'];
  const starShapes = ['⭐', '✨', '🌟', '💫', '⚡'];

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Generate particles based on fanfare level
    const particleCount = getParticleCount(fanfareLevel);
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(canvas.width, canvas.height, fanfareLevel));
    }

    particlesRef.current = particles;

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current = particlesRef.current.filter(particle => {
        updateParticle(particle);
        drawParticle(ctx, particle);
        return particle.life > 0;
      });

      if (particlesRef.current.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, fanfareLevel, onComplete]);

  const getParticleCount = (level: string): number => {
    switch (level) {
      case 'small': return 30;
      case 'medium': return 60;
      case 'large': return 100;
      case 'epic': return 200;
      default: return 30;
    }
  };

  const createParticle = (
    canvasWidth: number,
    canvasHeight: number,
    level: string
  ): Particle => {
    const isEpic = level === 'epic';
    const isLarge = level === 'large' || isEpic;

    return {
      x: Math.random() * canvasWidth,
      y: canvasHeight + 20,
      vx: (Math.random() - 0.5) * (isEpic ? 8 : isLarge ? 6 : 4),
      vy: -Math.random() * (isEpic ? 20 : isLarge ? 15 : 10) - 5,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * (isEpic ? 12 : isLarge ? 8 : 6) + 4,
      life: 1,
      maxLife: Math.random() * 60 + (isEpic ? 120 : isLarge ? 90 : 60),
      shape: Math.random() < 0.3 ? 'heart' : Math.random() < 0.6 ? 'star' : Math.random() < 0.8 ? 'circle' : 'square'
    };
  };

  const updateParticle = (particle: Particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.3; // gravity
    particle.rotation += particle.rotationSpeed;
    particle.life = Math.max(0, particle.life - 1 / particle.maxLife);

    // Fade out as life decreases
    particle.vx *= 0.99; // air resistance
  };

  const drawParticle = (ctx: CanvasRenderingContext2D, particle: Particle) => {
    ctx.save();
    ctx.globalAlpha = particle.life;
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);

    if (particle.shape === 'heart' || particle.shape === 'star') {
      // Draw emoji-style hearts and stars
      ctx.font = `${particle.size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (particle.shape === 'heart') {
        ctx.fillText(heartShapes[Math.floor(Math.random() * heartShapes.length)], 0, 0);
      } else {
        ctx.fillText(starShapes[Math.floor(Math.random() * starShapes.length)], 0, 0);
      }
    } else {
      ctx.fillStyle = particle.color;

      if (particle.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // square
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      }
    }

    ctx.restore();
  };

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9999
      }}
    />
  );
}