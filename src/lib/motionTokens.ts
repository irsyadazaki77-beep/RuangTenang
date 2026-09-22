/**
 * RuangTenang Unified Motion System
 * 
 * Calm, subtle, accessible, and GPU-friendly micro-interactions.
 * Durations constrained to 150ms-250ms with cubic-bezier easing.
 * Avoids jarring bounces, heavy blurs, and layout thrashing.
 */

import { type Transition, type Variants } from 'motion/react';

// Duration Tokens (seconds)
export const MOTION_DURATIONS = {
  instant: 0.001,
  fast: 0.15,     // 150ms: micro-interactions, popovers, dropdowns, icon toggles
  normal: 0.2,    // 200ms: message entrance, modals, toasts, drawers
  gentle: 0.22,   // 220ms: larger dialogs, page transitions
  tab: 0.18,      // 180ms: tab transitions
} as const;

// Easing Curves
export const MOTION_EASINGS = {
  // Smooth deceleration (most common for entrances)
  easeOut: [0.16, 1, 0.3, 1] as const,
  // Balanced transition for exits and transitions
  easeInOut: [0.4, 0, 0.2, 1] as const,
  // Extra calm, organic curve for wellness feel
  calm: [0.22, 1, 0.36, 1] as const,
};

// Standard Transitions
export const calmTransition: Transition = {
  duration: MOTION_DURATIONS.normal,
  ease: MOTION_EASINGS.easeOut,
};

export const fastTransition: Transition = {
  duration: MOTION_DURATIONS.fast,
  ease: MOTION_EASINGS.easeOut,
};

export const tabTransition: Transition = {
  duration: MOTION_DURATIONS.tab,
  ease: MOTION_EASINGS.easeOut,
};

// Press Feedback for Buttons (Scale 0.97 - 0.98)
export const pressFeedback = {
  scale: 0.98,
  transition: {
    duration: 0.1,
    ease: 'easeOut'
  }
};

export const pressFeedbackCompact = {
  scale: 0.96,
  transition: {
    duration: 0.1,
    ease: 'easeOut'
  }
};

// Motion Variants
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: calmTransition 
  },
  exit: { 
    opacity: 0, 
    transition: fastTransition 
  }
};

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: calmTransition 
  },
  exit: { 
    opacity: 0, 
    y: -4, 
    transition: fastTransition 
  }
};

// Message feed container with staggered children
export const messageFeedContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02
    }
  }
};

// Message entrance for Chat bubbles
export const messageBubbleVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 350,
      damping: 28,
      mass: 0.8
    }
  }
};

// Modal Shell Variants (Backdrop & Panel)
export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { duration: MOTION_DURATIONS.normal, ease: MOTION_EASINGS.easeOut } 
  },
  exit: { 
    opacity: 0, 
    transition: { duration: MOTION_DURATIONS.fast, ease: MOTION_EASINGS.easeInOut } 
  }
};

export const modalPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { 
      type: "spring",
      stiffness: 380,
      damping: 26,
      mass: 0.85
    } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: 8,
    transition: { 
      duration: MOTION_DURATIONS.fast, 
      ease: MOTION_EASINGS.easeInOut 
    } 
  }
};

// Slide-over drawer variants for mobile canvas
export const slideOverDrawerVariants: Variants = {
  hidden: { x: '100%', opacity: 0.7 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: { 
      type: "spring", 
      stiffness: 320, 
      damping: 30 
    } 
  },
  exit: { 
    x: '100%', 
    opacity: 0.5,
    transition: { 
      duration: 0.2, 
      ease: MOTION_EASINGS.easeInOut 
    } 
  }
};

// Popover & Dropdown Menu Variants
export const popoverVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: -4 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { 
      duration: MOTION_DURATIONS.fast, 
      ease: MOTION_EASINGS.easeOut 
    } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.96, 
    y: -4,
    transition: { 
      duration: 0.1, 
      ease: MOTION_EASINGS.easeInOut 
    } 
  }
};

// Toast Variants
export const toastItemVariants: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      duration: MOTION_DURATIONS.normal, 
      ease: MOTION_EASINGS.easeOut 
    } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.96, 
    y: 4,
    transition: { 
      duration: MOTION_DURATIONS.fast, 
      ease: MOTION_EASINGS.easeInOut 
    } 
  }
};

// Tab content transitions
export const tabContentVariants: Variants = {
  hidden: { opacity: 0, y: 5 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: MOTION_DURATIONS.tab, 
      ease: MOTION_EASINGS.easeOut 
    } 
  },
  exit: { 
    opacity: 0, 
    y: -4,
    transition: { 
      duration: 0.12, 
      ease: MOTION_EASINGS.easeInOut 
    } 
  }
};

// Page transition
export const pageTransitionVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: MOTION_DURATIONS.normal, 
      ease: MOTION_EASINGS.easeOut 
    } 
  },
  exit: { 
    opacity: 0, 
    y: -6,
    transition: { 
      duration: MOTION_DURATIONS.fast, 
      ease: MOTION_EASINGS.easeInOut 
    } 
  }
};

// Reduced motion fallback variants (instant / gentle opacity only)
export const reducedMotionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.01 } },
  exit: { opacity: 0, transition: { duration: 0.01 } }
};
