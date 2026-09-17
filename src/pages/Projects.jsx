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
import { filterByDateRange } from '../utils/date';
import { useDateFilter } from '../hooks/useDateFilter';
import { useClientOptions } from '../hooks/useClientOptions';
import { isApproved } from '../constants/app';
import { PROJECT_TYPE_OPTIONS, PROJECT_TYPE_LABELS } from '../constants/projectTypes';
import ErrorAlert from '../components/ErrorAlert';
import PageContainer from '../components/PageContainer';
import ProjectInsightsSummaryCard from '../components/ProjectInsightsSummaryCard';
import { getTaxFormDefaultsFromProject, prepareProjectForFirestore } from '../utils/project';

const PROJECT_STATUS_FILTER_LABELS = ['All', 'Active', 'Inactive'];

const normalizeProjectStatus = (p) =>
  String(p?.projectStatus || 'active').trim().toLowerCase();

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
  const [initialValues, setInitialValues] = useState({
    client: '',
    date: '',
    project: '',
    projectType: '',
    projectStatus: 'active',
    payoutOccurrence: 'biweekly',
    totalMonthlyHours: '',
    hourlyRate: '',
    projectCost: '',
    recruiterName: '',
    lead: '',
    projectManager: '',
    contractEnding: '',
    brokerageType: 'percentage',
    brokerageValue: '',
    taxType: 'percentage',
    taxValue: ''
  });

  const filteredProjects = useMemo(() => {
    let list = filterByDateRange(projects || [], dateFrom, dateTo, (p) => p.date);
    if (selectedBroker) list = list.filter((p) => (p.client || '').trim() === selectedBroker);
    if (selectedProjectType) list = list.filter((p) => (p.projectType || '').trim() === selectedProjectType);
    if (statusFilter === 'active') {
      list = list.filter((p) => normalizeProjectStatus(p) === 'active');
    } else if (statusFilter === 'inactive') {
      list = list.filter((p) => normalizeProjectStatus(p) === 'inactive');
    }
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
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    const contractEndingDefault = d.toISOString().slice(0, 10);
    setInitialValues({
      client: '',
      date: '',
      project: '',
      projectType: '',
      projectStatus: 'active',
      payoutOccurrence: 'biweekly',
      totalMonthlyHours: '',
      hourlyRate: '',
      projectCost: '',
      recruiterName: '',
      lead: '',
      projectManager: '',
      contractEnding: contractEndingDefault,
      brokerageType: 'percentage',
      brokerageValue: '',
      taxType: 'percentage',
      taxValue: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (project, projectId) => {
    setEditingProjectId(projectId);
    setInitialValues({
      client: project.client || '',
      date: project.date || '',
      project: project.project || '',
      projectType: project.projectType || '',
      projectStatus: project.projectStatus || 'active',
      payoutOccurrence: project.payoutOccurrence || 'biweekly',
      totalMonthlyHours: project.totalMonthlyHours || '',
      hourlyRate: project.hourlyRate || '',
      projectCost:
        project.projectCost != null && project.projectCost !== '' ? String(project.projectCost) : '',
      recruiterName: project.recruiterName || '',
      lead: project.lead || '',
      projectManager: project.projectManager || '',
      contractEnding: project.contractEnding || '',
      brokerageType: project.brokerageType || 'percentage',
      brokerageValue: project.brokerageValue || '',
      ...getTaxFormDefaultsFromProject(project)
    });
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

