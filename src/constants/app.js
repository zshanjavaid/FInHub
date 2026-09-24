/** Keep in sync with firestore.rules maxUsers(). */
export const MAX_USERS = 2;

export const ENTRY_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved'
};

export const isApproved = (item) => {
  const s = item?.status;
  return s === ENTRY_STATUS.APPROVED || s === undefined || s === null;
};
