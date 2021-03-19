import type { ItemType } from '@src/entities/entity-types';
import { UpdateStore } from '@src/entities/update-store';
import { StringID, updateFeature } from '@src/features/feature-helpers';
import {
  createDefaultPsiInfluences,
  InfluenceRoll,
  PsiInfluence,
  PsiInfluenceData,
  PsiInfluenceType,
} from '@src/features/psi-influence';
import { createLiveTimeState } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { deepMerge } from '@src/foundry/misc-helpers';
import { EP } from '@src/foundry/system';
import { LazyGetter } from 'lazy-get-decorator';
import { clamp, mapToObj } from 'remeda';
import { ItemProxyBase } from './item-proxy-base';
import { Trait } from './trait';

export class Psi extends ItemProxyBase<ItemType.Psi> {
  @LazyGetter()
  get fullInfluences() {
    const data = this.influencesData || createDefaultPsiInfluences();
    return mapToObj<
      StringID<PsiInfluenceData>,
      InfluenceRoll,
      StringID<PsiInfluence>
    >(data, (influence) => {
      const active = 'active' in influence && influence.active;
      const timeState = active
        ? createLiveTimeState({
            ...active,
            id: influence.id,
            label: localize(influence.type),
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
  get activePsiInfluences() {
    return new Map(
      Object.values(this.fullInfluences).flatMap((influence) =>
        influence.timeState ? [[influence, influence.timeState]] : [],
      ),
    );
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
