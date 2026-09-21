import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';

const defaultTransition = { duration: 0.22, ease: [0.22, 1, 0.36, 1] };

const MotionProvider = ({ children }) => (
  <MotionConfig reducedMotion="user" transition={defaultTransition}>
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  </MotionConfig>
);

export default MotionProvider;
