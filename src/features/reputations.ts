import { clamp } from 'remeda';
import { createFeature, StringID } from './feature-helpers';
import { CommonInterval, currentWorldTimeMS } from './time';
import { toMilliseconds } from './modify-milliseconds';

export enum Favor {
  Trivial = 'trivial',
  Minor = 'minor',
  Moderate = 'moderate',
  Major = 'major',
}

export type ConsumableFavor = Exclude<Favor, Favor.Trivial>;

export enum RepNetwork {
  Anarchist = '@Rep',
  Civic = 'cRep',
  Fame = 'fRep',
  Guanxi = 'gRep',
  Eye = 'iRep',
  Research = 'rRep',
  Explore = 'xRep',
}

export type RepData = {
  score: number;
  refreshStartTime: number;
} & Record<ConsumableFavor, number>;

export type EgoRepData = RepData & { track: boolean };

export type FakeIdRepIdentifier = { fakeEgoId: string; repId: string, type: "fake" };

export type RepIdentifier = { networkId: RepNetwork, type: "ego" } | FakeIdRepIdentifier;

export type RepBase = {
  acronym: string;
  network: string;
} & RepData;

export type RepWithIdentifier = RepBase & { identifier: RepIdentifier };
export const createRep = createFeature<RepBase, 'acronym' | 'network'>(() => ({
  score: 10,
  refreshStartTime: 0,
  [Favor.Minor]: 0,
  [Favor.Moderate]: 0,
  [Favor.Major]: 0,
}));

export const repRefreshTimerActive = ({ minor, moderate }: RepData) =>
  !!(minor || moderate);

export type RepUse = {
  favor?: ConsumableFavor;
  burnedRep?: number;
};

export const repModification = ({
  rep,
  favor,
  burnedRep = 0,
}: RepUse & { rep: RepData }): Partial<RepData> => ({
  score: rep.score - burnedRep,
  ...(favor ? useRepFavor(rep, favor) : {}),
});

const useRepFavor = (
  rep: RepData,
  favor: ConsumableFavor,
): Partial<RepData> => ({
  [favor]: clamp(rep[favor] + 1, { max: maxFavors.get(favor) }),
  refreshStartTime:
    favor === Favor.Major || repRefreshTimerActive(rep)
      ? rep.refreshStartTime
      : currentWorldTimeMS(),
});

export const maxFavors: ReadonlyMap<ConsumableFavor, number> = new Map([
  [Favor.Minor, 3],
  [Favor.Moderate, 1],
  [Favor.Major, 1],
]);

export const favorValues = (favor: Favor) => {
  switch (favor) {
    case Favor.Trivial:
      return {
        modifier: 30,
        burnCost: 0,
        timeframe: 0,
      };

    case Favor.Minor:
      return {
        modifier: 10,
        burnCost: 5,
        timeframe: toMilliseconds({ hours: 2 }),
      };
    case Favor.Moderate:
      return {
        modifier: 0,
        burnCost: 10,
        timeframe: toMilliseconds({ hours: 8 }),
      };

    case Favor.Major:
      return {
        modifier: -30,
        burnCost: 20,
        timeframe: CommonInterval.Day,
      };
  }
};

export type FakeEgoId = {
  name: string;
  notes: string;
  reps: StringID<RepBase>[];
};
