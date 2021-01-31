import { createMessage, MessageVisibility } from '@src/chat/create-message';
import { PoolType } from '@src/data-enums';
import type { ActorEP } from '@src/entities/actor/actor';
import { ActorType } from '@src/entities/entity-types';
import { findActor, findToken } from '@src/entities/find-entities';
import {
  addFeature,
  StringID,
  uniqueStringID,
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
    
export const combatPools = [PoolType.Insight, PoolType.Vigor, PoolType.Threat] as const

export type CombatPool = (typeof combatPools)[number]


export enum RoundPhase {
  Normal = 1,
  ExtraActions,
}

type Extra = {
  pool: CombatPool,
  id: boolean;
}

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

export type CombatRoundPhases = {
  [RoundPhase.Normal]: {
    participant: CombatParticipant;
    tookInitiative?: CombatPool | null;
  }[];
  [RoundPhase.ExtraActions]: {
    participant: CombatParticipant;
    extra: Extra;
  }[];
  someTookInitiative: boolean;
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

export const setupPhases = (
  participants: CombatParticipant[],
  roundIndex: number,
) => {
  const phases: CombatRoundPhases = {
    [RoundPhase.Normal]: [],
    [RoundPhase.ExtraActions]: [],
    someTookInitiative: false,
  };

  for (const participant of participants) {
    const { tookInitiative, extraActions } =
      participant.modifiedTurn?.[roundIndex] ?? {};

    phases[RoundPhase.Normal].push({ participant, tookInitiative });
    phases.someTookInitiative ||= !!tookInitiative;

    for (const extra of extraActions || []) {
          phases[RoundPhase.ExtraActions].push({
            participant,
            extra: extra,
          });
    }
  
  }

  phases[RoundPhase.ExtraActions].sort(participantsByInitiative);
  phases[RoundPhase.Normal].sort(participantsByInitiative);

  return phases;
};

export const participantsByInitiative = (
  {
    participant: a,
    tookInitiative: initA,
  }: { participant: CombatParticipant; tookInitiative?: CombatPool | null },
  {
    participant: b,
    tookInitiative: initB,
  }: { participant: CombatParticipant; tookInitiative?: CombatPool | null },
) => {
  if (initA && !initB) return -1;
  if (initB && !initA) return 1;
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
  phase: RoundPhase;
  phaseTurn: number;
};

export enum CombatActionType {
  AddParticipants,
  UpdateParticipants,
  RemoveParticipants,
  UpdateRound,
  Reset,
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
      payload: Pick<CombatData, 'phase' | 'round' | 'phaseTurn'>;
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

        break;
      }

      case CombatActionType.RemoveParticipants:
        draft.participants = reject(draft.participants, ({ id }) =>
          action.payload.includes(id),
        );
        break;

      case CombatActionType.UpdateParticipants:
        draft.participants = action.payload.reduce(
          (accum, change) => updateFeature(accum, change),
          draft.participants,
        );

        break;

      case CombatActionType.UpdateRound:
        Object.assign(draft, action.payload);
        break;

      case CombatActionType.Reset: {
        draft.round = 0;
        draft.phase = RoundPhase.Normal;
        draft.phaseTurn = 0
        draft.participants = [];
        break;
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
