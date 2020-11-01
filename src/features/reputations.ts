import { clamp } from "remeda";
import { createFeature, StringID } from "./feature-helpers";
import { CommonInterval, toMilliseconds } from "./time";

export enum Favor {
  Trivial = "trivial",
  Minor = "minor",
  Moderate = "moderate",
  Major = "major",
}

export type ConsumableFavor = Exclude<Favor, Favor.Trivial>;

export enum RepNetwork {
  Anarchist = "@Rep",
  Civic = "cRep",
  Fame = "fRep",
  Guanxi = "gRep",
  Eye = "iRep",
  Research = "rRep",
  Explore = "xRep",
}

export type RepData = {
  score: number;
  refreshTimer: number;
} & Record<ConsumableFavor, number>;

export type FakeIdRepIdentifier = { fakeEgoId: string; repId: string };

export type RepIdentifier = { networkId: RepNetwork } | FakeIdRepIdentifier;

export type RepBase = {
  acronym: string;
  network: string;
} & RepData;

export type RepWithIdentifier = RepBase & { identifier: RepIdentifier };

export const createRep = createFeature<RepBase, "acronym" | "network">(() => ({
  score: 10,
  refreshTimer: 0,
  [Favor.Minor]: 0,
  [Favor.Moderate]: 0,
  [Favor.Major]: 0,
}));

export const repRefreshTimerActive = ({
  minor,
  moderate,
  refreshTimer,
}: RepData) => !!(minor || moderate);

export const refreshRep = (
  refreshTimer: number,
  advance: number
): Partial<RepData> => {
  const advancedTimer = refreshTimer + advance;
  return advancedTimer >= CommonInterval.Week
    ? {
        [Favor.Minor]: 0,
        [Favor.Moderate]: 0,
        refreshTimer: 0,
      }
    : { refreshTimer: advancedTimer };
};

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

const useRepFavor = (rep: RepData, favor: ConsumableFavor) => ({
  [favor]: clamp(rep[favor] + 1, { max: maxFavors.get(favor) }),
  refreshTimer:
    favor === Favor.Major || repRefreshTimerActive(rep) ? rep.refreshTimer : 0,
});

export const maxFavors: ReadonlyMap<ConsumableFavor, number> = new Map([
  [Favor.Minor, 3],
  [Favor.Moderate, 1],
  [Favor.Major, 1],
]);

export const favorValues = {
  [Favor.Trivial]: {
    modifier: 30,
    burnCost: 0,
    timeframe: 0,
  },
  [Favor.Minor]: {
    modifier: 10,
    burnCost: 5,
    timeframe: toMilliseconds({ hours: 2 }),
  },
  [Favor.Moderate]: {
    modifier: 0,
    burnCost: 10,
    timeframe: toMilliseconds({ hours: 8 }),
  },
  [Favor.Major]: {
    modifier: -30,
    burnCost: 20,
    timeframe: CommonInterval.Day,
  },
} as const;

export type FakeEgoId = {
  name: string;
  notes: string;
  reps: StringID<RepBase>[];
};
