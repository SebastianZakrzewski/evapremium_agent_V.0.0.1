import { motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { readCardSizeMessage } from './card-size';
import { ContactForm } from './ContactForm';
import { TypingDots } from './TypingDots';

type MessageBubbleProps = {
  role: 'user' | 'assistant';
  text: string;
  /** This bubble is the answer still being produced. */
  pending: boolean;
  /** First assistant bubble after a user message shows the avatar. */
  showAvatar: boolean;
  cardSrc?: string;
  contactForm?: boolean;
  onContact?: (message: string) => void;
};

function ProductCardFrame({ src }: { src: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return undefined;
    }

    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.contentWindow) {
        return;
      }
      const height = readCardSizeMessage(event.data);
      if (height === null) {
        return;
      }
      frame.style.height = `${height}px`;
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [src]);

  return (
    <iframe
      ref={frameRef}
      className="eva-product-card"
      src={src}
      title="Karta produktu"
      loading="eager"
    />
  );
}

export function MessageBubble({
  role,
  text,
  pending,
  showAvatar,
  cardSrc,
  contactForm,
  onContact,
}: MessageBubbleProps) {
  const fromUser = role === 'user';
  return (
    <motion.li
      className={`eva-msg eva-msg--${role}`}
      layout="position"
      initial={{ opacity: 0, y: 10, scale: 0.97, x: fromUser ? 12 : -12 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
    >
      {!fromUser ? (
        <span className="eva-msg__avatar" aria-hidden="true">
          {showAvatar ? <img src="/evabot-icon.jpg" alt="" width={28} height={28} /> : null}
        </span>
      ) : null}
      <div className={`eva-chat__bubble eva-chat__bubble--${role}`}>
        {pending && text === '' ? (
          <TypingDots />
        ) : (
          <>
            {text}
            {cardSrc ? <ProductCardFrame src={cardSrc} /> : null}
            {contactForm && onContact && !pending ? (
              <ContactForm disabled={pending} onSubmit={onContact} />
            ) : null}
            {pending ? <span className="eva-msg__caret" aria-hidden="true" /> : null}
          </>
        )}
      </div>
    </motion.li>
  );
}
