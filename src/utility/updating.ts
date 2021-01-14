export const withUpdate = <T extends { [key: string]: unknown }>(
  data: T,
  update: (changed: Partial<T>) => void,
) => ({
  ...data,
  update,
});

export type WithUpdate<T extends { [key: string]: unknown }> = T & {
  update: (changed: Partial<T>) => void;
};
