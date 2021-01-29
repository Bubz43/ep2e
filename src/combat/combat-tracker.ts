import type { ActorEP } from '@src/entities/actor/actor';
import { StringID, uniqueStringID } from '@src/features/feature-helpers';
import { gameSettings } from '@src/init';
import produce, { Draft } from 'immer';

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

export type CombatParticipant = Omit<CombatParticipantData, "entityIdentifiers"> & { entity?: ActorEP | Token | null}

export type CombatData = {
  participants: Record<string, CombatParticipantData | null>;
  rounds: StringID<CombatRoundData>[];
  round: number;
  turn: number;
};

export abstract class CombatState {
  static addParticipant(participant: CombatParticipantData) {
    CombatState.update((draft) => {
      const uniqueID = uniqueStringID(Object.keys(draft.participants));
      draft.participants[uniqueID] = participant;
    });
  }

  static updateParticipant(
    change: Partial<CombatParticipantData> & { id: string },
  ) {
    CombatState.update((draft) => {
      const participant = draft.participants[change.id];
      if (participant) Object.assign(participant, change);
    });
  }

  static removeParticipant(id: string) {
    CombatState.update((draft) => {
        delete draft.participants[id];
        draft.participants[`-=${id}`] = null
    });
  }

  private static update(recipe: (recipe: Draft<CombatData>) => void) {
    gameSettings.combatState.update((data) => produce(data, recipe));
  }
}
