import type { Sleeve } from '@src/entities/actor/sleeves';
import { ActorType, ItemType } from '@src/entities/entity-types';
import { UpdateStore } from '@src/entities/update-store';
import { StringID, updateFeature } from '@src/features/feature-helpers';
import { toMilliseconds } from '@src/features/modify-milliseconds';
import {
  createDefaultPsiInfluences,
  influenceInfo,
  InfluenceRoll,
  PsiInfluence,
  PsiInfluenceData,
  PsiInfluenceType,
} from '@src/features/psi-influence';
import {
  createLiveTimeState,
  currentWorldTimeMS,
  LiveTimeState,
} from '@src/features/time';
import { notify, NotificationType } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import { deepMerge } from '@src/foundry/misc-helpers';
import { rollLabeledFormulas, rollFormula } from '@src/foundry/rolls';
import { EP } from '@src/foundry/system';
import { HealthType } from '@src/health/health';
import { LazyGetter } from 'lazy-get-decorator';
import { clamp, mapToObj } from 'remeda';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';
import { Trait } from './trait';

export class Psi extends ItemProxyBase<ItemType.Psi> {
  readonly sleeve;
  constructor({
    sleeve,
    ...init
  }: ItemProxyInit<ItemType.Psi> & { sleeve?: Sleeve | null }) {
    super(init);
    this.sleeve = sleeve;
  }

  get fullName() {
    return `${
      this.embedded && !this.isFunctioning ? `[${localize('inactive')}]` : ''
    } ${this.name}`;
  }

  @LazyGetter()
  get fullInfluences() {
    const data = this.influencesData || createDefaultPsiInfluences();
    return mapToObj<
      StringID<PsiInfluenceData>,
      InfluenceRoll,
      StringID<PsiInfluence>
    >(data, (influence) => {
      const active = this.embedded && 'active' in influence && influence.active;
      const timeState = active
        ? createLiveTimeState({
            ...active,
            id: influence.id,
            label: influenceInfo(influence).name,
            updateStartTime: (newStartTime) => {
              this.influenceCommiter((influences) =>
                updateFeature(influences, {
                  id: influence.id,
                  active: {
                    ...active,
                    startTime: newStartTime,
                  },
                }),
              );
            },
          })
        : undefined;

      const pair: [InfluenceRoll, StringID<PsiInfluence>] = [
        influence.roll,
        influence.type === PsiInfluenceType.Trait
          ? {
              ...influence,
              timeState,
              trait: new Trait({
                data: influence.trait,
                embedded: this.name,
                lockSource: true,
                isPsiInfluence: true,
                temporary: localize('psiInfluence'),
                customLevelIndex:
                  this.embedded && influence.active
                    ? this.traitInfluenceLevelIndex
                    : undefined,
                updater: new UpdateStore({
                  getData: () => influence.trait,
                  isEditable: () => this.editable,
                  setData: (changed) => {
                    this.influenceCommiter((influences) =>
                      updateFeature(influences, {
                        id: influence.id,
                        trait: deepMerge(influence.trait, changed),
                      }),
                    );
                  },
                }),
              }),
            }
          : { ...influence, timeState },
      ];
      return pair;
    });
  }

  @LazyGetter()
  get activePsiInfluences(): ReadonlyMap<
    StringID<PsiInfluence>,
    LiveTimeState
  > {
    if (!this.isFunctioning) return new Map();
    return new Map(
      Object.values(this.fullInfluences).flatMap((influence) =>
        influence.timeState ? [[influence, influence.timeState]] : [],
      ),
    );
  }

  recedeInfection() {
    this.updater.batchCommits(() => {
      this.updater.path('data', 'state', 'receded').store(true);
      if (this.activePsiInfluences.size) {
        this.influenceCommiter((influences) =>
          influences.map((influence) => ({ ...influence, active: null })),
        );
      }
      this.updater.commit();
    });
  }

  get isFunctioning() {
    const { sleeve } = this;
    if (!sleeve || sleeve.type === ActorType.Infomorph) return false;
    return !this.epData.requireBioSubstrate || !sleeve.activeMeshHealth;
  }

  activateInfluence(
    roll: InfluenceRoll,
    duration: number,
    extendDuration: boolean,
  ) {
    const { id, timeState } = this.fullInfluences[roll];
    const newDuration =
      timeState && extendDuration ? timeState.duration + duration : duration;
    return this.influenceCommiter((influences) =>
      updateFeature(influences, {
        id,
        active: {
          duration: newDuration,
          startTime:
            extendDuration && timeState
              ? timeState.startTime
              : currentWorldTimeMS(),
        },
      }),
    );
  }

  deactivateInfluence(roll: InfluenceRoll) {
    const { id } = this.fullInfluences[roll];
    return this.influenceCommiter((influences) =>
      updateFeature(influences, {
        id,
        active: null,
      }),
    );
  }

  get hasActiveInfluences() {
    return this.activePsiInfluences.size > 0;
  }

  get traitInfluenceLevelIndex() {
    const { infectionRating } = this;
    if (infectionRating < 33) return 0;
    if (infectionRating < 66) return 1;
    return 2;
  }

  get strain() {
    return this.epData.strain;
  }

  get influencesData() {
    return this.epFlags?.influences;
  }

  get state() {
    return this.epData.state;
  }

  get receded() {
    return this.state.receded;
  }

  get checkoutTime() {
    return this.state.checkoutTime;
  }

  get interference() {
    return this.state.interference;
  }

  get infectionRating() {
    return clamp(this.state.infectionRating, this.infectionClamp);
  }

  get baseInfectionRating() {
    return this.level * 10;
  }

  get hasVariableInfection() {
    return this.level !== 3;
  }

  get freePush() {
    return this.level === 2 ? this.state.freePush : '';
  }

  get hasChiIncreasedEffect() {
    return this.hasVariableInfection && this.infectionRating >= 33;
  }

  get hasFreePushEffect() {
    return this.level === 2 && this.infectionRating >= 66;
  }

  get activeFreePush() {
    return this.hasFreePushEffect ? this.freePush : '';
  }

  get infectionClamp() {
    return { min: this.baseInfectionRating, max: 99 };
  }

  get level() {
    return this.epData.level;
  }

  setCriticalSuccessState(
    state: 'checkoutTime' | 'interference',
    active: boolean,
  ) {
    return this.updater.path('data', 'state', state).commit(active);
  }

  updateFreePush(push: Psi['freePush']) {
    return this.updater.path('data', 'state', 'freePush').commit(push);
  }

  updateLevel(newLevel: 1 | 2 | 3) {
    this.updater
      .path('data', 'level')
      .store(newLevel)
      .path('data', 'state', 'infectionRating')
      .commit(clamp({ min: newLevel * 10, max: 99 }));
  }

  updateInfectionRating(newRating: number) {
    return this.updater
      .path('data', 'state', 'infectionRating')
      .commit(clamp(newRating, this.infectionClamp));
  }

  getDataCopy(reset = false) {
    const copy = super.getDataCopy(reset);
    if (reset) {
      copy.data.state.infectionRating = this.baseInfectionRating;
    }
    return copy;
  }

  setupDefaultInfluences() {
    return this.updater
      .path('flags', EP.Name, 'influences')
      .commit(createDefaultPsiInfluences());
  }

  get influenceCommiter() {
    return async (
      callback: (
        influences: NonNullable<Psi['influencesData']>,
      ) => NonNullable<Psi['influencesData']>,
    ) => {
      await this.updater
        .path('flags', EP.Name, 'influences')
        .commit(callback(this.influencesData || []));
    };
  }
}
