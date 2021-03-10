import { createMessage } from '@src/chat/create-message';
import type { DamageMessageData } from '@src/chat/message-data';
import { formatArmorUsed } from '@src/combat/attack-formatting';
import type { AttackType } from '@src/combat/attacks';
import { ActorType } from '@src/entities/entity-types';
import type { Software } from '@src/entities/item/proxies/software';
import { SkillType } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { joinLabeledFormulas, rollLabeledFormulas } from '@src/foundry/rolls';
import { formatDamageType } from '@src/health/health';
import { HackingTestControls } from '@src/success-test/components/hacking-test-controls/hacking-test-controls';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, LitElement, property } from 'lit-element';
import { compact, map, pick, pipe } from 'remeda';
import { stopEvent } from 'weightless';
import { requestCharacter } from '../../character-request-event';
import styles from './attack-info-styles.scss';

@customElement('character-view-software-attacks')
export class CharacterViewSoftwareAttacks extends LitElement {
  static get is() {
    return 'character-view-software-attacks' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) software!: Software;

  private async createMessage(attackType: AttackType) {
    const { token, character } = requestCharacter(this);
    const { attacks, name } = this.software;
    const hasSecondaryAttack = !!attacks.secondary;

    const attack = attacks[attackType] || attacks.primary;

    const damage: DamageMessageData | undefined = notEmpty(attack.rollFormulas)
      ? {
          ...pick(attack, [
            'armorPiercing',
            'armorUsed',
            'damageType',
            'notes',
            'reduceAVbyDV',
          ]),
          source: `${name} ${hasSecondaryAttack ? `[${attack.label}]` : ''}`,
          rolledFormulas: pipe(
            attack.rollFormulas,
            compact,
            rollLabeledFormulas,
          ),
        }
      : undefined;
    createMessage({
      data: {
        header: this.software.messageHeader,
        hack: {
          software: this.software.getDataCopy(),
          attackType,
        },
        damage,
      },
      entity: token || character,
    });
  }

  private startAttackTest(attackType: AttackType) {
    const { token, character } = requestCharacter(this);
    if (!character) return; // TODO maybe throw error
    const { software } = this;
    HackingTestControls.openWindow({
      entities: { token, actor: character.actor },
      getState: (actor) => {
        if (actor.proxy.type === ActorType.Character) {
          const { ego, weapons } = actor.proxy;
          const weapon = weapons.software.find((w) => w.id === software.id);
          if (!weapon) return null;
          return {
            ego,
            character: actor.proxy,
            token,
            skill: ego.getCommonSkill(SkillType.Infosec),
            software: weapon,
            primaryAttack: attackType === 'primary',
          };
        }
        return null;
      },
    });
  }

  render() {
    const { secondary } = this.software.attacks;

    return html`
      ${this.renderAttack('primary')}
      ${secondary ? this.renderAttack('secondary') : ''}
    `;
  }

  private renderAttack(type: AttackType) {
    const attack = this.software.attacks[type];
    if (!attack) return '';

    const info = compact([
      attack.aptitudeCheckInfo.check &&
        `${localize(attack.aptitudeCheckInfo.check)} ${localize(
          'check',
        )} ${localize('SHORT', 'versus')} ${localize('effects')}`,
      notEmpty(attack.rollFormulas) &&
        [
          formatDamageType(attack.damageType),
          joinLabeledFormulas(attack.rollFormulas),
          formatArmorUsed(attack),
        ].join(' '),
      notEmpty(attack.attackTraits) &&
        map(attack.attackTraits, localize).join(', '),
      attack.notes,
    ]).join('. ');

    if (!this.software.attacks.secondary && !info.length) return '';
    return html`
      <colored-tag
        type="attack"
        clickable
        ?disabled=${!this.software.editable}
        @click=${() => this.startAttackTest(type)}
        @contextmenu=${(ev: Event) => {
          stopEvent(ev);
          this.createMessage(type);
        }}
      >
        <span> ${info}</span>
        ${this.software.attacks.secondary
          ? html` <span slot="after">${attack.label}</span> `
          : ''}
      </colored-tag>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-software-attacks': CharacterViewSoftwareAttacks;
  }
}
