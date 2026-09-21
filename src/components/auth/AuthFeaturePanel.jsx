import Logo from '../Logo';
import AuthFeatureSlider from './AuthFeatureSlider';

const AuthFeaturePanel = () => (
  <aside className="fh-auth-mesh hidden lg:flex lg:w-[48%] xl:w-[50%] flex-col bg-gradient-to-b from-[#063532] via-primary-900 to-[#031c1b] text-white shadow-sidebar">
    <div className="relative z-[1] flex flex-col justify-center flex-1 p-10 xl:p-12 max-w-xl w-full">
      <div className="mb-10">
        <Logo variant="light" />
      </div>

      <div className="min-w-0">
        <p className="text-primary-300 text-[11px] font-light uppercase tracking-[0.22em] mb-4">
          Built for finance teams
        </p>
        <h2 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-[0.95] text-white mb-5">
          Your complete finance operations hub
        </h2>
        <p className="text-teal-100/85 text-sm xl:text-base font-light leading-relaxed mb-8">
          A private workspace to organize finances, track activity, and make confident decisions — all in
          one place.
        </p>

        <AuthFeatureSlider variant="dark" showArrows />
      </div>
    </div>
  </aside>
);

export default AuthFeaturePanel;
