import { motion } from 'motion/react';

const dots = [0, 1, 2];

export function TypingDots() {
  return (
    <span className="eva-typing" role="status" aria-label="Pisze">
      {dots.map((dot) => (
        <motion.span
          key={dot}
          className="eva-typing__dot"
          animate={{ y: [0, -5, 0], opacity: [0.35, 1, 0.35] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: dot * 0.16,
          }}
        />
      ))}
    </span>
  );
}
