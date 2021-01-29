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
  Mental,
  Physical,
}

export enum RoundPhase {
  TookInitiative,
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
        extraActions?: LimitedAction[] | null;
      }
    | undefined
    | null
  >;
};

export type CombatRoundPhases = {
  [RoundPhase.TookInitiative]: [CombatParticipant, LimitedAction][];
  [RoundPhase.Normal]: CombatParticipant[];
  [RoundPhase.ExtraActions]: [CombatParticipant, LimitedAction, number][];
};

export const setupParticipants = (participants: CombatData["participants"]) => {
  return  Object.entries(participants).map(([id, data]) => {
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
      return participant
      // return [id, participant] as const;
    })
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
    

    const modified = participant.modifiedTurn?.[roundIndex];
    if (modified?.tookInitiative)
      phases[RoundPhase.TookInitiative].push([
        participant,
        modified.tookInitiative,
      ]);
    else phases[RoundPhase.Normal].push(participant);

    (modified?.extraActions ?? []).forEach((action, index) => {
      phases[RoundPhase.ExtraActions].push([participant, action, index]);
    });
  }

  phases[RoundPhase.ExtraActions].sort(([a, la], [b, lb]) =>
    participantsByInitiativeOrAction([a, la], [b, lb]),
  );
  phases[RoundPhase.TookInitiative].sort(participantsByInitiativeOrAction);
  phases[RoundPhase.Normal].sort(participantsByInitiative);

  return phases;
};

const participantsByInitiativeOrAction = (
  [a, la]: [CombatParticipant, LimitedAction],
  [b, lb]: [CombatParticipant, LimitedAction],
) => {
  return a.initiative == null || b.initiative == null
    ? a.name.localeCompare(b.name)
    : Number(a.initiative) - Number(b.initiative) || la - lb;
};

export const participantsByInitiative = (
  a: CombatParticipant,
  b: CombatParticipant,
) => {
  return a.initiative == null || b.initiative == null
    ? a.name.localeCompare(b.name)
    : Number(a.initiative) - Number(b.initiative);
};

export type CombatParticipant = Omit<
  CombatParticipantData,
  'entityIdentifiers'
> & { token?: Token | null; actor?: ActorEP | null } & { id: string };

export type CombatData = {
  participants: Record<string, CombatParticipantData>;
  round?: {
    phase: RoundPhase;
    phaseTurn: [];
    index: number;
  };
};

export enum CombatActionType {
  AddParticipants,
  UpdateParticipants,
  RemoveParticipants,
  TakeInitiative,
  ExtraAction,
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
    };

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
