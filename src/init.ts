import { enumValues } from './data-enums';
import { ActorEP } from './entities/actor/actor';
import { ActorEPSheet } from './entities/actor/actor-sheet';
import { ChatMessageEP } from './entities/chat-message';
import { ItemEP } from './entities/item/item';
import { ItemEPSheet } from './entities/item/item-sheet';
import { SceneEP } from './entities/scene';
import { UserEP } from './entities/user';
import { ConditionType, conditionIcons } from './features/conditions';
import { registerEPSettings } from './foundry/game-settings';
import { setupSystemSocket } from './foundry/socket';
import { EP } from './foundry/system';

export let gameSettings: ReturnType<typeof registerEPSettings>;

Hooks.once('init', () => {
  gameSettings = registerEPSettings();
  CONFIG.Actor.entityClass = ActorEP;
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet(EP.Name, ActorEPSheet, { makeDefault: true });

  CONFIG.Scene.entityClass = SceneEP;
  CONFIG.ChatMessage.entityClass = ChatMessageEP;
  CONFIG.ChatMessage.batchSize = 20;
  CONFIG.User.entityClass = UserEP;

  CONFIG.Item.entityClass = ItemEP;
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet(EP.Name, ItemEPSheet, { makeDefault: true });
  CONFIG.TinyMCE.css.push(`${EP.Path}/darkMCE.css`);
  CONFIG.Combat.initiative.decimals = 2;
  CONFIG.fontFamilies.push('Rubik');
  CONFIG.defaultFontFamily = 'Rubik';
  CONFIG.statusEffects = [CONFIG.statusEffects[0]].concat(
    enumValues(ConditionType).map((condition) => ({
      icon: conditionIcons[condition],
      id: condition as string,
      label: `${EP.LocalizationNamespace}.${condition}`,
    })),
  );
});

Hooks.once('ready', async () => {
  requestAnimationFrame(() => document.body.classList.add('ready'));
  setupSystemSocket();

  // document.body.appendChild(new AppRoot());
});
