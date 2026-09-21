import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useAuth } from '../contexts/AuthContext';
import { createProject, editProject, fetchProjects, removeProject } from '../store/projects/projectsSlice';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import FilterBar from '../components/FilterBar';
import SearchableDropdown from '../components/SearchableDropdown';
import ProjectTable from '../components/ProjectTable';
import ProjectFormModal from '../components/ProjectFormModal';
import { useDateFilter } from '../hooks/useDateFilter';
import { useClientOptions } from '../hooks/useClientOptions';
import { isApproved } from '../constants/app';
import { PROJECT_TYPE_OPTIONS, PROJECT_TYPE_LABELS } from '../constants/projectTypes';
import ErrorAlert from '../components/ErrorAlert';
import PageContainer from '../components/PageContainer';
import ProjectInsightsSummaryCard from '../components/ProjectInsightsSummaryCard';
import { prepareProjectForFirestore } from '../utils/project';
import { EMPTY_PROJECT_FORM, projectToFormValues } from '../utils/formValues';
import { projectMatchesStatusInRange } from '../utils/transactionsEligibility';
import { addMonthsLocalYmd } from '../utils/date';

const PROJECT_STATUS_FILTER_LABELS = ['All', 'Active', 'Inactive'];

const Projects = () => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const projects = useSelector((state) => state.projects.items);
  const isLoading = useSelector((state) => state.projects.isLoading);
  const error = useSelector((state) => state.projects.error);

  const dateFilter = useDateFilter({ defaultMode: 'yearly' });
  const { effectiveDateFrom: dateFrom, effectiveDateTo: dateTo } = dateFilter;
  const [selectedBroker, setSelectedBroker] = useState('');
  const [selectedProjectType, setSelectedProjectType] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [initialValues, setInitialValues] = useState(EMPTY_PROJECT_FORM);

  const filteredProjects = useMemo(() => {
    let list = (projects || []).filter((p) =>
      projectMatchesStatusInRange(p, statusFilter, dateFrom, dateTo)
    );
    if (selectedBroker) list = list.filter((p) => (p.client || '').trim() === selectedBroker);
    if (selectedProjectType) list = list.filter((p) => (p.projectType || '').trim() === selectedProjectType);
    return list;
  }, [projects, dateFrom, dateTo, selectedBroker, selectedProjectType, statusFilter]);

  const projectsForActivity = useMemo(
    () => (projects || []).filter(isApproved),
    [projects]
  );

  const approvedForTable = useMemo(
    () => (filteredProjects || []).filter(isApproved),
    [filteredProjects]
  );

  useEffect(() => {
    document.title = 'Projects | FinHub';
  }, []);

  useEffect(() => {
    dispatch(fetchProjects());
  }, [dispatch]);

  const clientOptions = useClientOptions(projects);

  const openAddModal = () => {
    setEditingProjectId(null);
    setInitialValues({
      ...EMPTY_PROJECT_FORM,
      contractEnding: addMonthsLocalYmd(6)
    });
    setIsModalOpen(true);
  };

  const openEditModal = (project, projectId) => {
    setEditingProjectId(projectId);
    setInitialValues(projectToFormValues(project));
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const onSubmit = async (values) => {
    const payload = prepareProjectForFirestore(values);
    if (editingProjectId) {
      await dispatch(editProject({ projectId: editingProjectId, projectData: payload })).unwrap();
      setEditingProjectId(null);
    } else {
      const projectData = user?.uid ? { ...payload, createdBy: user.uid } : { ...payload };
      await dispatch(createProject(projectData)).unwrap();
    }

    setIsModalOpen(false);
  };

  const onDelete = async (projectId) => {
    await dispatch(removeProject(projectId)).unwrap();
  };

  return (
    <PageContainer>
      <PageHeader title="Projects" actions={<Button onClick={openAddModal}>Add Project</Button>} />

      <FilterBar dateFilter={dateFilter}>
        <SearchableDropdown
          label="Broker"
          value={selectedBroker}
          onChange={setSelectedBroker}
          options={clientOptions}
          placeholder="All Brokers"
          layout="filter"
        />
        <SearchableDropdown
          label="Project Type"
          value={selectedProjectType}
          onChange={setSelectedProjectType}
          options={PROJECT_TYPE_LABELS}
          placeholder="All Types"
          layout="filter"
        />
        <SearchableDropdown
          label="Status"
          value={
            statusFilter === 'inactive'
              ? 'Inactive'
              : statusFilter === 'all'
                ? 'All'
                : 'Active'
          }
          onChange={(label) => {
            if (!label) {
              setStatusFilter('active');
              return;
            }
            if (label === 'Inactive') setStatusFilter('inactive');
            else if (label === 'All') setStatusFilter('all');
            else setStatusFilter('active');
          }}
          options={PROJECT_STATUS_FILTER_LABELS}
          placeholder="Status"
          layout="filter"
        />
      </FilterBar>

      <ErrorAlert message={error} />

      <ProjectInsightsSummaryCard activityProjects={projectsForActivity} />

      <ProjectTable
        projects={approvedForTable}
        onDelete={onDelete}
        onEdit={openEditModal}
        isLoading={isLoading}
        title="Project Details"
        hideFilters={['client', 'projectType']}
      />

      <ProjectFormModal
        key={editingProjectId || 'new'}
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingProjectId ? 'Edit Project' : 'Add Project'}
        clientOptions={clientOptions}
        projectTypeOptions={PROJECT_TYPE_OPTIONS}
        initialValues={initialValues}
        onSubmit={onSubmit}
        isSaving={isLoading}
        projects={projects}
      />
    </PageContainer>
  );
};

export default Projects;

