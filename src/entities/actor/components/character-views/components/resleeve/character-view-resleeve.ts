import { renderLabeledCheckbox } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { Character } from '@src/entities/actor/proxies/character';
import { Sleeve, ownedSleeves, isSleeve } from '@src/entities/actor/sleeves';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { ItemProxy } from '@src/entities/item/item';
import type { PhysicalTech } from '@src/entities/item/proxies/physical-tech';
import { idProp } from '@src/features/feature-helpers';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { format, localize } from '@src/foundry/localization';
import { userCan } from '@src/foundry/misc-helpers';
import { addEPSocketHandler } from '@src/foundry/socket';
import { EP } from '@src/foundry/system';
import { tooltip } from '@src/init';
import { RenderDialogEvent } from '@src/open-dialog';
import { openMenu } from '@src/open-menu';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
} from 'lit-element';
import { render } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat';
import {
  compact,
  equals,
  find,
  map,
  mapValues,
  pipe,
  reject,
  sortBy,
} from 'remeda';
import styles from './character-view-resleeve.scss';

@customElement('character-view-resleeve')
export class CharacterViewResleeve extends LitElement {
  static get is() {
    return 'character-view-resleeve' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @internalProperty() private selectedSleeve: Sleeve | null = null;

  private keptItems = new Set<string>();

  private resleeveOptions = {
    keepCurrent: false,
  };

  private socketListener: (() => void) | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.socketListener = addEPSocketHandler('actorChanged', (identifiers) => {
      if (
        this.selectedSleeve &&
        equals(this.selectedSleeve.actor.identifiers, identifiers)
      ) {
        const { proxy } = this.selectedSleeve.actor;
        this.selectedSleeve = isSleeve(proxy) ? proxy : null;
      }
    });
  }

  disconnectedCallback() {
    this.cleanup();
    super.connectedCallback();
  }

  private cleanup() {
    this.keptItems.clear();
    this.selectedSleeve = null;
    this.resleeveOptions = mapValues(this.resleeveOptions, () => false);
    this.socketListener?.();
    this.socketListener = null;
  }

  private toggleKeptItem(id: string) {
    if (this.keptItems.has(id)) this.keptItems.delete(id);
    else this.keptItems.add(id);
  }
  private async resleeve(ev: Event) {
    if (!this.selectedSleeve) return;
    const { sleeve } = this.character;
    if (sleeve) {
      if (!this.resleeveOptions.keepCurrent) {
        if (ev instanceof CustomEvent && 'action' in ev.detail) {
          if (ev.detail.action !== 'confirm') return;
        } else {
          this.dispatchEvent(new RenderDialogEvent(html`
          <mwc-dialog heading="${localize("confirm")} ${localize("resleeve")}" @closed=${this.resleeve.bind(this)}>
          <p>
                  ${format('SleevePermanentlyDeleted', { name: sleeve.name })}
                </p>
                <mwc-button
                  slot="secondaryAction"
                  dialogAction="cancel"
                  label=${localize('cancel')}
                ></mwc-button>
                <mwc-button
                  slot="primaryAction"
                  dialogAction="confirm"
                  label=${localize('confirm')}
                ></mwc-button>
        </mwc-dialog>
          `))
          return
          // return openDialog((dialog) => {
          //   dialog.heading = `${localize('confirm')} ${localize('resleeve')}`;
          //   render(
          //     html`
          //       <p>
          //         ${format('SleevePermanentlyDeleted', { name: sleeve.name })}
          //       </p>
          //       <mwc-button
          //         slot="secondaryAction"
          //         dialogAction="cancel"
          //         label=${localize('cancel')}
          //       ></mwc-button>
          //       <mwc-button
          //         slot="primaryAction"
          //         dialogAction="confirm"
          //         label=${localize('confirm')}
          //       ></mwc-button>
          //     `,
          //     dialog,
          //   );
          //   dialog.addEventListener('closed', this.resleeve.bind(this), {
          //     once: true,
          //   });
          // });
        }
      } else await sleeve.createActor();
      if (sleeve.type !== this.selectedSleeve.type) {
        await this.character.updater
          .prop('flags', EP.Name, sleeve.type)
          .commit(null);
      }
    }

    if (sleeve && notEmpty(sleeve.items)) {
      await this.character.itemOperations.remove(
        ...reject([...sleeve.items.keys()], (id) => this.keptItems.has(id)),
      );
    }

    const { items } = this.selectedSleeve;
    const data = this.selectedSleeve.dataCopy();
    data.items = [];

    const added = await this.character.itemOperations.add(
      ...[...items.values()].map((item) => {
        if ('equipped' in item) {
          const data = item.getDataCopy(false);
          data.data.state.equipped = true;
          return data;
        }

        return item.getDataCopy(false);
      }),
    );

    const nonDefaultBrain =
      'nonDefaultBrain' in this.selectedSleeve &&
      this.selectedSleeve.nonDefaultBrain;

    if (data.type !== ActorType.Infomorph && nonDefaultBrain) {
      const { items } = this.character.actor;
      pipe(
        added,
        map((id) => items?.get(id)?.proxy),
        compact,
        find(
          (proxy) =>
            proxy.name === nonDefaultBrain.name &&
            equals(proxy.epData, nonDefaultBrain.epData) &&
            equals(proxy.data.flags, nonDefaultBrain.data.flags),
        ),
        (brain) =>
          brain
            ? (data.data.brain = brain.id)
            : notify(
                NotificationType.Error,
                `Unable to find ${nonDefaultBrain.name}`,
              ),
      );
    }

    await this.character.updater
      .prop('flags', EP.Name, this.selectedSleeve.type)
      .commit(data);

    this.cleanup();
  }

  private openSelectionList() {
    openMenu({
      content: ownedSleeves().map((sleeve) => ({
        label: `${sleeve.name} (${localize(sleeve.type)})`,
        activated: this.selectedSleeve === sleeve,
        callback: () => (this.selectedSleeve = sleeve),
        icon: html`<img src=${sleeve.img} />`,
      })),
    });
  }

  render() {
    return html`
      <section>
        <character-view-drawer-heading
          >${localize('resleeve')}</character-view-drawer-heading
        >
        ${this.character.sleeve
          ? this.renderCurrent(this.character.sleeve)
          : ''}
      </section>
      <section>
        <sl-header heading="${localize('selected')} ${localize('sleeve')}">
          <mwc-icon-button
            slot="action"
            icon="person_search"
            @click=${this.openSelectionList}
          ></mwc-icon-button>
        </sl-header>
        ${this.selectedSleeve ? this.renderSelected(this.selectedSleeve) : ''}
      </section>
      <div class="controls">
        ${renderAutoForm({
          props: this.resleeveOptions,
          classes: 'option-form',
          update: (changed, original) =>
            (this.resleeveOptions = { ...original, ...changed }),
          fields: ({ keepCurrent }) => [
            this.character.sleeve
              ? renderLabeledCheckbox(
                  {
                    ...keepCurrent,
                    label: `${localize('keep')} ${localize('current')}`,
                  },
                  {
                    disabled: !userCan('ACTOR_CREATE'),
                    tooltipText: 'Requires actor creator privileges',
                  },
                )
              : '',
          ],
        })}
        <submit-button
          @click=${this.resleeve}
          ?complete=${!!this.selectedSleeve}
          label=${localize(this.character.sleeve ? 'resleeve' : 'sleeve')}
        ></submit-button>
      </div>
    `;
  }

  private renderCurrent(sleeve: Sleeve) {
    return html`
      <sl-header heading="${localize('current')} ${localize('sleeve')}">
        <mwc-icon
          slot="info"
          data-tooltip="${localize('check')} ${localize(
            'ware',
          ).toLocaleLowerCase()} ${localize('to')} ${localize(
            'keep',
          ).toLocaleLowerCase()}"
          @mouseover=${tooltip.fromData}
          >info</mwc-icon
        >
      </sl-header>
      <mwc-list class="current-sleeve" multi>
        <mwc-list-item graphic="medium" twoline @click=${sleeve.openForm}>
          <img slot="graphic" src=${sleeve.img} />
          <span>${sleeve.name}</span>
          <span slot="secondary">${localize(sleeve.type)}</span>
        </mwc-list-item>
        <li divider></li>

        ${repeat(
          sortBy([...sleeve.items.values()], (i) => i.type === ItemType.Trait),
          idProp,
          (item) => {
            if (item.type === ItemType.Trait) return this.renderItem(item);
            const selected = this.keptItems.has(item.id);
            return html`
              <mwc-check-list-item
                class="item"
                ?selected=${selected}
                @click=${() => this.toggleKeptItem(item.id)}
              >
                <span
                  >${item.fullName}
                  <span class="item-type">${item.fullType}</span></span
                >
              </mwc-check-list-item>
            `;
          },
        )}
      </mwc-list>
    `;
  }

  private renderSelected(sleeve: Sleeve) {
    return html`
      <mwc-list class="selected-sleeve">
        <mwc-list-item graphic="medium" twoline @click=${sleeve.openForm}>
          <img slot="graphic" src=${sleeve.img} />
          <span>${sleeve.name}</span>
          <span slot="secondary">${localize(sleeve.type)}</span>
        </mwc-list-item>
        <li divider></li>
        ${repeat(sleeve.items.values(), idProp, this.renderItem)}
      </mwc-list>
    `;
  }

  private renderItem = (item: ItemProxy) => {
    return html` <mwc-list-item class="item" noninteractive>
      <span
        >${item.fullName}
        <span class="item-type"
          >${item.type === ItemType.Trait
            ? localize(item.type)
            : item.fullType}</span
        ></span
      >
    </mwc-list-item>`;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-resleeve': CharacterViewResleeve;
  }
}
