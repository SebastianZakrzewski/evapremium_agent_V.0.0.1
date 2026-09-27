import '@testing-library/jest-dom/vitest';
import { MotionGlobalConfig } from 'motion/react';

// jsdom has no animation frames, so exit animations would keep nodes mounted.
MotionGlobalConfig.skipAnimations = true;
