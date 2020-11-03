import { EP } from '@src/foundry/system';
import { ItemOperations, ActorEP } from '../actor';
import type { ActorType } from '../../entity-types';
import type { ItemEP, ItemProxy } from '../../item/item';
import type { ActorEntity, NonEditableProps } from '../../models';
import type { UpdateStore } from '../../update-store';
import { localize } from '@src/foundry/localization';
import { render, html } from 'lit-html';
import { openDialog } from 'web-dialog';
import {
  Drop,
  DropType,
  itemDropToItemAgent,
} from '@src/foundry/drag-and-drop';

export type ActorProxyInit<T extends ActorType> = {
  data: ActorEntity<T>;
  updater: UpdateStore<ActorEntity<T>>;
  items: Collection<ItemEP>;
  itemOperations: ItemOperations;
  actor: ActorEP;
};

export abstract class ActorProxyBase<T extends ActorType> {
  protected data: ActorEntity<T>;
  readonly updater: UpdateStore<ActorEntity<T>>;
  readonly items: Collection<ItemEP>;
  readonly itemOperations: ItemOperations;
  readonly actor: ActorEP;

  constructor({
    data,
    updater,
    items,
    itemOperations,
    actor,
  }: ActorProxyInit<T>) {
    this.data = data;
    this.updater = updater;
    this.items = items;
    this.itemOperations = itemOperations;
    this.actor = actor;
  }

  protected get epData() {
    return this.data.data;
  }

  get epFlags() {
    return this.data.flags[EP.Name];
  }

  get id() {
    return this.data._id;
  }

  get name() {
    return this.data.name;
  }

  get type() {
    return this.data.type;
  }

  abstract get subtype(): string;

  get editable() {
    return this.updater.editable;
  }

  get img() {
    return this.data.img;
  }

  get disabled() {
    return !this.updater.editable;
  }

  get description() {
    return this.epData.description;
  }

  dataCopy() {
    return duplicate(this.data);
  }

  createActor() {
    // TODO: Replace temporary features
    return ActorEP.create({
      ...this.dataCopy(),
      items: [...this.items].map((item) => item.dataCopy()),
    });
  }

  hasItemAgent(agent: ItemProxy | null | undefined) {
    return this.items.get(agent?.id)?.agent === agent;
  }

  abstract acceptItemAgent(
    agent: ItemProxy,
  ):
    | { accept: true }
    | {
        accept: false;
        override: boolean;
        rejectReason: string;
      };

  addItemAgent(agent: ItemProxy, placeLast: boolean) {
    return this.itemOperations.add({
      ...agent.getDataCopy(false),
      sort: placeLast
        ? this.highestItemSort + CONST.SORT_INTEGER_DENSITY
        : agent.sort,
    });
  }

  private get highestItemSort() {
    return [...this.items.values()].reduce(
      (accum, { agent }) => Math.max(accum, agent.sort || 0),
      0,
    );
  }

  async handleDrop({ ev, drop }: { ev: DragEvent; drop: Drop }) {
    // TODO Allow additional step, like changing trait level
    switch (drop.type) {
      case DropType.Item:
        {
          const agent = await itemDropToItemAgent(drop);
          if (!agent) return;
          const allow = this.acceptItemAgent(agent);
          if (allow.accept) this.addItemAgent(agent, true);
          else {
            openDialog({
              center: true,
              $content: (dialog) =>
                render(
                  html`
                    <header>
                      <h2>
                        ${agent.name} was rejected by ${localize(this.type)}
                        ${this.name}.
                      </h2>
                    </header>
                    <article>
                      <p>${allow.rejectReason}</p>
                    </article>
                    <footer>
                      ${allow.override
                        ? html`
                            <mwc-button
                              outlined
                              @click=${() => {
                                dialog.close();
                                this.addItemAgent(agent, true);
                              }}
                              label=${localize('override')}
                            ></mwc-button>
                          `
                        : ''}
                      <mwc-button
                        @click=${() => dialog.close()}
                        label=${localize('close')}
                      ></mwc-button>
                    </footer>
                  `,
                  dialog,
                ),
            });
          }
        }

        break;

      default:
        break;
    }
  }
}
