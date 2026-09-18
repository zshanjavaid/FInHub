const PageContainer = ({ children, className = '' }) => (
  <div className={`p-4 sm:p-6 md:p-8 lg:p-10 w-full min-w-0 ${className}`}>
    <div className="w-full min-w-0 space-y-6 md:space-y-8">{children}</div>
  </div>
);

export default PageContainer;
