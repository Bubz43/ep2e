import { PhysicalServiceType } from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import { matchID, updateFeature } from '@src/features/feature-helpers';
import {
  repRefreshTimerActive,
  RepUse,
  repModification,
} from '@src/features/reputations';
import {
  RefreshTimer,
  CommonInterval,
  refreshAvailable,
} from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { map } from 'remeda';
import { Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.PhysicalService> {}
export class PhysicalService extends mix(Base).with(Purchasable) {
  constructor(init: ItemProxyInit<ItemType.PhysicalService>) {
    super(init);
  }

  get serviceDuration() {
    return this.epData.duration;
  }

  get isIndefiniteService() {
    return this.serviceDuration < 0;
  }

  get elapsedDuration() {
    return this.epData.state.elapsed;
  }

  get expirationProgress() {
    return this.elapsedDuration / this.serviceDuration;
  }

  get remainingDuration() {
    return this.serviceDuration - this.elapsedDuration;
  }

  get serviceType() {
    return this.epData.serviceType;
  }

  get isFakeEgoId() {
    return this.serviceType === PhysicalServiceType.FakeId;
  }

  get reputations() {
    return this.epData.reputations;
  }

  get isExpired() {
    return (
      !this.isIndefiniteService && this.elapsedDuration >= this.serviceDuration
    );
  }

  get hasActiveRepRefreshTimers() {
    return this.reputations.some(repRefreshTimerActive);
  }

  get equipped() {
    return this.epData.state.equipped;
  }

  findRep(id: string) {
    return this.reputations.find(matchID(id));
  }

  useRep({ id, ...use }: RepUse & { id: string }) {
    const rep = this.findRep(id);
    if (!rep) return;
    return this.updater.prop('data', 'reputations').commit((reps) =>
      updateFeature(reps, {
        id,
        ...repModification({ rep, ...use }),
      }),
    );
  }

  @LazyGetter()
  get repsWithIndefiers() {
    return this.reputations.map((rep) => ({
      ...rep,
      identifier: { repId: rep.id, fakeEgoId: this.id },
    }));
  }

  @LazyGetter()
  get refreshTimers(): RefreshTimer[] {
    return this.reputations.flatMap((rep) =>
      repRefreshTimerActive(rep)
        ? {
            label: `${this.name} - ${localize('fakeId')} | ${
              rep.acronym
            } ${localize('SHORT', 'minor')}/${localize(
              'SHORT',
              'moderate',
            )} ${localize('refresh')}`,
            elapsed: rep.refreshTimer,
            max: CommonInterval.Week,
            id: `${this.id}-${rep.id}`,
          }
        : [],
    );
  }

  storeRepRefresh() {
    if (this.refreshTimers.some(refreshAvailable)) {
      this.updater
        .prop('data', 'reputations')
        .store(
          map((rep) =>
            rep.refreshTimer >= CommonInterval.Week
              ? { ...rep, refreshTimer: 0, minor: 0, moderate: 0 }
              : rep,
          ),
        );
    }
    return this.updater;
  }

  getDataCopy(reset = false) {
    const copy = super.getDataCopy(reset);
    if (reset) {
      copy.data = {
        ...copy.data,
        reputations: this.reputations.map((rep) => ({
          ...rep,
          refreshTimer: 0,
        })),
      };
    }
    return copy;
  }
}
