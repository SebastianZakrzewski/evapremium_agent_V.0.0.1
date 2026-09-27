import { AnimatePresence, motion } from 'motion/react';

type ChatHeaderProps = {
  typing: boolean;
};

export function ChatHeader({ typing }: ChatHeaderProps) {
  return (
    <header className="eva-chat__header">
      <div className="eva-chat__avatar-wrap">
        <motion.span
          className="eva-chat__avatar-ring"
          aria-hidden="true"
          animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.15, 0.55] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <img
          className="eva-chat__avatar"
          src="/evabot-icon.jpg"
          alt=""
          width={48}
          height={48}
        />
        <span className="eva-chat__presence" aria-hidden="true" />
      </div>
      <div className="eva-chat__identity">
        <p className="eva-chat__brand">EVA Premium</p>
        <h1 className="eva-chat__title">EvaBot</h1>
        <div className="eva-chat__status" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={typing ? 'typing' : 'online'}
              className={`eva-chat__status-text${typing ? ' eva-chat__status-text--typing' : ''}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              {typing ? 'pisze…' : 'Online · odpowiada w kilka sekund'}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
