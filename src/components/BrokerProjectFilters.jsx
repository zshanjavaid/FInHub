import SearchableDropdown from './SearchableDropdown';

/**
 * Shared Broker / Project filter fields for use inside FilterBar.
 * When Project is shown, changing Broker clears the selected project.
 * Project labels should already be broker-aware (see buildProjectFilterOptions).
 */
const BrokerProjectFilters = ({
  brokerOptions = [],
  selectedBroker = '',
  onBrokerChange,
  showProject = false,
  projectOptions = [],
  selectedProjectValue = '',
  onProjectChange,
  brokerPlaceholder = 'All Brokers',
  projectPlaceholderWhenBroker = 'All Projects',
  projectPlaceholderWithoutBroker = 'Select broker first'
}) => {
  const selectedProjectLabel =
    projectOptions.find((p) => p.value === selectedProjectValue)?.label ?? '';

  const handleBrokerChange = (next) => {
    onBrokerChange?.(next);
    if (showProject) onProjectChange?.('');
  };

  const handleProjectChange = (label) => {
    if (!label) {
      onProjectChange?.('');
      return;
    }
    const match = projectOptions.find((p) => p.label === label);
    if (match) onProjectChange?.(match.value);
  };

  return (
    <>
      <SearchableDropdown
        label="Broker"
        value={selectedBroker}
        onChange={handleBrokerChange}
        options={brokerOptions}
        placeholder={brokerPlaceholder}
        layout="filter"
      />
      {showProject ? (
        <SearchableDropdown
          label="Project"
          value={selectedProjectLabel}
          onChange={handleProjectChange}
          options={projectOptions.map((p) => p.label)}
          placeholder={
            selectedBroker ? projectPlaceholderWhenBroker : projectPlaceholderWithoutBroker
          }
          layout="filter"
        />
      ) : null}
    </>
  );
};

export default BrokerProjectFilters;
