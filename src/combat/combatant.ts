import { SurpriseState } from '@src/data-enums';
import type { ActorEP } from '@src/entities/actor';
import { UpdateStore } from '@src/entities/update-store';
import type { Action } from '@src/features/actions';
import type { StringID } from '@src/features/feature-helpers';
import { EP } from '@src/foundry/system';
import { createPipe } from 'remeda';
import type { TokenData } from '@src/foundry/foundry-cont';
import type { DeepPartial } from 'utility-types';

export type Combatant = {
  active: boolean;
  readonly actor?: ActorEP | null;
  hasRolled: boolean;
  hidden: boolean;
  initiative: string | null;
  readonly name: string;
  readonly owner: boolean;
  players: User[];
  token?: TokenData;
  tokenId: string;
  _id: string;
  flags: {
    [EP.Name]?: Partial<{
      temporary: boolean;
      tookInitiative: boolean;
      delay: boolean;
      extraAction: 1 | 2;
      mentalOrMeshOnly: boolean;
      takenActions: StringID<{ actions: StringID<Action>[]; round: number }>[];
      tokenMovement: StringID<{
        moves: number[];
        round: number;
        originalCoordinates: Record<'x' | 'y' | 'elevation', number>;
      }>[];
      surprise: SurpriseState;
    }>;
  };
};

export const isSurpriseRound = (combat = game.combat) => {
  return (
    combat?.round === 1 &&
    combat.turns.some(
      createPipe(
        flags,
        ({ surprise }) => surprise && surprise !== SurpriseState.None,
      ),
    )
  );
};

const current = () => game.combat?.combatant;
const get = (combatantId: string, combat = game.combat) =>
  combat?.getCombatant(combatantId) as Combatant | null;
const create = (
  update: Partial<Omit<Combatant, 'actor' | 'token' | 'name'>> & {
    tokenId: string;
  },
  combat = game.combat,
) => combat?.createCombatant(update, {});

const updateMany = (
  combatantUpdates: (DeepPartial<Combatant> & { _id: string })[],
  combat = game.combat,
) => combat?.updateEmbeddedEntity('Combatant', combatantUpdates);

const _combatantUpdaters = new WeakMap<Combatant, UpdateStore<Combatant>>();
const updater = (combatant: Combatant) => {
  let existing = _combatantUpdaters.get(combatant);
  if (!existing) {
    const { _id } = combatant;
    existing = new UpdateStore({
      getData: () => get(_id)!,
      isEditable: () => true,
      setData: (update) => game.combat?.updateCombatant({ ...update, _id }, {}),
    });
    _combatantUpdaters.set(combatant, existing);
  }
  return existing;
};

const flags = (combatant: Combatant) => combatant.flags[EP.Name] || {};

const isCopy = (combatant: Combatant) => (potentialCopy: Combatant) => {
  return (
    potentialCopy.tokenId === combatant.tokenId &&
    flags(potentialCopy).extraAction
  );
};

export const CombatantHelpers = {
  current,
  updater,
  get,
  create,
  updateMany,
  flags,
  tempTakeInitiativeBonus: 200,
  isCopy,
} as const;
