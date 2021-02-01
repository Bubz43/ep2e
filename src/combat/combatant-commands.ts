import { SurpriseState } from '@src/data-enums';
import { UpdateStore } from '@src/entities/update-store';
import type { Action } from '@src/features/actions';
import {
  addFeature,
  removeFeature,
  updateFeature,
} from '@src/features/feature-helpers';
import { rollFormula } from '@src/foundry/rolls';
import { EP } from '@src/foundry/system';
import { filter, map, pick, pipe, reject, takeWhile } from 'remeda';
import { Combatant, CombatantHelpers } from './combatant';

enum CommandName {
  ApplySurprise = 'applySurprise',
  ApplyMovement = 'applyMovement',
  AlterUsedActions = 'alterUsedActions',
  TakeIniative = 'takeInitiative',
  ToggleTurnDelay = 'toggleTurnDelay',
  TakeExtraAction = 'takeExtraAction',
}

type TurnSettings = Partial<{
  meshOrMentalOnly: boolean;
  alterActions: {
    onRound: number;
  } & ({ addAction: Action } | { removeAction: string });
  surprise: SurpriseState;
  initiativeFormula: string;
  movement: number;
}>;

const rollInitiative = (combatant: Combatant, formula?: string) => {
  return (
    rollFormula(formula || game.combat?._getInitiativeFormula(combatant) || '')
      ?.total || 0
  );
};

export type CombatantSocket = {
  _id: string;
  command: CommandName;
  settings?: TurnSettings;
};

type CommandArguments = {
  combatant: Combatant;
  settings?: TurnSettings;
};

type CommandHandler = (commandArgs: CommandArguments) => void;

const commandWrapper = (
  command: CommandName,
  handler: (args: Required<CommandArguments>) => void,
): CommandHandler => ({ settings = {}, combatant }) => {
  // TODO: See if I should add combat ID as well
  // if (game.user.isGM) handler({ settings, combatant });
  // else emitEPSocket({ combatant: { _id: combatant._id, command, settings } });
};

const surprise = commandWrapper(
  CommandName.ApplySurprise,
  async ({ combatant, settings }) => {
    const { surprise = SurpriseState.None, initiativeFormula } = settings;
    const { hasRolled } = combatant;
    const initMod = surprise === SurpriseState.Alerted ? 3 : 0;
    if (hasRolled) {
      CombatantHelpers.updater(combatant)
        .path('initiative')
        .store(String(rollInitiative(combatant, initiativeFormula) - initMod))
        .path('flags', EP.Name, 'surprise')
        .commit(surprise);
    } else {
      await game.combat?.rollInitiative([combatant._id], {
        formula: (`${
          initiativeFormula || game.combat._getInitiativeFormula(combatant)
        } - ${initMod}` as unknown) as null,
      });
      CombatantHelpers.updater(combatant)
        .path('flags', EP.Name, 'surprise')
        .commit(surprise);
    }
  },
);

const movement = commandWrapper(
  CommandName.ApplyMovement,
  ({ combatant, settings }) => {
    if (
      !combatant.token ||
      !settings.movement ||
      game.combat?.combatant !== combatant
    )
      return;
    const { tokenMovement = [] } = CombatantHelpers.flags(combatant);
    const currentRound = game.combat.round;
    const loggedMovement = tokenMovement.find(
      ({ round }) => round === currentRound,
    );

    CombatantHelpers.updater(combatant)
      .path('flags', EP.Name, 'tokenMovement')
      .commit(
        loggedMovement
          ? updateFeature(tokenMovement, {
              ...loggedMovement,
              moves: [...loggedMovement.moves, settings.movement],
            })
          : addFeature(tokenMovement, {
              round: currentRound,
              moves: [settings.movement],
              originalCoordinates: pick(combatant.token, [
                'x',
                'y',
                'elevation',
              ]),
            }),
      );
  },
);

const alterActions = commandWrapper(
  CommandName.AlterUsedActions,
  ({ combatant, settings }) => {
    if (!settings.alterActions) return;

    const { onRound } = settings.alterActions;
    const { takenActions = [] } = CombatantHelpers.flags(combatant);
    const turnActions = takenActions.find(({ round }) => round === onRound);
    const actionUpdate = CombatantHelpers.updater(combatant).path(
      'flags',
      EP.Name,
      'takenActions',
    ).commit;
    if ('addAction' in settings.alterActions) {
      const { addAction } = settings.alterActions;
      const updatedActions = addFeature(turnActions?.actions || [], addAction);
      actionUpdate(
        turnActions
          ? updateFeature(takenActions, {
              actions: updatedActions,
              id: turnActions.id,
            })
          : addFeature(takenActions, {
              round: onRound,
              actions: updatedActions,
            }),
      );
    } else if (turnActions) {
      const { removeAction } = settings.alterActions;
      actionUpdate(
        updateFeature(takenActions, {
          actions: removeFeature(turnActions.actions, removeAction),
          id: turnActions.id,
        }),
      );
    }
  },
);

const initiative = commandWrapper(
  CommandName.TakeIniative,
  ({ combatant, settings }) => {
    const updater = CombatantHelpers.updater(combatant)
      .path('flags', EP.Name, 'tookInitiative')
      .store(true)
      .path('initiative')
      .store((initiative) =>
        String(
          (initiative == null
            ? rollInitiative(combatant)
            : parseFloat(initiative)) +
            CombatantHelpers.tempTakeInitiativeBonus,
        ),
      );
    settings.meshOrMentalOnly
      ? updater.path('flags', EP.Name, 'mentalOrMeshOnly').commit(true)
      : updater.commit();
  },
);

const toggleTurnDelay = commandWrapper(
  CommandName.ToggleTurnDelay,
  async ({ combatant }) => {
    if (!game.combat) return;

    const { delay } = CombatantHelpers.flags(combatant);
    const updater = CombatantHelpers.updater(combatant);

    if (!delay) {
      await updater.path('flags', EP.Name, 'delay').commit(true);
      await game.combat.nextTurn();
      return;
    }

    updater.path('flags', EP.Name, 'delay').store(false);
    const { turn, turns } = game.combat;
    const currentCombatant = CombatantHelpers.current();
    if (
      (turns[turn - 1] === combatant &&
        currentCombatant?.initiative !== combatant.initiative) ||
      currentCombatant === combatant
    ) {
      await updater.commit();
    } else {
      const { initiative } = combatant;
      const newInitiative = String(
        parseFloat(currentCombatant?.initiative ?? initiative ?? '0') + 0.01,
      );
      if (newInitiative === turns[turn - 1]?.initiative) {
        updater.path('initiative').store(newInitiative);
        pipe(
          turns,
          takeWhile((c) => c !== currentCombatant),
          reject((c) => c === combatant),
          map((c) => [c, parseFloat(c.initiative || '0') * 100] as const),
          async (combatants) => {
            const turnMap = new Map(combatants.reverse());
            let targetInit = parseFloat(newInitiative) * 100;
            turnMap.forEach((init, comb, tm) => {
              if (init <= targetInit) {
                const newInit = targetInit + 1;
                targetInit = newInit;
                tm.set(comb, newInit);
              }
            });
            await pipe(
              [...turnMap],
              filter(([c, init]) => parseFloat(c.initiative!) * 100 !== init),
              map(([turnCombatant, init]) =>
                CombatantHelpers.updater(turnCombatant)
                  .path('initiative')
                  .store((init / 100).toFixed(2)),
              ),
              (updaters) => UpdateStore.prepUpdateMany([...updaters, updater]),
              CombatantHelpers.updateMany,
            );
          },
        );
      } else await updater.path('initiative').commit(newInitiative);
    }

    if (turn !== 0 && turns.findIndex((c) => c._id === combatant._id) < turn) {
      await game.combat.previousTurn();
    }
  },
);

const takeExtraAction = commandWrapper(
  CommandName.TakeExtraAction,
  async ({ combatant, settings }) => {
    if (!game.combat) return;
    const extraAction = game.combat.turns.some(
      CombatantHelpers.isCopy(combatant),
    )
      ? 2
      : 1;
    const originalCombatant = game.combat.turns.find(
      (c) =>
        c.tokenId === combatant.tokenId &&
        !CombatantHelpers.flags(c).extraAction,
    );
    if (originalCombatant) {
      const {
        tookInitiative,
        mentalOrMeshOnly: meshOrMentalOnly,
      } = CombatantHelpers.flags(originalCombatant);
      const { hidden, tokenId } = originalCombatant;
      await CombatantHelpers.create({
        tokenId,
        hidden,
        initiative: pipe(
          originalCombatant.initiative || '0',
          parseFloat,
          (init) =>
            tookInitiative
              ? init - CombatantHelpers.tempTakeInitiativeBonus
              : init,
          (init) => (init - 100 - extraAction / 100).toFixed(2),
        ),
        flags: {
          [EP.Name]: {
            temporary: true,
            extraAction,
            mentalOrMeshOnly: meshOrMentalOnly || settings.meshOrMentalOnly,
          },
        },
      });
    }
  },
);

export const combatantCommands: Record<CommandName, CommandHandler> = {
  [CommandName.TakeExtraAction]: takeExtraAction,
  [CommandName.ToggleTurnDelay]: toggleTurnDelay,
  [CommandName.TakeIniative]: initiative,
  [CommandName.AlterUsedActions]: alterActions,
  [CommandName.ApplyMovement]: movement,
  [CommandName.ApplySurprise]: surprise,
} as const;

// export const combatantSocketHandler = ({
//   _id,
//   command,
//   settings: options = {},
// }: SystemSocketData['combatant']) => {
//   if (isGamemaster()) {
//     const combatant = CombatantHelpers.get(_id);
//     combatant && combatantCommands[command]({ combatant, settings: options });
//   }
// };
