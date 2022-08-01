import type { UserHotbarEntry } from '@src/features/hotbar-entry';
import { EP } from '@src/foundry/system';
import { UpdateStore } from './update-store';

export class UserEP extends User {
  #updater?: UpdateStore<this['data']>;

  get updater() {
    if (!this.#updater) {
      this.#updater = new UpdateStore({
        getData: () => this.data,
        isEditable: () => !!this.isOwner || this === game.user,
        setData: (update) => this.update(update),
      });
    }
    return this.#updater;
  }

  get epFlags() {
    return this.data.flags[EP.Name] || {};
  }

  // get color() {
  //   return this.data.color;
  // }
}
