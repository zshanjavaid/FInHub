import Logo from '../Logo';
import AuthFeatureSlider from './AuthFeatureSlider';

const AuthFeaturePanel = () => (
  <aside className="hidden lg:flex lg:w-[48%] xl:w-[50%] flex-col bg-gradient-to-b from-[#063532] via-primary-900 to-[#031c1b] text-white shadow-sidebar">
    <div className="flex flex-col justify-center flex-1 p-10 xl:p-12 max-w-xl w-full">
      <div className="mb-10">
        <Logo variant="light" />
      </div>

      <div className="min-w-0">
        <p className="text-primary-300 text-[11px] font-semibold uppercase tracking-[0.14em] mb-3">
          Built for finance teams
        </p>
        <h2 className="text-3xl xl:text-[2.1rem] font-bold tracking-tight leading-[1.15] text-white mb-4">
          Your complete finance operations hub
        </h2>
        <p className="text-teal-100/85 text-sm xl:text-base leading-relaxed mb-8">
          A private workspace to organize finances, track activity, and make confident decisions — all in
          one place.
        </p>

        <AuthFeatureSlider variant="dark" showArrows />
      </div>
    </div>
  </aside>
);

export default AuthFeaturePanel;
