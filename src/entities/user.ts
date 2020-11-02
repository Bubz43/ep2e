import type { UserHotbarEntry } from '@src/features/hotbar-entry';
import { EP } from '@src/foundry/system';
import { UpdateStore } from './update-store';

export class UserEP extends User {
  #updater?: UpdateStore<this['data']>;
  #hotbar?: Map<number, UserHotbarEntry> | null;

  get updater() {
    if (!this.#updater) {
      this.#updater = new UpdateStore({
        getData: () => this.data,
        isEditable: () => !!this.owner || this === game.user,
        setData: (update) => this.update(update),
      });
    }
    return this.#updater;
  }

  get epFlags() {
    return this.data.flags[EP.Name] || {};
  }

  get hotbar() {
    if (!this.#hotbar) {
      this.#hotbar = new Map(
        (this.epFlags.hotbar || []).map((entry) => [entry.cell, entry]),
      );
    }
    return this.#hotbar;
  }

  // get color() {
  //   return this.data.color;
  // }

  get avatar() {
    return super.avatar as string;
  }

  get name() {
    return this.data.name;
  }

  _onUpdate(data: Partial<this['data']>, ...args: unknown[]) {
    super._onUpdate(data, ...args);
    this.#hotbar = null;
  }
}
