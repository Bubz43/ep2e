import { TraitSource, TraitType, CharacterPoint } from '@src/data-enums';
import type { ObtainableEffects } from '@src/entities/applied-effects';
import { localize } from '@src/foundry/localization';
import { lastEventPosition } from '@src/init';
import { openMenu } from '@src/open-menu';
import { notEmpty, toggle } from '@src/utility/helpers';
import { LazyGetter } from 'lazy-get-decorator';
import { clamp, compact } from 'remeda';
import type { ItemType } from '../../entity-types';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

export class Trait
  extends ItemProxyBase<ItemType.Trait>
  implements ObtainableEffects {
  readonly lockSource;

  constructor({
    lockSource,
    ...init
  }: ItemProxyInit<ItemType.Trait> & { lockSource: boolean }) {
    super(init);
    this.lockSource = lockSource;
  }

  @LazyGetter()
  get currentEffects() {
    const { levelInfo, triggered, hasTriggers } = this;
    if (hasTriggers && !triggered) return null;
    return {
      source: this.fullName,
      effects: levelInfo.effects,
    };
  }

  getTextInfo() {
    const {
      traitType,
      currentSource,
      triggers,
      // activeEffects,
      triggered,
    } = this;
    const triggerList = triggers ? `${localize('triggers')}: ${triggers}` : '';

    return [
      triggered ? '' : triggerList,
      // ...map(activeEffects?.effects || [], formatEffect),
      localize(traitType),
      localize(currentSource),
      triggered ? triggerList : '',
    ];
  }

  selectLevelAndAdd(addTrait: (data: Trait['data']) => unknown) {
    openMenu({
      header: { heading: this.name },
      content: this.levels.map((_, index) => ({
        label: `${localize('level')} ${index + 1}`,
        callback: () => {
          const copy = this.getDataCopy();
          copy.data.state.level = index;
          addTrait(copy);
        },
      })),
      position: lastEventPosition,
    });
  }

  get tags() {
    const { traitType, subtype, restrictions, triggers, triggered } = this;
    return compact([
      localize(traitType),
      this.source,
      triggered ? localize('triggered') : '',
      subtype,
      ...restrictions.split(','),
      ...triggers.split(','),
    ]);
  }

  toggleTriggered() {
    return this.updater.prop('data', 'state', 'triggered').commit(toggle);
  }

  updateLevel(levelIndex: number) {
    return this.updater.prop('data', 'state', 'level').commit(levelIndex);
  }

  get fullType() {
    return `${localize(this.source)} ${localize(this.type)}`;
  }

  get traitType() {
    return this.epData.traitType;
  }

  get restrictions() {
    return this.epData.restrictions;
  }

  get currentSource() {
    return this.epData.source;
  }

  get hasMultipleLevels() {
    return this.levels.length > 1;
  }

  get isMorphTrait() {
    return this.currentSource === TraitSource.Morph;
  }

  get levels() {
    return this.epData.levels;
  }

  get levelIndex() {
    return clamp(this.state.level, this.levelRange);
  }

  get defaultLevel() {
    const [level] = this.levels;
    if(!level) throw new Error("Trait must have at least one level")
    return level
  }

  get levelInfo() {
    return this.levels[this.levelIndex] || this.defaultLevel;
  }

  get isPositive() {
    return this.traitType === TraitType.Positive;
  }

  get isNegative() {
    return this.traitType === TraitType.Negative;
  }

  get levelRange() {
    return { min: 0, max: this.levels.length - 1 };
  }

  get subtype() {
    return this.epData.subtype;
  }

  get triggers() {
    return this.epData.triggers;
  }

  get hasTriggers() {
    return !!this.triggers;
  }

  get triggered() {
    return this.hasTriggers && this.embedded && this.state.triggered;
  }

  get source() {
    return this.epData.source;
  }

  get state() {
    return this.epData.state;
  }

  get fullName() {
    const { levelIndex, subtype, triggered, embedded, levels } = this;
    const parts = compact([
      subtype,
      levels.length > 1 && embedded && `${localize('level')} ${levelIndex + 1}`,
    ]);

    return [
      triggered ? `[${localize('triggered')}]` : '',
      this.name,
      notEmpty(parts) ? `(${parts.join(', ')})` : '',
    ]
      .join(' ')
      .trim();
  }

  // get activeEffects(): AddEffects | null {
  //   const { levelInfo, triggered, hasTriggers } = this;
  //   if (hasTriggers && !triggered) return null;
  //   return {
  //     source: this.fullName,
  //     effects: levelInfo.effects,
  //   };
  // }

  get costType() {
    return this.source === TraitSource.Morph
      ? CharacterPoint.Morph
      : CharacterPoint.Customization;
  }

  get costLabel() {
    return localize(this.isPositive ? 'cost' : 'bonus');
  }

  get costInfo() {
    const { costType, costLabel } = this;
    return `${localize(costType)[0]}${localize('points')[0]} ${costLabel}`;
  }

  checkIfLevelActive(index: number) {
    return (
      this.hasMultipleLevels && !!this.embedded && index === this.levelIndex
    );
  }
}
