export const localImage = (path: string) => `systems/ep2e/build/dist/${path}`;

export const foundryIcon = (name: string) => `icons/svg/${name}.svg`;

export function getDefaultItemIcon() {
  // TODO Fix this
  //@ts-expect-error
  return foundry.documents.BaseItem.DEFAULT_ICON;
  //   return foundry.data.ItemData.DEFAULT_ICON;
}
