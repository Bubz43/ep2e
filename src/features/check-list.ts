import { mapToObj } from 'remeda';

export const checkList = <T extends string>(
  list: T[],
  allOptions: readonly T[],
) => {
  const fullObj = mapToObj(allOptions, (option) => [
    option,
    list.includes(option),
  ]);
  return [
    fullObj,
    (changed: Partial<Record<T, boolean>>) =>
      allOptions.flatMap((option) => {
        const active = changed[option] ?? fullObj[option];
        return active ? option : [];
      }),
  ] as const;
};
