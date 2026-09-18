import { collection, addDoc, getDocs, getDoc, deleteDoc, doc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { ENTRY_STATUS } from '../constants/app';
import { needsAutoInactiveStatus, normalizeDateToYYYYMMDD } from '../utils/date';

export const getAllProjects = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'projects'));
    const projects = [];
    querySnapshot.forEach((doc) => {
      projects.push({ id: doc.id, ...doc.data() });
    });
    return projects;
  } catch (error) {
    console.error('Error loading projects:', error);
    throw error;
  }
};

export const saveProject = async (projectData) => {
  try {
    const createdBy = projectData.createdBy ?? null;
    const status = createdBy ? ENTRY_STATUS.PENDING : ENTRY_STATUS.APPROVED;
    const nextProjStatus = String(projectData.projectStatus || 'active').trim().toLowerCase();
    const dataWithTimestamp = {
      ...projectData,
      createdBy,
      status,
      createdAt: new Date().toISOString()
    };
    if (nextProjStatus === 'inactive') {
      dataWithTimestamp.inactiveAt = new Date().toISOString();
    }
    const docRef = await addDoc(collection(db, 'projects'), dataWithTimestamp);
    return docRef.id;
  } catch (error) {
    console.error('Error saving project:', error);
    throw error;
  }
};

export const updateProject = async (projectId, projectData) => {
  try {
    const ref = doc(db, 'projects', projectId);
    const snap = await getDoc(ref);
    const prev = snap.exists() ? snap.data() : {};
    const prevStatus = String(prev.projectStatus || 'active').trim().toLowerCase();
    const nextStatus = String(
      projectData.projectStatus !== undefined && projectData.projectStatus !== null
        ? projectData.projectStatus
        : prev.projectStatus || 'active'
    ).trim().toLowerCase();

    const { inactiveAt: clientInactiveAt, ...rest } = projectData;
    const payload = {
      ...rest,
      updatedAt: new Date().toISOString()
    };

    if (nextStatus === 'inactive' && prevStatus !== 'inactive') {
      // Allow callers (auto-inactive) to pass the real end date; otherwise stamp now.
      if (clientInactiveAt) {
        payload.inactiveAt = clientInactiveAt;
      } else {
        payload.inactiveAt = new Date().toISOString();
      }
    } else if (nextStatus === 'active') {
      payload.inactiveAt = deleteField();
    }

    await updateDoc(ref, payload);
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
};

/**
 * Sets projectStatus to inactive for active projects whose End Date (contractEnding) has passed.
 * Returns how many were updated. Stamps inactiveAt to the End Date (not "now").
 */
export const inactivateExpiredProjects = async (projects = []) => {
  const due = (projects || []).filter((p) => p?.id && needsAutoInactiveStatus(p));
  if (!due.length) return 0;

  const results = await Promise.allSettled(
    due.map((p) => {
      const endYmd = normalizeDateToYYYYMMDD(p.contractEnding);
      return updateProject(p.id, {
        projectStatus: 'inactive',
        ...(endYmd ? { inactiveAt: `${endYmd}T12:00:00.000Z` } : {})
      });
    })
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length) {
    console.error('Failed to auto-inactivate some expired projects:', failed.map((r) => r.reason));
  }

  return results.filter((r) => r.status === 'fulfilled').length;
};

export const deleteProject = async (projectId) => {
  try {
    await deleteDoc(doc(db, 'projects', projectId));
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

export const approveProject = async (projectId, approvedBy) => {
  try {
    await updateDoc(doc(db, 'projects', projectId), {
      status: ENTRY_STATUS.APPROVED,
      approvedBy,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error approving project:', error);
    throw error;
  }
};
