import { useState } from 'react';
import { FiSearch, FiChevronDown, FiFileText, FiMoreVertical } from 'react-icons/fi';
import SearchableDropdown from './SearchableDropdown';
import Loader from './Loader';
import DeleteConfirmModal from './DeleteConfirmModal';
import {
  tableElementClass,
  tableHeadCellClass,
  tableBodyCellClass,
  tableScrollWrapClass
} from '../constants/tableStyles';
import {
  chartCardClass,
  chartCardHeaderClass,
  chartCardIconWrapClass,
  chartCardTitleClass,
  chartCardSubtitleClass
} from '../constants/chartCardStyles';

const DataTable = ({
  data = [],
  columns = [],
  title = 'Table',
  isLoading = false,
  onEdit,
  onDelete,
  onApprove,
  getCanApprove,
  searchConfig = {
    enabled: true,
    placeholder: 'Search...',
    searchFields: []
  },
  filters = [],
  additionalFilters = null,
  emptyTitle = 'No Data Yet',
  emptyDescription = 'Get started by adding your first entry',
  titleActions = null,
  getRowClassName = null,
  headerSummary = null,
  sortCompare = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValues, setFilterValues] = useState({});
  const [openDropdownIndex, setOpenDropdownIndex] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const getMenuHeightEstimate = ({ canApprove }) => {
    const itemsCount = (onEdit ? 1 : 0) + (canApprove ? 1 : 0) + (onDelete ? 1 : 0);
    return Math.max(44, itemsCount * 40 + 12);
  };

  const filteredData = data.filter((item) => {
    if (searchConfig.enabled && searchTerm) {
      const matchesSearch = searchConfig.searchFields.some(field => {
        const value = item[field];
        return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
      });
      if (!matchesSearch) return false;
    }

    return filters.every(filter => {
      const filterValue = filterValues[filter.key] || 'All';
      if (filterValue === 'All' || filterValue === '') return true;
      return item[filter.key] === filterValue;
    });
  });

  const currentData = sortCompare ? [...filteredData].sort(sortCompare) : filteredData;

  const headerSummaryColIndex =
    headerSummary && columns.length > 0
      ? columns.findIndex((c) => c.key === headerSummary.columnKey)
      : -1;
  const headerSummaryNumeric =
    headerSummary && headerSummaryColIndex >= 0 && typeof headerSummary.aggregate === 'function'
      ? headerSummary.aggregate(currentData)
      : null;
  const headerSummaryDisplay =
    headerSummaryNumeric != null && Number.isFinite(headerSummaryNumeric)
      ? (headerSummary.format ? headerSummary.format(headerSummaryNumeric) : String(headerSummaryNumeric))
      : null;

  const getFilterOptions = (filter) => {
    if (filter.options) return filter.options;
    const uniqueValues = ['All', ...new Set(data.map(item => item[filter.key]).filter(Boolean))].sort();
    return uniqueValues;
  };

  const tableHeader = (
    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
      <div className={`${chartCardIconWrapClass} bg-primary-100 text-primary-600`}>
        <FiFileText className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="min-w-0">
        <h3 className={`${chartCardTitleClass} truncate`}>{title}</h3>
        <p className={chartCardSubtitleClass}>Search and filter below</p>
      </div>
    </div>
  );

  const tableCardClass = chartCardClass;

  const renderTableHeaderBar = () => (
    <div
      className={`${chartCardHeaderClass} flex flex-col sm:flex-row flex-wrap justify-between items-start sm:items-center gap-3 sm:gap-4`}
    >
      {tableHeader}
      {titleActions ? <div className="w-full sm:w-auto min-w-0">{titleActions}</div> : null}
    </div>
  );

  const renderEmptyState = (Icon, iconBgClass, iconClass, heading, description) => (
    <div className="text-center py-8 sm:py-10 px-4 sm:px-6">
      <div
        className={`w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-xl sm:rounded-2xl flex items-center justify-center ${iconBgClass}`}
      >
        <Icon className={iconClass} />
      </div>
      <h4 className="text-base sm:text-lg font-bold text-slate-800 mb-1 sm:mb-1.5 px-2">{heading}</h4>
      <p className="text-slate-500 text-xs sm:text-sm max-w-[16rem] sm:max-w-sm mx-auto leading-relaxed px-2">
        {description}
      </p>
    </div>
  );

  if (isLoading) {
    return (
      <div className={tableCardClass}>
        {renderTableHeaderBar()}
        <div className="flex justify-center py-6 sm:py-8 px-4">
          <Loader size="sm" className="py-4" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={tableCardClass}>
        {renderTableHeaderBar()}
        {renderEmptyState(
          FiFileText,
          'bg-primary-100',
          'w-7 h-7 sm:w-8 sm:h-8 text-primary-500',
          emptyTitle,
          emptyDescription
        )}
      </div>
    );
  }

  return (
    <div className={tableCardClass}>
      {renderTableHeaderBar()}

      <div className="p-3 sm:p-4 md:p-5 bg-slate-100/60 border-b border-slate-200/80 flex flex-col md:flex-row gap-3 sm:gap-4">
        {searchConfig.enabled && (
          <div className="flex-1 min-w-0">
            <label className="text-xs sm:text-sm font-semibold mb-2 sm:mb-2.5 text-slate-700 capitalize tracking-wide block">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={searchConfig.placeholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 sm:px-4 sm:py-2.5 pl-9 sm:pl-10 text-sm border-2 border-slate-300 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus-visible:ring-2 focus-visible:ring-primary-500/30"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <FiSearch className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          </div>
        )}

        {filters.map((filter) => (
          <div key={filter.key} className="w-full md:w-auto shrink-0 min-w-0">
            {filter.type === 'searchable' ? (
              <SearchableDropdown
                label={filter.label}
                value={filterValues[filter.key] === 'All' ? '' : filterValues[filter.key] || ''}
                onChange={(value) => setFilterValues(prev => ({ ...prev, [filter.key]: value || 'All' }))}
                options={getFilterOptions(filter).filter(opt => opt !== 'All')}
                placeholder={filter.placeholder || `All ${filter.label}s`}
                leftIcon={filter.icon}
                layout="md"
              />
            ) : (
              <div>
                <label className="text-xs sm:text-sm font-semibold mb-2 sm:mb-2.5 text-slate-700 capitalize tracking-wide block">
                  {filter.label}
                </label>
                <div className="relative">
                  <select
                    value={filterValues[filter.key] || 'All'}
                    onChange={(e) => setFilterValues(prev => ({ ...prev, [filter.key]: e.target.value }))}
                    className="w-full px-4 py-2.5 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus-visible:ring-2 focus-visible:ring-primary-500/30 appearance-none bg-white pr-10 cursor-pointer text-slate-700"
                  >
                    {getFilterOptions(filter).map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <FiChevronDown className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {additionalFilters && (
          <div className="flex items-end gap-2 flex-shrink-0">
            {additionalFilters}
          </div>
        )}
      </div>

      {currentData.length === 0 ? (
        <div className="text-center py-8 sm:py-10 px-4 sm:px-6">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-xl sm:rounded-2xl bg-slate-100 flex items-center justify-center">
            <FiSearch className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-600 font-semibold text-sm sm:text-base">No results found</p>
          <p className="text-slate-500 text-sm mt-1">Try adjusting your search or filter</p>
        </div>
      ) : (
        <>
          <div
            className={tableScrollWrapClass}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <table className={tableElementClass}>
              <thead>
                {headerSummaryDisplay != null && headerSummaryColIndex >= 0 ? (
                  <tr className="bg-slate-50 border-b border-slate-200/80">
                    {headerSummaryColIndex > 0 ? (
                      <th
                        colSpan={headerSummaryColIndex}
                        className={tableHeadCellClass('text-right')}
                      >
                        {headerSummary.label ?? 'Total'}
                      </th>
                    ) : null}
                    <th
                      className={`${tableBodyCellClass('text-center', 'font-bold text-primary-800 tabular-nums')} ${
                        headerSummaryColIndex > 0 ? 'border-l border-primary-200/50' : ''
                      }`}
                      colSpan={1}
                    >
                      {headerSummaryDisplay}
                    </th>
                    {headerSummaryColIndex < columns.length - 1 ? (
                      <th
                        colSpan={columns.length - headerSummaryColIndex - 1}
                        className="py-2 px-2 sm:py-2.5 sm:px-4 border-l-0"
                        aria-hidden
                      />
                    ) : null}
                    {(onEdit || onDelete || onApprove) && (
                      <th className="py-2 px-2 sm:py-2.5 sm:px-4 bg-slate-50" aria-hidden />
                    )}
                  </tr>
                ) : null}
                <tr className="bg-slate-100 border-b-2 border-slate-200">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={`${tableHeadCellClass(column.align || 'text-center')} ${column.className || ''}`}
                    >
                      {column.label}
                    </th>
                  ))}
                  {(onEdit || onDelete || onApprove) && (
                    <th className={tableHeadCellClass('text-center')}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {currentData.map((item, localIndex) => {
                    const uniqueId = item.id ?? `row-${localIndex}`;
                    const hasRowAction = onEdit || onDelete || (onApprove && getCanApprove && getCanApprove(item));
                    const isEven = localIndex % 2 === 0;
                    const rowAccent = getRowClassName?.(item, localIndex);
                    const trClass = rowAccent
                      ? `border-b border-slate-100 ${rowAccent} transition-colors`
                      : `border-b border-slate-100 ${isEven ? 'bg-white' : 'bg-slate-50/60'} hover:bg-primary-50/50 transition-colors`;
                    return (
                      <tr key={uniqueId} className={trClass}>
                        {columns.map((column) => (
                          <td
                            key={column.key}
                            className={`${tableBodyCellClass(column.align || 'text-center')} ${column.className || ''}`}
                          >
                            {column.render ? column.render(item[column.key], item) : (item[column.key] || '-')}
                          </td>
                        ))}
                        {(onEdit || onDelete || onApprove) && (
                          <td className={tableBodyCellClass('text-center')}>
                            {hasRowAction ? (
                            <div className="relative inline-block">
                              <button
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const canApprove = !!(onApprove && getCanApprove && getCanApprove(item));
                                  const menuHeight = getMenuHeightEstimate({ canApprove });
                                  const preferredTop = rect.bottom + 4;
                                  const maxTop = window.innerHeight - menuHeight - 8;
                                  const flippedTop = rect.top - menuHeight - 4;
                                  const top =
                                    preferredTop > maxTop && flippedTop >= 8
                                      ? flippedTop
                                      : Math.min(preferredTop, Math.max(8, maxTop));
                                  setDropdownPosition({
                                    top,
                                    right: window.innerWidth - rect.right
                                  });
                                  setOpenDropdownIndex(openDropdownIndex === uniqueId ? null : uniqueId);
                                }}
                                className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl hover:bg-primary-100 text-slate-600 hover:text-primary-700 transition-colors"
                              >
                                <FiMoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
                              </button>
                            </div>
                            ) : null}
                          </td>
                        )}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {openDropdownIndex && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpenDropdownIndex(null)}
              ></div>
              <div
                className="fixed w-36 bg-white rounded-xl shadow-modal border border-slate-200 z-50 py-1"
                style={{
                  top: `${dropdownPosition.top}px`,
                  right: `${dropdownPosition.right}px`
                }}
              >
                {(() => {
                  const item = currentData.find((_, idx) => {
                    const id = currentData[idx].id ?? `row-${idx}`;
                    return id === openDropdownIndex;
                  });
                  const canApprove = item && onApprove && getCanApprove && getCanApprove(item);
                  return (
                    <>
                      {onEdit && (
                        <button
                          onClick={() => {
                            if (item) onEdit(item, item.id);
                            setOpenDropdownIndex(null);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-t-xl font-semibold"
                        >
                          Edit
                        </button>
                      )}
                      {canApprove && (
                        <button
                          onClick={() => {
                            if (item) {
                              onApprove(item.id);
                              setOpenDropdownIndex(null);
                            }
                          }}
                          className={`w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 font-semibold ${!onEdit ? 'rounded-t-lg' : ''}`}
                        >
                          Approve
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => {
                            if (item) {
                              setDeleteTarget({ id: item.id, item });
                              setOpenDropdownIndex(null);
                            }
                          }}
                          className={`w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-semibold ${!onEdit && !canApprove ? 'rounded-t-xl' : ''} rounded-b-xl`}
                        >
                          Delete
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </>
          )}

        </>
      )}

      {onDelete && (
        <DeleteConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (!deleteTarget) return;
            setIsDeleting(true);
            try {
              await onDelete(deleteTarget.id);
              setDeleteTarget(null);
            } finally {
              setIsDeleting(false);
            }
          }}
          title="Delete Item"
          message="Are you sure you want to delete this item? This action cannot be undone."
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
};

export default DataTable;
