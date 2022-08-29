import { EP } from '@src/foundry/system';
import { UpdateStore } from './update-store';

export class UserEP extends User {
  #updater?: UpdateStore<UserData>;

  get updater() {
    if (!this.#updater) {
      this.#updater = new UpdateStore({
        getData: () => this.toJSON(),
        isEditable: () => !!this.isOwner || this === game.user,
        setData: (update) => this.update(update),
      });
    }
    return this.#updater;
  }

  get epFlags() {
    return this.flags[EP.Name] || {};
  }

  // get color() {
  //   return this.data.color;
  // }
}
