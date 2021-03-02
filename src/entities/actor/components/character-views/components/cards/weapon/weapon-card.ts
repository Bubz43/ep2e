import { startMeleeAttack } from '@src/combat/attack-init';
import type { AttackType } from '@src/combat/attacks';
import { ItemType } from '@src/entities/entity-types';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import produce from 'immer';
import { customElement, html, property } from 'lit-element';
import { compact } from 'remeda';
import { requestCharacter } from '../../../character-request-event';
import { ItemCardBase } from '../item-card-base';
import styles from './weapon-card.scss';

@customElement('weapon-card')
export class WeaponCard extends ItemCardBase {
  static get is() {
    return 'weapon-card' as const;
  }

  static get styles() {
    return [...super.styles, styles];
  }

  @property({ attribute: false }) item!: MeleeWeapon;

  private toggleEquipped() {
    this.item.toggleEquipped();
  }

  private startAttackTest(attackType: AttackType) {
    const { token, character } = requestCharacter(this);
    if (!character) return; // TODO maybe throw error
    startMeleeAttack({
      actor: character.actor,
      token,
      attackType,
      weaponId: this.item.id,
    });
  }

  private openCoatingSelectMenu(ev: MouseEvent) {
    const { character } = requestCharacter(this);
    const coatings =
      character?.consumables.flatMap((c) =>
        c.type === ItemType.Substance && !(c.isBlueprint || c.isElectronic)
          ? c
          : [],
      ) ?? [];
    const { coating } = this.item;
    openMenu({
      header: { heading: `${this.item.name} ${localize('coating')}` },
      content: [
        ...(coating
          ? compact([
              {
                label: `${localize('remove')} ${coating.name}`,
                callback: async () => {
                  const same = coatings.find((c) => c.isSameAs(coating));
                  if (same) await same.setQuantity((current) => current + 1);
                  else
                    await character?.itemOperations.add(
                      produce(
                        coating.getDataCopy(),
                        ({ data }) => void (data.quantity = 1),
                      ),
                    );
                  await this.item.removeCoating();
                },
              },
              coatings.length && 'divider',
            ])
          : []),
        ...coatings.map((c) => ({
          label: c.fullName,
          callback: async () => {
            await this.item.setCoating(c);
            c.setQuantity((current) => current - 1);
          },
          activated: this.item.coating?.isSameAs(c),
          disabled: !c.quantity,
        })),
      ],
      position: ev,
    });
  }

  renderHeaderButtons() {
    const { item } = this;
    const { attacks } = item;
    return html`
      ${item.equipped
        ? html`
            <mwc-icon-button
              icon="invert_colors"
              @click=${this.openCoatingSelectMenu}
              ?disabled=${!item.editable}
            ></mwc-icon-button>
          `
        : // html` <button class="coating"></button>
          //     ${(['primary', 'secondary'] as const).map((attackType) => {
          //       const attack = attacks[attackType];
          //       if (!attack) return '';
          //       const label =
          //         attack.label || `${localize(attackType)} ${localize('attack')}`;
          //       return html`
          //         <mwc-icon-button
          //           @click=${() => this.startAttackTest(attackType)}
          //           ?disabled=${!item.editable}
          //           title=${label}
          //           >${label[0]}</mwc-icon-button
          //         >
          //       `;
          //     })}`
          html`
            <mwc-icon-button
              @click=${this.toggleEquipped}
              icon=${item.equipped ? 'archive' : 'unarchive'}
              ?disabled=${!item.editable}
            ></mwc-icon-button>
          `}
    `;
  }

  renderExpandedContent() {
    return html`
      ${this.item.type === ItemType.MeleeWeapon
        ? html`
            <character-view-melee-weapon-attacks
              .weapon=${this.item}
            ></character-view-melee-weapon-attacks>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'weapon-card': WeaponCard;
  }
}
