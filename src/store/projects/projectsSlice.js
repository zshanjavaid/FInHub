import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ENTRY_STATUS } from '../../constants/app';
import {
  getAllProjects as getAllProjectsService,
  saveProject as saveProjectService,
  updateProject as updateProjectService,
  deleteProject as deleteProjectService,
  approveProject as approveProjectService,
  inactivateExpiredProjects as inactivateExpiredProjectsService
} from '../../services/projectService';
import { shouldSkipListFetch } from '../../utils/fetchGate';

export const fetchProjects = createAsyncThunk(
  'projects/fetchAll',
  async () => {
    const projects = await getAllProjectsService();
    const inactivated = await inactivateExpiredProjectsService(projects);
    if (inactivated > 0) {
      return await getAllProjectsService();
    }
    return projects;
  },
  {
    condition: (arg, { getState }) => !shouldSkipListFetch(getState().projects, arg)
  }
);

export const createProject = createAsyncThunk('projects/create', async (projectData, { dispatch }) => {
  await saveProjectService(projectData);
  await dispatch(fetchProjects({ force: true }));
});

export const editProject = createAsyncThunk(
  'projects/edit',
  async ({ projectId, projectData }, { dispatch }) => {
    await updateProjectService(projectId, projectData);
    await dispatch(fetchProjects({ force: true }));
  }
);

export const removeProject = createAsyncThunk(
  'projects/delete',
  async (projectId, { dispatch, rejectWithValue }) => {
    try {
      await deleteProjectService(projectId);
      return projectId;
    } catch (error) {
      await dispatch(fetchProjects({ force: true }));
      return rejectWithValue(error?.message || 'Failed to delete project');
    }
  }
);

export const approveProject = createAsyncThunk(
  'projects/approve',
  async ({ projectId, approvedBy }, { dispatch, rejectWithValue }) => {
    try {
      await approveProjectService(projectId, approvedBy);
      return { projectId, approvedBy };
    } catch (error) {
      await dispatch(fetchProjects({ force: true }));
      return rejectWithValue(error?.message || 'Failed to approve project');
    }
  }
);

const setsLoadingOnMutation = (action) => {
  const t = action.type;
  return t.startsWith('projects/create/') || t.startsWith('projects/edit/');
};

const projectsSlice = createSlice({
  name: 'projects',
  initialState: {
    items: [],
    isLoading: false,
    error: null,
    lastFetchedAt: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        if (!state.items.length) state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.items = action.payload || [];
        state.isLoading = false;
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error?.message || 'Failed to load projects';
      })
      .addCase(approveProject.pending, (state, action) => {
        const { projectId, approvedBy } = action.meta.arg;
        const item = state.items.find((i) => i.id === projectId);
        if (item) {
          item.status = ENTRY_STATUS.APPROVED;
          item.approvedBy = approvedBy;
          item.approvedAt = new Date().toISOString();
        }
      })
      .addCase(approveProject.rejected, (state, action) => {
        state.error = action.payload || action.error?.message || 'Failed to approve project';
      })
      .addCase(removeProject.pending, (state, action) => {
        state.items = state.items.filter((i) => i.id !== action.meta.arg);
      })
      .addCase(removeProject.rejected, (state, action) => {
        state.error = action.payload || action.error?.message || 'Failed to delete project';
      })
      .addMatcher(setsLoadingOnMutation, (state, action) => {
        if (action.type.endsWith('/pending')) {
          state.isLoading = true;
          state.error = null;
        }
        if (action.type.endsWith('/rejected')) {
          state.isLoading = false;
          state.error = action.error?.message || 'Project action failed';
        }
        if (action.type.endsWith('/fulfilled')) {
          state.isLoading = false;
        }
      });
  }
});

export default projectsSlice.reducer;
