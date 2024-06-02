import { createMessage } from '@src/chat/create-message';
import type { MessageHeaderData } from '@src/chat/message-data';
import {
  createBaseAttackFormula,
  SubstanceAttack,
  SubstanceAttackData,
} from '@src/combat/attacks';
import {
  closeWindow,
  openOrRenderWindow,
} from '@src/components/window/window-controls';
import {
  ResizeOption,
  SlWindowEventName,
} from '@src/components/window/window-options';
import {
  SubstanceApplicationMethod,
  SubstanceClassification,
  SubstanceType,
} from '@src/data-enums';
import type { AddEffects } from '@src/entities/applied-effects';
import { ItemType } from '@src/entities/entity-types';
import {
  ActiveSubstanceState,
  DrugAppliedItem,
  ItemEntity,
  setupItemOperations,
  SubstanceItemFlags,
} from '@src/entities/models';
import { UpdateStore } from '@src/entities/update-store';
import {
  applyDurationMultipliers,
  DurationEffectTarget,
  Effect,
  EffectType,
  extractDurationEffectMultipliers,
  multiplyEffectModifier,
  UniqueEffectType,
} from '@src/features/effects';
import { stringID, uniqueStringID } from '@src/features/feature-helpers';
import { toMilliseconds } from '@src/features/modify-milliseconds';
import {
  createLiveTimeState,
  currentWorldTimeMS,
  LiveTimeState,
} from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { joinLabeledFormulas, rollLabeledFormulas } from '@src/foundry/rolls';
import { EP } from '@src/foundry/system';
import type { HealthType } from '@src/health/health';
import {
  createDamageOverTime,
  DamageOverTime,
} from '@src/health/health-changes';
import { notEmpty } from '@src/utility/helpers';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import {
  createPipe,
  equals,
  last,
  map,
  merge,
  omit,
  pipe,
  uniq,
  uniqBy,
} from 'remeda';
import type { Attacker } from '../item-interfaces';
import { Copyable, Purchasable, Stackable } from '../item-mixins';
import { renderItemForm } from '../item-views';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';
import { Sleight } from './sleight';
import { Trait } from './trait';

export type SubstanceUseMethod = Substance['applicationMethods'][number];

class Base extends ItemProxyBase<ItemType.Substance> {
  get updateState() {
    return this.updater.path('system', 'state');
  }
  get updateQuantity() {
    return this.updater.path('system');
  }
}
export class Substance
  extends mix(Base).with(Purchasable, Copyable, Stackable)
  implements Attacker<SubstanceAttackData, SubstanceAttack>
{
  static onsetTime(application: SubstanceUseMethod) {
    switch (application) {
      case SubstanceApplicationMethod.Inhalation:
        return toMilliseconds({ seconds: 3 });

      case SubstanceApplicationMethod.Dermal:
      case SubstanceApplicationMethod.Injected:
        return toMilliseconds({ seconds: 6 });

      case SubstanceApplicationMethod.Oral:
        return toMilliseconds({ minutes: 15 });

      case 'use':
      case 'app':
        return 0;
    }
  }
  private static appliedItemWindows = new WeakMap<object, Map<string, {}>>();

  readonly loaded;
  readonly appliedState: '' | 'awaitingOnset' | 'active';

  constructor({
    loaded,
    ...init
  }: ItemProxyInit<ItemType.Substance> & {
    loaded: boolean;
  }) {
    super(init);
    this.loaded = loaded;
    this.appliedState = this.epFlags?.awaitingOnset
      ? 'awaitingOnset'
      : this.epFlags?.active
      ? 'active'
      : '';

    if (this.appliedState) {
      const { itemWindowKeys } = this;
      if (notEmpty(itemWindowKeys)) {
        const { baseAppliedItems: baseAppliedItems, severityAppliedItems } =
          this;
        for (const stringID of itemWindowKeys.keys()) {
          const [namespace, id] = stringID.split('___');
          const group =
            namespace === 'base' ? baseAppliedItems : severityAppliedItems;
          const item = id && group.get(id);
          item && item.openForm?.();
        }
      }
    }
  }

  get appliedName() {
    if (this.appliedAndHidden) {
      return game.user.isGM ? `??? {${this.name}}` : '???';
    }
    return this.name;
  }

  get appliedAndHidden() {
    return !!(this.appliedState && this.epFlags?.[this.appliedState]?.hidden);
  }

  private get itemWindowKeys() {
    return Substance.appliedItemWindows.get(this.updater);
  }

  private getItemWindowKey(group: 'base' | 'severity', id: string) {
    let { itemWindowKeys } = this;
    if (!itemWindowKeys) {
      itemWindowKeys = new Map();
      Substance.appliedItemWindows.set(this.updater, itemWindowKeys);
    }
    const fullID = `${group}___${id}`;
    let key = itemWindowKeys.get(fullID);
    if (!key) {
      key = {};
      itemWindowKeys.set(fullID, key);
    }
    return key;
  }

  @LazyGetter()
  get awaitingOnsetTimeState() {
    const { awaitingOnset } = this.epFlags || {};
    // TODO Think of something better than throwing error, returning null is weird here
    if (!awaitingOnset) throw new Error('Substance is not awaiting onset');
    return createLiveTimeState({
      img: this.nonDefaultImg,
      id: `awaiting-onset-${this.id}`,
      duration: Substance.onsetTime(awaitingOnset.useMethod),
      startTime: awaitingOnset.onsetStartTime,
      label: this.appliedName,
      updateStartTime: this.updater.path(
        'flags',
        EP.Name,
        'awaitingOnset',
        'onsetStartTime',
      ).commit,
    });
  }

  get applicationMethods(): ('app' | 'use' | SubstanceApplicationMethod)[] {
    return this.isChemical
      ? ['use']
      : this.isElectronic
      ? ['app']
      : this.epData.application;
  }

  get fullName() {
    return `${this.name} (${this.quantity})`;
  }

  get fullType() {
    const { category } = this;
    const info = map([this.classification, this.substanceType], localize);
    const subCategory = info.join('').toLocaleLowerCase();
    return subCategory === this.category.toLocaleLowerCase()
      ? category
      : uniqBy([category, ...info], (t) => t.toLocaleLowerCase()).join(' ');
  }

  get partialType() {
    return pipe(
      [this.classification, this.substanceType],
      uniq(),
      map(localize),
    ).join(' ');
  }

  get category() {
    return this.epData.category;
  }

  get isAddictive() {
    return !!this.epData.addiction;
  }

  get substanceType() {
    return this.epData.substanceType;
  }

  get isDrug() {
    return this.substanceType === SubstanceType.Drug;
  }

  get isToxin() {
    return this.substanceType === SubstanceType.Toxin;
  }

  get isChemical() {
    return this.substanceType === SubstanceType.Chemical;
  }

  get classification() {
    return this.isChemical
      ? SubstanceType.Chemical
      : this.epData.classification;
  }

  get isElectronic() {
    return (
      !this.isChemical &&
      this.classification === SubstanceClassification.Electronic
    );
  }

  get base() {
    return {
      ...this.epData.base,
      damage: this.attacks.primary,
      items: this.baseAppliedItems,
      get hasDamage(): boolean {
        return notEmpty(this.damage.rollFormulas);
      },
      get hasInstantDamage(): boolean {
        return this.hasDamage && !this.damage.perTurn;
      },
      get hasEffects(): boolean {
        return notEmpty(this.items) || notEmpty(this.effects);
      },
      get viable(): boolean {
        return this.hasEffects || this.hasDamage;
      },
    };
  }

  get severity() {
    return {
      ...this.epData.severity,
      damage: this.setupAttack(
        this.epData.severity.damage,
        localize('severity'),
      ),
      items: this.severityAppliedItems,
      get hasDamage(): boolean {
        return notEmpty(this.damage.rollFormulas);
      },
      get hasInstantDamage(): boolean {
        return this.hasDamage && !this.damage.perTurn;
      },
      get hasEffects(): boolean {
        return (
          notEmpty(this.items) ||
          notEmpty(this.effects) ||
          notEmpty(this.conditions)
        );
      },
      get viable(): boolean {
        return this.hasEffects || this.hasDamage;
      },
    };
  }

  @LazyGetter()
  get attacks() {
    return {
      primary: this.setupAttack(this.epData.base.damage, localize('base')),
      secondary: this.hasSeverity
        ? this.setupAttack(this.epData.severity.damage, localize('severity'))
        : null,
    };
  }

  setupAttack(
    { damageFormula, ...data }: SubstanceAttackData,
    defaultLabel: string,
  ): SubstanceAttack {
    return {
      ...data,
      label: this.hasSeverity ? defaultLabel : '',
      rollFormulas: damageFormula
        ? [createBaseAttackFormula(damageFormula)]
        : [],
    };
  }

  @LazyGetter()
  get baseAppliedItems() {
    return this.getInstancedItems('baseAppliedItems');
  }

  @LazyGetter()
  get severityAppliedItems() {
    return this.getInstancedItems('severityAppliedItems');
  }

  get hasSeverity() {
    return this.epData.hasSeverity;
  }

  get consumeOnUse() {
    return this.epData.consumeOnUse;
  }

  private getInstancedItems(group: keyof SubstanceItemFlags) {
    const items = new Map<string, Trait | Sleight>();
    const ops = setupItemOperations((datas) =>
      this.updater
        .path('flags', EP.Name, group)
        .commit((items) => datas(items || []) as typeof items),
    );

    const proxyInit = (
      data: ItemEntity<ItemType.Trait> | ItemEntity<ItemType.Sleight>,
    ) => {
      const init = {
        embedded: this.name,
        lockSource: false,
        alwaysDeletable: !this.appliedState && this.editable,
        temporary: this.appliedState ? this.appliedName : '',
        deleteSelf: this.appliedState ? undefined : () => ops.remove(data._id),
      };
      // TODO clean this up to avoid duplication
      if (data.type === ItemType.Trait) {
        const trait: Trait = new Trait({
          ...init,
          data,
          updater: new UpdateStore({
            getData: () => data,
            isEditable: () => this.editable,
            setData: createPipe(merge({ _id: data._id }), ops.update),
          }),
          openForm: this.appliedState
            ? () => {
                const { win, windowExisted } = openOrRenderWindow({
                  key: this.getItemWindowKey(
                    group === 'baseAppliedItems' ? 'base' : 'severity',
                    data._id,
                  ),
                  content: renderItemForm(trait),
                  resizable: ResizeOption.Vertical,
                  name: trait.fullName,
                });
                if (!windowExisted) {
                  win.addEventListener(
                    SlWindowEventName.Closed,
                    () => {
                      this.itemWindowKeys?.delete(
                        `${
                          group === 'baseAppliedItems' ? 'base' : 'severity'
                        }___${data._id}`,
                      );
                    },
                    { once: true },
                  );
                }
              }
            : undefined,
        });
        return trait;
      }
      const sleight: Sleight = new Sleight({
        ...init,
        data,
        updater: new UpdateStore({
          getData: () => data,
          isEditable: () => this.editable,
          setData: createPipe(merge({ _id: data._id }), ops.update),
        }),
        openForm: this.appliedState
          ? () => {
              const { win, windowExisted } = openOrRenderWindow({
                key: this.getItemWindowKey(
                  group === 'baseAppliedItems' ? 'base' : 'severity',
                  data._id,
                ),
                content: renderItemForm(sleight),
                resizable: ResizeOption.Vertical,
                name: sleight.fullName,
              });
              if (!windowExisted) {
                win.addEventListener(
                  SlWindowEventName.Closed,
                  () => {
                    this.itemWindowKeys?.delete(
                      `${
                        group === 'baseAppliedItems' ? 'base' : 'severity'
                      }___${data._id}`,
                    );
                  },
                  { once: true },
                );
              }
            }
          : undefined,
      });
      return sleight;
    };

    for (const itemData of this.epFlags?.[group] || []) {
      items.set(itemData._id, proxyInit(itemData));
    }
    return items;
  }

  addItemEffect(group: keyof SubstanceItemFlags, itemData: DrugAppliedItem) {
    this.updater.path('flags', EP.Name, group).commit((items) => {
      const changed = [...(items || [])];
      const _id = uniqueStringID(
        changed.map((i) => last(i._id.split('-')) || i._id),
      );
      return [
        ...changed,
        {
          ...itemData,
          _id: `${this.id}-${
            group === 'baseAppliedItems' ? 'base' : 'severity'
          }-${_id}`,
        },
      ] as typeof changed;
    });
  }

  get messageHeader(): MessageHeaderData {
    return {
      heading: this.name,
      img: this.nonDefaultImg,
      subheadings: this.fullType,
      description: this.description,
    };
  }

  async createMessage({
    method,
    hidden = false,
  }: {
    method: SubstanceUseMethod;
    hidden?: boolean;
  }) {
    await createMessage({
      data: {
        header: { ...this.messageHeader, hidden },
        substanceUse: {
          substance: this.getDataCopy(),
          useMethod: method,
          hidden,
        },
      },
      entity: this.actor,
    });
    await this.use();
    return;
  }

  use() {
    if (this.consumeOnUse && this.editable) return this.consumeUnit();
    return;
  }

  updateAppliedState(newState: Partial<ActiveSubstanceState>) {
    return this.updater.path('flags', EP.Name, 'active').commit(newState);
  }

  createAwaitingOnset({
    method,
    hidden = false,
  }: {
    method: SubstanceUseMethod;
    hidden?: boolean;
  }) {
    const copy = this.getDataCopy();
    const {
      awaitingOnset,
      active: active,
      baseAppliedItems,
      severityAppliedItems,
      ...more
    } = copy.flags[EP.Name] || {};
    copy.flags = {
      ...copy.flags,
      [EP.Name]: {
        ...more,
        baseAppliedItems: baseAppliedItems?.map((i) => ({
          ...i,
          _id: `${stringID()}-${this.id}-base-${i._id}`,
        })),
        severityAppliedItems: severityAppliedItems?.map((i) => ({
          ...i,
          _id: `${stringID()}-${this.id}-severity-${i._id}`,
        })),
        awaitingOnset: {
          useMethod: method,
          onsetStartTime: currentWorldTimeMS(),
          hidden,
        },
      },
    };
    copy.system.quantity = 1;
    return copy;
  }

  async makeActive(modifiers: Effect[]) {
    // TODO method that takes non onset substance and makes it active directly
    const hidden = this.epFlags?.awaitingOnset?.hidden ?? false;
    const state: ActiveSubstanceState = {
      modifyingEffects: modifiers.reduce((accum, effect) => {
        if (
          effect.type === EffectType.Duration &&
          effect.subtype === DurationEffectTarget.Drugs
        ) {
          accum.duration?.push(effect) ?? (accum.duration = [effect]);
        } else if (
          effect.type === EffectType.Misc &&
          effect.unique === UniqueEffectType.HalveDrugEffects
        ) {
          accum.misc?.push(effect) ?? (accum.misc = [effect]);
        }
        return accum;
      }, {} as ActiveSubstanceState['modifyingEffects']),
      applySeverity: null,
      hidden,
      startTime: currentWorldTimeMS(),
      finishedEffects: [],
    };

    const { base } = this;
    if (base.hasInstantDamage) {
      const {
        label,
        damageType,
        attackTraits,
        perTurn,
        rollFormulas,
        ...attack
      } = base.damage;

      await createMessage({
        data: {
          header: { ...this.messageHeader, hidden },
          damage: {
            ...attack,
            rolledFormulas: await rollLabeledFormulas(rollFormulas),
            source: `${this.appliedName} ${label}`,
            damageType,
            multiplier: modifiers.some(
              (effect) =>
                effect.type === EffectType.Misc &&
                effect.unique === UniqueEffectType.HalveDrugEffects,
            )
              ? 0.5
              : 1,
          },
        },
        entity: this.actor,
      });
    }

    return this.updater
      .path('flags', EP.Name, 'awaitingOnset')
      .store(null)
      .path('flags', EP.Name, 'active')
      .commit(state);
  }

  onDelete() {
    this.itemWindowKeys?.forEach(closeWindow);
    Substance.appliedItemWindows.delete(this.updater);
    super.onDelete();
  }

  @LazyGetter()
  get appliedInfo() {
    const { active } = this.epFlags ?? {};
    const effects: AddEffects[] = [];
    const items: (Trait | Sleight)[] = [];
    const multipliers = extractDurationEffectMultipliers(
      active?.modifyingEffects?.duration ?? [],
    );
    const dots: (DamageOverTime & { damageType: HealthType })[] = [];

    const { base, severity, hasSeverity } = this;
    const halveDamageAndEffects = !!active?.modifyingEffects?.misc?.length;
    const damageMultiplier = halveDamageAndEffects ? 0.5 : 1;
    let duration = applyDurationMultipliers({
      duration: base.duration,
      multipliers,
    });
    const shouldApplyBase = !active?.finishedEffects?.includes('base');
    if (shouldApplyBase) {
      effects.push({
        source: this.appliedName,
        effects: halveDamageAndEffects
          ? base.effects.map((effect) => multiplyEffectModifier(effect, 0.5))
          : base.effects,
      });
      items.push(...base.items.values());
      if (base.hasDamage && !base.hasInstantDamage) {
        dots.push({
          ...createDamageOverTime({
            ...base.damage,
            source: base.damage.label,
            duration,
            formula: joinLabeledFormulas(base.damage.rollFormulas),
            multiplier: damageMultiplier,
          }),
          damageType: base.damage.damageType,
        });
      }
    }
    const shouldApplySeverity =
      hasSeverity &&
      active?.applySeverity &&
      !active.finishedEffects?.includes('severity');
    if (shouldApplySeverity) {
      effects.push({
        source: `${this.appliedName} (${localize('severity')})`,
        effects: halveDamageAndEffects
          ? severity.effects.map((effect) =>
              multiplyEffectModifier(effect, 0.5),
            )
          : severity.effects,
      });
      items.push(...severity.items.values());
      const severityDuration = applyDurationMultipliers({
        duration: severity.duration,
        multipliers,
      });
      if (severityDuration > duration) duration = severityDuration;
      if (severity.hasDamage && !severity.hasInstantDamage) {
        dots.push({
          ...createDamageOverTime({
            ...severity.damage,
            source: severity.damage.label,
            duration,
            formula: joinLabeledFormulas(severity.damage.rollFormulas),
            multiplier: damageMultiplier,
          }),
          damageType: severity.damage.damageType,
        });
      }
    }

    if (!shouldApplySeverity && !shouldApplyBase) duration = 0;

    const updateStartTime = this.updater.path(
      'flags',
      EP.Name,
      'active',
      'startTime',
    ).commit;
    const timeStateId = `active-${this.id}`;
    const startTime = active?.startTime || currentWorldTimeMS() - duration;
    const multi = new Map<
      'base' | 'severe',
      [timeState: LiveTimeState, finished: boolean]
    >();
    if (active?.applySeverity) {
      multi
        .set('base', [
          createLiveTimeState({
            id: timeStateId + 'base',
            label: `${localize('base')} ${localize('effects')}`,
            duration: applyDurationMultipliers({
              duration: base.duration,
              multipliers,
            }),
            startTime,
            updateStartTime,
          }),
          active?.finishedEffects?.includes('base'),
        ])
        .set('severe', [
          createLiveTimeState({
            id: timeStateId + 'severity',
            label: `${localize('severe')} ${localize('effects')}`,
            duration: applyDurationMultipliers({
              duration: severity.duration,
              multipliers,
            }),
            startTime,
            updateStartTime,
          }),
          active?.finishedEffects?.includes('severity'),
        ]);
    }

    return {
      effects,
      items,
      appliedbase: shouldApplyBase,
      appliedSeverity: shouldApplySeverity,
      finishedEffects: active?.finishedEffects,
      conditions: shouldApplySeverity ? severity.conditions : null,
      modifyingEffects: active?.modifyingEffects,
      applySeverity: active?.applySeverity ?? null,
      dots,
      timeState: createLiveTimeState({
        id: timeStateId,
        img: this.nonDefaultImg,
        label: this.appliedName,
        duration,
        startTime,
        updateStartTime,
      }),
      multiTimeStates: multi,
      get requiresAttention() {
        return (
          this.timeState.completed ||
          !![...(this.multiTimeStates.values() || [])].some(
            ([state, finished]) => state.completed && !finished,
          )
        );
      },
    };
  }

  private static readonly commonGetters: ReadonlyArray<keyof Substance> = [
    'name',
    'quality',
    'description',
    'cost',
    'isBlueprint',
  ];

  isSameAs(substance: Substance) {
    return (
      Substance.commonGetters.every((prop) =>
        equals(this[prop], substance[prop]),
      ) &&
      equals(
        omit(this.epData, ['blueprint', 'quantity', 'state']),
        omit(substance.epData, ['blueprint', 'quantity', 'state']),
      ) &&
      equals(this.epFlags, substance.epFlags)
    );
  }
}
