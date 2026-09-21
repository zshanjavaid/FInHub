import { button as MotionButton, div as MotionDiv } from 'motion/react-m';
import { enterTransition, overlayTransition, tapTransition } from './tokens';

export const Overlay = ({ className = '', children, onClick, style, ...rest }) => (
  <MotionDiv
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={overlayTransition}
    className={className}
    style={style}
    onClick={onClick}
    {...rest}
  >
    {children}
  </MotionDiv>
);

export const OverlayButton = ({ className = '', children, ...rest }) => (
  <MotionButton
    type="button"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={overlayTransition}
    className={className}
    {...rest}
  >
    {children}
  </MotionButton>
);

export const PopIn = ({ className = '', children, onClick, ...rest }) => (
  <MotionDiv
    initial={{ opacity: 0, y: 18 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 12 }}
    transition={enterTransition}
    className={className}
    onClick={onClick}
    {...rest}
  >
    {children}
  </MotionDiv>
);

export const Rise = ({ className = '', children, delay = 0, ...rest }) => (
  <MotionDiv
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ ...enterTransition, delay }}
    className={className}
    {...rest}
  >
    {children}
  </MotionDiv>
);

export const Press = ({ className = '', children, disabled, hoverLift = false, ...rest }) => (
  <MotionButton
    whileTap={disabled ? undefined : { scale: 0.97 }}
    whileHover={hoverLift && !disabled ? { y: -2 } : undefined}
    transition={tapTransition}
    disabled={disabled}
    className={className}
    {...rest}
  >
    {children}
  </MotionButton>
);

export const Lift = ({ className = '', children, ...rest }) => (
  <MotionDiv whileHover={{ y: -2 }} transition={tapTransition} className={className} {...rest}>
    {children}
  </MotionDiv>
);
