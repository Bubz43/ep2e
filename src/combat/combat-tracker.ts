import type { ActorEP } from '@src/entities/actor/actor';
import { StringID, uniqueStringID } from '@src/features/feature-helpers';
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

type CombatRoundData = {};

type CombatParticipantData = {
  name: string;
  img?: string;
  initiative?: string;
  entityIdentifiers?: TrackedIdentitfiers | null;
};

export type CombatParticipant = Omit<
  CombatParticipantData,
  'entityIdentifiers'
> & { token?: Token | null, actor?: ActorEP | null } & { id: string };

export type CombatData = {
  participants: Record<string, CombatParticipantData>;
  rounds: StringID<CombatRoundData>[];
  round: number;
  turn: number;
};

export type CombatUpdateAction =
  | {
      type: 'addParticipants';
      payload: CombatParticipantData[];
    }
  | {
      type: 'updateParticipants';
      payload: (Partial<CombatParticipantData> & { id: string })[];
    }
  | {
      type: 'removeParticipants';
      payload: string[];
    };

const updateReducer = produce(
  (draft: WritableDraft<CombatData>, action: CombatUpdateAction) => {
    switch (action.type) {
      case 'addParticipants': {
        const currentIDs = Object.keys(draft.participants);
        for (const participant of action.payload) {
          const id = uniqueStringID(currentIDs);
          currentIDs.push(id);
          draft.participants[id] = participant;
        }
        break;
      }

      case 'removeParticipants':
        action.payload.forEach((id) => void delete draft.participants[id]);
        break;

      case 'updateParticipants':
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


