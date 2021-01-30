import type { ActorEP } from '@src/entities/actor/actor';
import { findToken, findActor } from '@src/entities/find-entities';
import {
  addFeature,
  StringID,
  uniqueStringID,
} from '@src/features/feature-helpers';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import {
  gmIsConnected,
  isGamemaster,
  userCan,
} from '@src/foundry/misc-helpers';
import { emitEPSocket, SystemSocketData } from '@src/foundry/socket';
import { gameSettings } from '@src/init';
import { notEmpty } from '@src/utility/helpers';
import produce, { Draft } from 'immer';
import type { WritableDraft } from 'immer/dist/internal';

export enum TrackedCombatEntity {
  Actor,
  Token,
}

type TrackedIdentitfiers =
  | {
      type: TrackedCombatEntity.Actor;
      actorId: string;
    }
  | { type: TrackedCombatEntity.Token; tokenId: string; sceneId: string };

export enum LimitedAction {
  Mental = 1,
  Physical,
}

export enum RoundPhase {
  TookInitiative = 1,
  Normal,
  ExtraActions,
}

type CombatParticipantData = {
  name: string;
  img?: string;
  initiative?: string;
  entityIdentifiers?: TrackedIdentitfiers | null;
  hidden?: boolean;
  defeated?: boolean;
  modifiedTurn?: Record<
    number,
    | {
        tookInitiative?: LimitedAction | null;
        extraActions?: [LimitedAction] | [LimitedAction, LimitedAction] | null;
      }
    | undefined
    | null
  >;
};

export type CombatRoundPhases = {
  [RoundPhase.TookInitiative]: {
    participant: CombatParticipant;
    limitedAction: LimitedAction;
  }[];
  [RoundPhase.Normal]: { participant: CombatParticipant }[];
  [RoundPhase.ExtraActions]: {
    participant: CombatParticipant;
    limitedActions: [LimitedAction] | [LimitedAction, LimitedAction];
  }[];
};

export const setupParticipants = (participants: CombatData['participants']) => {
  return Object.entries(participants).map(([id, data]) => {
    const { entityIdentifiers, ...part } = data;
    const token =
      entityIdentifiers?.type === TrackedCombatEntity.Token
        ? findToken(entityIdentifiers)
        : null;

    const participant: CombatParticipant = {
      ...part,
      id,
      token,
      actor:
        token?.actor ??
        (entityIdentifiers?.type === TrackedCombatEntity.Actor
          ? findActor(entityIdentifiers)
          : null),
    };
    return participant;
  });
};

export const setupPhases = (
  participants: CombatParticipant[],
  roundIndex: number,
) => {
  const phases: CombatRoundPhases = {
    [RoundPhase.TookInitiative]: [],
    [RoundPhase.Normal]: [],
    [RoundPhase.ExtraActions]: [],
  };

  for (const participant of participants) {
    const { tookInitiative, extraActions } =
      participant.modifiedTurn?.[roundIndex] ?? {};

      console.log(tookInitiative, extraActions);

    if (tookInitiative) {
      phases[RoundPhase.TookInitiative].push({
        participant,
        limitedAction: tookInitiative,
      });
    } else phases[RoundPhase.Normal].push({ participant });

    if (notEmpty(extraActions)) {
      phases[RoundPhase.ExtraActions].push({
        participant,
        limitedActions: extraActions,
      });
    }
  }

  phases[RoundPhase.ExtraActions].sort(participantsByInitiative);
  phases[RoundPhase.TookInitiative].sort(participantsByInitiative);
  phases[RoundPhase.Normal].sort(participantsByInitiative);

  return phases;
};

export const participantsByInitiative = (
  { participant: a }: { participant: CombatParticipant },
  { participant: b }: { participant: CombatParticipant },
) => {
  if (a.initiative != null && b.initiative == null) return -1;
  if (b.initiative != null && a.initiative == null) return 1;
  return a.initiative === b.initiative
    ? a.name.localeCompare(b.name)
    : Number(b.initiative) - Number(a.initiative);
    
};

export type CombatParticipant = Omit<
  CombatParticipantData,
  'entityIdentifiers'
> & { token?: Token | null; actor?: ActorEP | null } & { id: string };

export type CombatData = {
  participants: Record<string, CombatParticipantData>;
  round: number;
  phase: RoundPhase;
  turn: [number] | [number, 0 | 1];
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
      payload: Pick<CombatData, 'phase' | 'round' | 'turn'>;
    }
  | {
      type: CombatActionType.Reset;
    } 

const updateReducer = produce(
  (draft: WritableDraft<CombatData>, action: CombatUpdateAction) => {
    switch (action.type) {
      case CombatActionType.AddParticipants: {
        const currentIDs = Object.keys(draft.participants);
        for (const participant of action.payload) {
          const id = uniqueStringID(currentIDs);
          currentIDs.push(id);
          draft.participants[id] = participant;
        }
        break;
      }

      case CombatActionType.RemoveParticipants:
        action.payload.forEach((id) => void delete draft.participants[id]);
        break;

      case CombatActionType.UpdateParticipants:
        action.payload.forEach(({ id, ...change }) => {
          const participant = draft.participants[id];
          if (participant) Object.assign(participant, change);
        });
        break;

        case CombatActionType.UpdateRound:
          Object.assign(draft, action.payload)
          break;

        case CombatActionType.Reset: {
          draft.round = 0;
          draft.phase = RoundPhase.TookInitiative,
          draft.turn = [0];
          draft.participants = {};
          break;
        }
    }
  },
);

// TODO ignore gamemaster and instead just check for SETTINGS_MODIFY priv
export const updateCombatState = (action: CombatUpdateAction) => {
  if (userCan('SETTINGS_MODIFY')) {
    gameSettings.combatState.update((state) => updateReducer(state, action));
  } else if (gmIsConnected()) {
    emitEPSocket({ mutateCombat: { action } });
  } else {
    notify(NotificationType.Info, 'Cannot update combat if GM not present.');
  }
};

export const combatSocketHandler = ({
  action,
}: SystemSocketData['mutateCombat']) => {
  isGamemaster() &&
    gameSettings.combatState.update((state) => updateReducer(state, action));
};
