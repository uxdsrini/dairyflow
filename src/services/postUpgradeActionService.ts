export type PostUpgradeAction = 'resume_add_customer';

const STORAGE_KEY = 'dairyflow-post-upgrade-action';

export const savePostUpgradeAction = (action: PostUpgradeAction) => {
  sessionStorage.setItem(STORAGE_KEY, action);
};

export const consumePostUpgradeAction = (): PostUpgradeAction | null => {
  const action = sessionStorage.getItem(STORAGE_KEY) as PostUpgradeAction | null;
  if (!action) {
    return null;
  }

  sessionStorage.removeItem(STORAGE_KEY);
  return action;
};

export const clearPostUpgradeAction = () => {
  sessionStorage.removeItem(STORAGE_KEY);
};
