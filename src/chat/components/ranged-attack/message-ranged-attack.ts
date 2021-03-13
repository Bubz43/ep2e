import type {
  RangedAttackMessageData,
  SuccessTestMessageData,
} from '@src/chat/message-data';
import { RangedWeaponAccessory, SuperiorResultEffect } from '@src/data-enums';
import { ActorType, ItemType } from '@src/entities/entity-types';
import { pickOrDefaultCharacter } from '@src/entities/find-entities';
import { BeamWeapon } from '@src/entities/item/proxies/beam-weapon';
import { Firearm } from '@src/entities/item/proxies/firearm';
import { Railgun } from '@src/entities/item/proxies/railgun';
import { SeekerWeapon } from '@src/entities/item/proxies/seeker-weapon';
import { SprayWeapon } from '@src/entities/item/proxies/spray-weapon';
import { SkillType } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { SkillTestControls } from '@src/success-test/components/skill-test-controls/skill-test-controls';
import {
  createSuccessTestModifier,
  SuccessTestResult,
} from '@src/success-test/success-test';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property } from 'lit-element';
import { compact, concat, last, pick, pipe } from 'remeda';
import { MessageElement } from '../message-element';
import styles from './message-ranged-attack.scss';

@customElement('message-ranged-attack')
export class MessageRangedAttack extends MessageElement {
  static get is() {
    return 'message-ranged-attack' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) rangedAttack!: RangedAttackMessageData;

  @property({ type: Object }) successTest?: SuccessTestMessageData;

  get weapon() {
    const embedded = null;
    const { weapon: data } = this.rangedAttack;
    switch (data.type) {
      case ItemType.Firearm:
        return new Firearm({ data, embedded, nestedShape: false });

      case ItemType.Railgun:
        return new Railgun({ data, embedded, nestedShape: false });

      case ItemType.SeekerWeapon:
        return new SeekerWeapon({ data, embedded });

      case ItemType.BeamWeapon:
        return new BeamWeapon({ data, embedded });

      case ItemType.SprayWeapon:
        return new SprayWeapon({ data, embedded });
    }
  }

  get successTestInfo() {
    const test = this?.successTest;
    const result = last(test?.states || [])?.result;

    return result && test
      ? {
          result,
          superiorEffects: test.superiorResultEffects,
        }
      : null;
  }

  startDefense() {
    pickOrDefaultCharacter((character) => {
      SkillTestControls.openWindow({
        entities: { actor: character.actor },
        relativeEl: this,
        getState: (actor) => {
          if (actor.proxy.type !== ActorType.Character) return null;
          return {
            ego: actor.proxy.ego,
            character: actor.proxy,
            skill: actor.proxy.ego.getCommonSkill(SkillType.Fray),
            halve: true,
            opposing: {
              testName: `${this.weapon.name} ${localize('rangedAttack')}`,
            },
          };
        },
      });
    });
  }

  locateFirearmFiring(source: 'flash' | 'sound') {
    const { weapon } = this;
    pickOrDefaultCharacter((character) => {
      SkillTestControls.openWindow({
        entities: { actor: character.actor },
        relativeEl: this,
        getState: (actor) => {
          if (actor.proxy.type !== ActorType.Character) return null;
          return {
            ego: actor.proxy.ego,
            character: actor.proxy,
            skill: actor.proxy.ego.getCommonSkill(SkillType.Perceive),
            modifiers: compact([
              source === 'flash' &&
                weapon.accessories.includes(
                  RangedWeaponAccessory.FlashSuppressor,
                ) &&
                createSuccessTestModifier({
                  name: localize(RangedWeaponAccessory.FlashSuppressor),
                  value: -30,
                }),
              source === 'sound' &&
                weapon.accessories.includes(RangedWeaponAccessory.Silencer) &&
                createSuccessTestModifier({
                  name: localize(RangedWeaponAccessory.Silencer),
                  value: -30,
                }),
            ]),
            opposing: {
              testName: localize('locateFiredWeapon'),
            },
          };
        },
      });
    });
  }

  private createDamageMessage() {
    const { message, successTestInfo } = this;
    if (!successTestInfo) return;

    const { attacks, name } = this.weapon;
    const { result: testResult } = successTestInfo;
    const { damageModifiers, primaryAttack } = this.rangedAttack;

    const attack = primaryAttack ? attacks?.primary : attacks?.secondary;
    if (!attack) return;
    const superiorDamage =
      successTestInfo?.superiorEffects?.filter(
        (e) => e === SuperiorResultEffect.Damage,
      ) || [];

    const multiplier = testResult === SuccessTestResult.CriticalSuccess ? 2 : 1;
    const rolled = pipe(
      [
        testResult === SuccessTestResult.SuperiorSuccess &&
          superiorDamage.length >= 1 && {
            label: localize(testResult),
            formula: '+1d6',
          },
        testResult === SuccessTestResult.SuperiorSuccessX2 &&
          superiorDamage.length >= 1 && {
            label: localize(testResult),
            formula: successTestInfo ? `+${superiorDamage.length}d6` : '+2d6',
          },

        ...(damageModifiers ?? []),
      ],
      compact,
      concat(attack?.rollFormulas ?? []),
      rollLabeledFormulas,
    );
    message.createSimilar({
      header: {
        heading: name,
        subheadings: [localize('rangedAttack')],
      },
      damage: {
        ...pick(attack, [
          'armorPiercing',
          'armorUsed',
          'damageType',
          'notes',
          'reduceAVbyDV',
        ]),
        source: name,
        multiplier,
        rolledFormulas: rolled,
      },
    });
  }

  render() {
    const { attacks, name, type } = this.weapon;
    const { firingModeGroup, calledShot, primaryAttack } = this.rangedAttack;
    const { disabled } = this;
    const options: string[] = [];
    options.push(
      `${localize('firingMode')}: ${localize(firingModeGroup[0])} ${
        firingModeGroup[1] ? `[${localize(firingModeGroup[1])}]` : ''
      }`,
    );
    if (calledShot)
      options.push(`${localize('calledShot')}: ${localize(calledShot)}`);
    const attack = primaryAttack ? attacks?.primary : attacks?.secondary;

    // TODO Locate
    return html`
      ${this.successTest ? this.renderOppose() : ''}
      <p class="options">${options.join(', ')}</p>
      ${!disabled &&
      this.successTest &&
      type !== ItemType.SeekerWeapon &&
      notEmpty(attack?.rollFormulas)
        ? html`
            <mwc-button
              outlined
              dense
              class="roll-damage"
              @click=${this.createDamageMessage}
              >${localize('roll')} ${localize('damage')}</mwc-button
            >
          `
        : ''}
      ${attack && 'attackTraits' in attack && notEmpty(attack.attackTraits)
        ? html`
            <message-attack-traits
              .attackTraitInfo=${{
                traits: attack.attackTraits,
                source: name,
                testResult: this.successTestInfo?.result,
              }}
            ></message-attack-traits>
          `
        : ''}
    `;
  }

  private renderOppose() {
    return html`
      <sl-group label=${localize('defendWith')} class="defense">
        <wl-list-item clickable @click=${this.startDefense}
          >${localize(SkillType.Fray)} ÷2
        </wl-list-item>
      </sl-group>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-ranged-attack': MessageRangedAttack;
  }
}
