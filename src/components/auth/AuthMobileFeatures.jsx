import AuthFeatureSlider from './AuthFeatureSlider';

const AuthMobileFeatures = () => (
  <div className="w-full min-w-0">
    <p className="text-[11px] font-light text-primary-300/95 mb-2 text-center uppercase tracking-[0.22em]">
      Why FinHub
    </p>
    <AuthFeatureSlider variant="dark" showArrows={false} />
  </div>
);

export default AuthMobileFeatures;
