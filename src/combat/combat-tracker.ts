import { createMessage, MessageVisibility } from '@src/chat/create-message';
import { PoolType } from '@src/data-enums';
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
import produce from 'immer';
import type { WritableDraft } from 'immer/dist/internal';
import { reject } from 'remeda';

export enum TrackedCombatEntity {
  Actor,
  Token,
  Time,
}

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

export const combatPools = [
  PoolType.Insight,
  PoolType.Vigor,
  PoolType.Threat,
] as const;

export type CombatPool = typeof combatPools[number];

type Extra = {
  pool: CombatPool;
  id: boolean;
};

type CombatParticipantData = {
  name: string;
  img?: string;
  initiative?: number;
  entityIdentifiers?: TrackedIdentitfiers | null;
  hidden?: boolean;
  defeated?: boolean;
  userId?: string;
  delaying?: boolean;
  modifiedTurn?: Record<
    number,
    | {
        tookInitiative?: CombatPool | null;
        extraActions?: [Extra] | [Extra, Extra] | null;
      }
    | undefined
    | null
  >;
};

export const rollParticipantInitiative = async (
  participant: CombatParticipant,
): Promise<{ id: string; initiative: number }> => {
  const { token, actor } = getParticipantEntities(participant);

  const roll =
    actor?.proxy.type === ActorType.Character
      ? rollFormula(`1d6 + ${actor.proxy.initiative}`)
      : null;

  if (roll) {
    await createMessage({
      roll,
      flavor: localize('initiative'),
      entity: token ?? actor,
      alias: participant.name,
      visibility: participant.hidden
        ? MessageVisibility.WhisperGM
        : MessageVisibility.Public,
    });
  }

  return { id: participant.id, initiative: roll?.total || 0 };
};

export const getParticipantEntities = (data: CombatParticipantData) => {
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

export const participantsAsToken = ({ id, scene }: Token) => {
  return gameSettings.combatState.current.participants.filter(
    ({ entityIdentifiers }) =>
      entityIdentifiers?.type === TrackedCombatEntity.Token &&
      entityIdentifiers.tokenId === id &&
      entityIdentifiers.sceneId === scene?.id,
  );
};

type RoundParticipant = {
  participant: CombatParticipant;
  tookInitiative?: CombatPool | null;
  extra?: Extra | null;
};

export type CombatRound = {
  participants: RoundParticipant[];
  someTookInitiative: boolean;
};

export const setupCombatRound = (
  participants: CombatParticipant[],
  roundIndex: number,
) => {
  const round: CombatRound = {
    participants: [],
    someTookInitiative: false,
  };

  for (const participant of participants) {
    const { tookInitiative, extraActions } =
      participant.modifiedTurn?.[roundIndex] ?? {};
    round.participants.push({ participant, tookInitiative });
    round.someTookInitiative ||= !!tookInitiative;

    for (const extra of extraActions ?? []) {
      round.participants.push({ participant, extra });
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
  exhaustive,
}: {
  participants: CombatRound['participants'];
  startingTurn: number;
  skipDefeated: boolean;
  goingBackwards: boolean;
  exhaustive: boolean;
}) => {
  const viableParticipant = ({
    participant,
  }: {
    participant: CombatParticipant;
  }) => !participant.delaying && (skipDefeated ? !participant.defeated : true);

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
  { participant: a, tookInitiative: tookA, extra: extraA }: RoundParticipant,
  { participant: b, tookInitiative: tookB, extra: extraB }: RoundParticipant,
) => {
  // Took initiative are all first
  if (tookA && !tookB) return -1;
  if (tookB && !tookA) return 1;

  // Extra actions are all last
  if (extraA && !extraB) return 1;
  if (extraB && !extraA) return -1;

  // Unset initiative are last in normal flow
  if (a.initiative != null && b.initiative == null) return -1;
  if (b.initiative != null && a.initiative == null) return 1;

  return a.initiative === b.initiative
    ? a.name.localeCompare(b.name)
    : Number(b.initiative) - Number(a.initiative);
};

export type CombatParticipant = CombatParticipantData & { id: string };

export type CombatData = {
  participants: StringID<CombatParticipantData>[];
  round: number;
  turn: number;
  goingBackwards: boolean;
  skipDefeated?: boolean;
  linkToWorldTime?: boolean;
};

export enum CombatActionType {
  AddParticipants,
  UpdateParticipants,
  RemoveParticipants,
  UpdateRound,
  Reset,
  ApplyInterrupt,
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
      payload: { targetId: string; interrupterId: string };
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

      case CombatActionType.ApplyInterrupt: {
        const sorted = draft.participants.sort((a, b) =>
          participantsByInitiative({ participant: a }, { participant: b }),
        );
        const activeIndex = sorted.findIndex(
          (p) => p.id === action.payload.targetId,
        );
        const part = sorted[activeIndex];
        if (!part) return;
        const newInitiative = (part.initiative || 0) + 0.01;
        let decreaseTurn = false;
        let currentInitiative = newInitiative;
        // TODO account for parts before target having same initiative
        for (const participant of sorted.slice(0, activeIndex).reverse()) {
          if (participant.id === action.payload.interrupterId) {
            decreaseTurn = true;
          } else if (participant.initiative === currentInitiative) {
            participant.initiative = currentInitiative += 0.01;
          }
        }

        const interrupter = sorted.find(
          (p) => p.id === action.payload.interrupterId,
        );
        if (interrupter) {
          interrupter.delaying = false;
          interrupter.initiative = newInitiative;
        }
        if (decreaseTurn) {
          draft.turn -= 1;
        }

        return;
      }

      case CombatActionType.UpdateRound:
        Object.assign(draft, action.payload);
        return;

      case CombatActionType.Reset: {
        return {
          round: 0,
          turn: 0,
          participants: [],
          goingBackwards: false,
        };
      }
    }
  },
);

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
  if (userCan('SETTINGS_MODIFY')) updateCombat(action);
  else if (gmIsConnected()) {
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
