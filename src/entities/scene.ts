import type { EntitySheet } from '@src/foundry/foundry-cont';
import { EP } from '@src/foundry/system';
import { LazyGetter } from 'lazy-get-decorator';
import { UpdateStore } from './update-store';

export class SceneEP extends Scene {
  get sheet() {
    return super.sheet as EntitySheet;
  }
  get epFlags() {
    return this.flags[EP.Name];
  }

  @LazyGetter()
  get updater() {
    return new UpdateStore({
      getData: () => this.toJSON(),
      setData: (update) => this.update(update),
      isEditable: () => this.isOwner,
    });
  }

  preload(push = true) {
    game.scenes.preload(this.id, push);
  }

  get fullSceneName() {
    const { navName, name: sceneName } = this;
    return navName
      ? `${navName} ${game.user.isGM ? `(${sceneName})` : ''}`
      : sceneName;
  }
}
