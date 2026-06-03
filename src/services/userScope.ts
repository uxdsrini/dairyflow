export const belongsToUser = (data: { createdBy?: string }, userId?: string) => {
  if (!userId) return true;
  return data.createdBy === userId;
};

export const filterByUser = <T extends { createdBy?: string }>(items: T[], userId?: string): T[] => {
  if (!userId) return items;
  return items.filter((item) => belongsToUser(item, userId));
};
