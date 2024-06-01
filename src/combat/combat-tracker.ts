import { createMessage, MessageVisibility } from '@src/chat/create-message';
import { PoolType } from '@src/data-enums';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import { ActorType } from '@src/entities/entity-types';
import { findActor, findToken } from '@src/entities/find-entities';
import {
  addFeature,
  StringID,
  updateFeature,
} from '@src/features/feature-helpers';
import { advanceWorldTime, CommonInterval } from '@src/features/time';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import {
  gmIsConnected,
  isGamemaster,
  userCan,
} from '@src/foundry/misc-helpers';
import { rollFormula } from '@src/foundry/rolls';
import { emitEPSocket, SystemSocketData } from '@src/foundry/socket';
import { gameSettings } from '@src/init';
import { notEmpty } from '@src/utility/helpers';
import produce from 'immer';
import type { WritableDraft } from 'immer/dist/internal';
import { reject } from 'remeda';

export enum TrackedCombatEntity {
  Actor,
  Token,
  Time,
}

export type TurnModifiers = {
  tookInitiative?: CombatPool | null;
  extraActions?: [Extra] | [Extra, Extra] | null;
  interruptExtra?: boolean;
};

type CombatParticipantData = {
  name: string;
  img?: string;
  initiative?: number | null;
  entityIdentifiers?: TrackedIdentitfiers | null;
  hidden?: boolean;
  defeated?: boolean;
  userId?: string;
  delaying?: boolean;
  surprised?: null | Surprise;
  modifiedTurn?: Record<number, TurnModifiers | undefined | null>;
};

type TrackedIdentitfiers =
  | {
      type: TrackedCombatEntity.Actor;
      actorId: string;
    }
  | { type: TrackedCombatEntity.Token; tokenId: string; sceneId: string }
  | {
      type: TrackedCombatEntity.Time;
      startTime: number;
      duration: number;
    };

export type CombatParticipant = CombatParticipantData & { id: string };

type RoundLogEntry = {
  text: string;
  timestamp: number;
};

export type CombatData = {
  participants: StringID<CombatParticipantData>[];
  round: number;
  turn: number;
  goingBackwards: boolean;
  skipDefeated?: boolean;
  linkToWorldTime?: boolean;
  roundLogs: Record<number, RoundLogEntry[]>;
};

export const combatPools = [
  PoolType.Insight,
  PoolType.Vigor,
  PoolType.Threat,
] as const;

export type CombatPool = typeof combatPools[number];

type Extra = CombatPool;

export enum Surprise {
  Surprised = 'surprised',
  Alerted = 'alerted',
}

export enum RoundPhase {
  TookInitiative = 1,
  Normal,
  ExtraAction,
}

type RoundParticipant = {
  participant: CombatParticipant;
  tookInitiative?: CombatPool | null;
  extras?: TurnModifiers['extraActions'];
  interruptExtra?: boolean;
  surprise?: Surprise | null;
};

export type CombatRound = {
  participants: RoundParticipant[];
  someTookInitiative: boolean;
  surprise: boolean;
};

export const rollInitiative = async (
  { token, actor }: ReturnType<typeof getParticipantEntities>,
  options: Partial<{
    surprised: Surprise;
    name: string;
    hidden: boolean;
  }>,
) => {
  const roll =
    actor?.proxy.type === ActorType.Character
      ? await rollFormula(
          `1d6 + ${actor.proxy.initiative} ${options.surprised ? `-3` : ''}`,
        )
      : null;

  if (roll) {
    await createMessage({
      roll,
      flavor: localize('initiative'),
      entity: token ?? actor,
      alias: options.name,
      visibility: options.hidden
        ? MessageVisibility.WhisperGM
        : MessageVisibility.Public,
    });
  }
  return {
    initiative: Math.round(Number(roll?.total || 0) * 100) / 100,
    surprised: options.surprised,
  };
};

export const rollParticipantInitiative = async (
  participant: CombatParticipant,
  surprised?: Surprise,
): Promise<{ id: string; initiative: number; surprised?: Surprise }> => ({
  id: participant.id,
  ...(await rollInitiative(getParticipantEntities(participant), {
    surprised,
    name: participant.name,
    hidden: participant.hidden,
  })),
});

export const getParticipantEntities = (
  data: CombatParticipantData,
): { token: MaybeToken; actor: ActorEP | null | undefined } => {
  const token =
    data.entityIdentifiers?.type === TrackedCombatEntity.Token
      ? findToken(data.entityIdentifiers)
      : null;
  return {
    token,
    actor:
      token?.actor ??
      (data.entityIdentifiers?.type === TrackedCombatEntity.Actor
        ? findActor(data.entityIdentifiers)
        : null),
  };
};

export const tokenIsInCombat = ({ id, scene }: Token) => {
  return gameSettings.combatState.current.participants.some(
    ({ entityIdentifiers }) =>
      entityIdentifiers?.type === TrackedCombatEntity.Token &&
      entityIdentifiers.tokenId === id &&
      entityIdentifiers.sceneId === scene?.id,
  );
};

export const setupCombatRound = (
  participants: CombatParticipant[],
  roundIndex: number,
) => {
  const round: CombatRound = {
    participants: [],
    someTookInitiative: false,
    surprise: false,
  };

  for (const participant of participants) {
    const { tookInitiative, extraActions, interruptExtra } =
      participant.modifiedTurn?.[roundIndex] ?? {};

    const normalParticipant: RoundParticipant = {
      participant,
      tookInitiative: interruptExtra ? null : tookInitiative,
      interruptExtra,
    };
    round.participants.push(normalParticipant);
    round.someTookInitiative ||= !!normalParticipant.tookInitiative;

    if (notEmpty(extraActions)) {
      round.participants.push({ participant, extras: extraActions });
    }

    if (roundIndex <= 1) {
      round.surprise ||= !!participant.surprised;
    }
  }

  round.participants.sort(participantsByInitiative);
  return round;
};

const findReverse = (
  participants: CombatRound['participants'],
  startingTurn: number,
  isViable: (info: CombatRound['participants'][number]) => boolean,
) => {
  const roundStart = participants.slice(0, startingTurn + 1).reverse();
  const viable = roundStart.find(isViable);
  return viable ? roundStart.reverse().lastIndexOf(viable) : -1;
};

export const findViableParticipantTurn = ({
  participants,
  startingTurn,
  skipDefeated,
  goingBackwards,
  skipSurprised,
  exhaustive,
}: {
  participants: CombatRound['participants'];
  startingTurn: number;
  skipDefeated: boolean;
  skipSurprised: boolean;
  goingBackwards: boolean;
  exhaustive: boolean;
}) => {
  const viableParticipant = ({
    participant,
  }: {
    participant: CombatParticipant;
  }) =>
    !participant.delaying &&
    (skipDefeated ? !participant.defeated : true) &&
    (skipSurprised ? participant.surprised !== Surprise.Surprised : true);

  if (goingBackwards) {
    const viable = findReverse(participants, startingTurn, viableParticipant);
    if (viable >= 0) return viable;
    if (exhaustive) {
      const anyViable = participants
        .slice(startingTurn)
        .findIndex(viableParticipant);
      if (anyViable >= 0) return startingTurn + anyViable;
    }
  } else {
    const firstViable = participants
      .slice(startingTurn)
      .findIndex(viableParticipant);
    if (firstViable >= 0) return startingTurn + firstViable;
    if (exhaustive) {
      const viable = findReverse(participants, startingTurn, viableParticipant);
      if (viable >= 0) return viable;
    }
  }

  return -1;
};

export const participantsByInitiative = (
  {
    participant: a,
    tookInitiative: tookA,
    extras: extraA,
    interruptExtra: interruptExtraA,
  }: RoundParticipant,
  {
    participant: b,
    tookInitiative: tookB,
    extras: extraB,
    interruptExtra: interruptExtraB,
  }: RoundParticipant,
) => {
  // Took initiative are all first
  if (tookA && !tookB) return -1;
  if (tookB && !tookA) return 1;

  // With extras if interrupted extra
  const inExtraA = extraA || interruptExtraA;
  const inExtraB = extraB || interruptExtraB;

  // Extra actions are all last
  if (inExtraA && !inExtraB) return 1;
  if (inExtraB && !inExtraA) return -1;

  // Unset initiative are last in normal flow
  if (a.initiative != null && b.initiative == null) return -1;
  if (b.initiative != null && a.initiative == null) return 1;

  return a.initiative === b.initiative
    ? a.name.localeCompare(b.name)
    : Number(b.initiative) - Number(a.initiative);
};

export enum CombatActionType {
  AddParticipants,
  UpdateParticipants,
  RemoveParticipants,
  UpdateRound,
  DelayParticipant,
  Reset,
  ApplyInterrupt,
  RemoveParticipantsByToken,
  UpdateSettings,
}

export type CombatUpdateAction =
  | {
      type: CombatActionType.AddParticipants;
      payload: CombatParticipantData[];
    }
  | {
      type: CombatActionType.UpdateParticipants;
      payload: (Partial<CombatParticipantData> & { id: string })[];
    }
  | {
      type: CombatActionType.RemoveParticipants;
      payload: string[];
    }
  | {
      type: CombatActionType.UpdateRound;
      payload: Pick<CombatData, 'round' | 'turn' | 'goingBackwards'>;
    }
  | {
      type: CombatActionType.ApplyInterrupt;
      payload: {
        targetId: string;
        interrupterId: string;
        interruptExtra: boolean;
        interruptExtraInterrupter: boolean;
      };
    }
  | {
      type: CombatActionType.RemoveParticipantsByToken;
      payload: { sceneId: string; tokenId: string }[];
    }
  | {
      type: CombatActionType.DelayParticipant;
      payload: { participantId: string; advanceRound: boolean };
    }
  | {
      type: CombatActionType.UpdateSettings;
      payload: Partial<Pick<CombatData, 'skipDefeated' | 'linkToWorldTime'>>;
    }
  | {
      type: CombatActionType.Reset;
    };

const updateReducer = produce(
  (draft: WritableDraft<CombatData>, action: CombatUpdateAction) => {
    switch (action.type) {
      case CombatActionType.AddParticipants: {
        draft.participants = action.payload.reduce(
          (accum, part) => addFeature(accum, part),
          draft.participants,
        );

        return;
      }

      case CombatActionType.RemoveParticipants:
        draft.participants = reject(draft.participants, ({ id }) =>
          action.payload.includes(id),
        );
        return;

      case CombatActionType.UpdateParticipants:
        draft.participants = action.payload.reduce(
          (accum, change) => updateFeature(accum, change),
          draft.participants,
        );
        return;

      case CombatActionType.DelayParticipant: {
        const part = draft.participants.find(
          (p) => p.id === action.payload.participantId,
        );
        if (part) part.delaying = true;

        if (action.payload.advanceRound) {
          draft.round++;
          draft.turn = 0;
        }
        addLogEntry(draft, {
          text: `${part?.name} - ${localize('delays')} ${localize('turn')}`,
        });
        return;
      }

      case CombatActionType.ApplyInterrupt: {
        // TODO need to setup round state and figure shit out from there to account for taking initiative and/or extra actions
        const sorted = draft.participants.sort((a, b) =>
          participantsByInitiative({ participant: a }, { participant: b }),
        );
        const activeIndex = sorted.findIndex(
          (p) => p.id === action.payload.targetId,
        );
        const target = sorted[activeIndex];
        if (!target) return;
        const targetMods = target.modifiedTurn?.[draft.round];
        const newInitiative =
          (Math.round((target.initiative || 0) * 100) + 1) / 100;
        let wasBefore = false;
        let currentInitiative = newInitiative;
        for (const participant of sorted.slice(0, activeIndex).reverse()) {
          if (participant.id === action.payload.interrupterId) {
            wasBefore = true;
          } else if (
            participant.initiative === currentInitiative ||
            participant.initiative === target.initiative
          ) {
            currentInitiative = (Math.round(currentInitiative * 100) + 1) / 100;
            participant.initiative = currentInitiative;
          }
        }

        const interrupter = sorted.find(
          (p) => p.id === action.payload.interrupterId,
        );
        const interrupterModifiers = interrupter?.modifiedTurn?.[draft.round];
        const interrupterHasExtras =
          interrupterModifiers?.extraActions ||
          interrupterModifiers?.interruptExtra;
        if (interrupter) {
          interrupter.delaying = false;
          interrupter.initiative = newInitiative;
          if (
            action.payload.interruptExtra ||
            action.payload.interruptExtraInterrupter
          ) {
            const { modifiedTurn = {} } = interrupter;
            const modifiedRound = modifiedTurn[draft.round] ?? {};
            interrupter.modifiedTurn = {
              ...modifiedTurn,
              [draft.round]: {
                ...modifiedRound,
                interruptExtra: true,
              },
            };
          }
        }

        let turnDecrease = 0;

        if (action.payload.interruptExtra) {
          turnDecrease += interrupterHasExtras ? 2 : 1;
          if (targetMods?.interruptExtra) turnDecrease += 1;
        } else if (action.payload.interruptExtraInterrupter) {
          turnDecrease += interrupterHasExtras ? 2 : 1;
        } else if (
          wasBefore &&
          sorted[activeIndex - 1]?.id !== action.payload.interrupterId
        ) {
          turnDecrease += 1;
        }

        draft.turn -= turnDecrease;

        addLogEntry(draft, {
          text: `${interrupter?.name} ${localize('interrupts')} ${
            target.name
          } ${
            action.payload.interruptExtra
              ? `[${localize('extra')} ${localize('actions')}]`
              : ''
          }`,
        });

        return;
      }

      case CombatActionType.RemoveParticipantsByToken: {
        const toString = (ids: { tokenId: string; sceneId: string }) => {
          return `${ids.sceneId}-${ids.tokenId}`;
        };
        const toRemove = action.payload.map(toString);
        draft.participants = reject(
          draft.participants,
          ({ entityIdentifiers }) =>
            !!(
              entityIdentifiers?.type === TrackedCombatEntity.Token &&
              toRemove.includes(toString(entityIdentifiers))
            ),
        );
        return;
      }

      case CombatActionType.UpdateRound:
        Object.assign(draft, action.payload);
        return;

      case CombatActionType.UpdateSettings:
        Object.assign(draft, action.payload);
        return;

      case CombatActionType.Reset: {
        return {
          round: 0,
          turn: 0,
          participants: [],
          goingBackwards: false,
          roundLogs: {},
        };
      }
    }
  },
);

const addLogEntry = (
  draft: WritableDraft<CombatData>,
  entry: Omit<RoundLogEntry, 'timestamp'>,
) => {
  const log = draft.roundLogs[draft.round] ?? [];
  draft.roundLogs[draft.round] = log.concat({
    ...entry,
    timestamp: Date.now(),
  });
};

const updateCombat = (action: CombatUpdateAction) => {
  gameSettings.combatState.update((state) => {
    const newState = updateReducer(state, action);
    if (action.type === CombatActionType.UpdateRound) {
      if (newState.round > state.round) advanceWorldTime(CommonInterval.Turn);
      else if (newState.round < state.round)
        advanceWorldTime(-CommonInterval.Turn);
    }
    return newState;
  });
};

// TODO ignore gamemaster and instead just check for SETTINGS_MODIFY priv
export const updateCombatState = (action: CombatUpdateAction) => {
  if (userCan('SETTINGS_MODIFY')) {
    updateCombat(action);
  } else if (gmIsConnected()) {
    emitEPSocket({ mutateCombat: { action } });
  } else {
    notify(NotificationType.Info, 'Cannot update combat if GM not present.');
  }
};

export const combatSocketHandler = ({
  action,
}: SystemSocketData['mutateCombat']) => {
  isGamemaster() && updateCombat(action);
};
