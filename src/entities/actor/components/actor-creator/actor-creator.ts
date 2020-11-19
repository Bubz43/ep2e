import { renderLabeledCheckbox } from '@src/components/field/fields';
import type { Form } from '@src/components/form/form';
import { renderAutoForm } from '@src/components/form/forms';
import type { SubmitButton } from '@src/components/submit-button/submit-button';
import { ActorType } from '@src/entities/entity-types';
import type { SleeveType } from '@src/entities/models';
import { MutateEvent, mutateEntityHook } from '@src/foundry/hook-setups';
import { localize } from '@src/foundry/localization';
import { safeMerge } from '@src/utility/helpers';
import { ready } from 'jquery';
import { LazyGetter } from 'lazy-get-decorator';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
  query,
  eventOptions,
  PropertyValues,
} from 'lit-element';
import { flatMapToObj } from 'remeda';
import styles from './actor-creator.scss';

enum ActorKind {
  Character = 'character',
  Sleeve = 'sleeve',
}

enum CharacterTemplate {
  PC = 'playerCharacter',
  Muse = 'muse',
  Threat = 'threat',
}

@customElement('actor-creator')
export class ActorCreator extends LitElement {
  static get is() {
    return 'actor-creator' as const;
  }

  static styles = [styles];

  @property({ type: String }) folder?: string;

  @query('submit-button') private submitButton!: SubmitButton;

  @query('.main-form sl-form') private actorForm!: Form;

  @internalProperty() private actorKind = ActorKind.Character;

  @internalProperty() private characterTemplate = CharacterTemplate.PC;

  private options = {
    renderSheet: true,
    closeOnCreate: true,
    actorLink: true,
  };

  private characterData = {
    name: '',
    template: CharacterTemplate.PC,
  };

  private sleeveData: {
    name: string;
    type: SleeveType;
  } = {
    name: '',
    type: ActorType.Biological,
  };

  async connectedCallback() {
    super.connectedCallback();
    await this.updateComplete;
    this.focusFirstInput();
    this.toggleHooks('on');
  }

  disconnectedCallback() {
    this.toggleHooks('off');
    LazyGetter().reset(this.availableSleeves);
    super.disconnectedCallback();
  }

  updated(changedProps: PropertyValues) {
    if (changedProps.has('folder')) {
      this.focusFirstInput();
    }
    super.updated(changedProps);
  }

  private updateFromHook = () => this.requestUpdate();

  private focusFirstInput() {
    requestAnimationFrame(() => {
      this.renderRoot.querySelector('sl-field')?.input?.focus();
    });
  }

  private get folders() {
    return flatMapToObj([...game.folders], ({ displayed, data }) =>
      data.type === 'Item' && displayed ? [[data._id, data.name]] : [],
    );
  }

  private toggleHooks(hook: 'on' | 'off') {
    for (const event of [
      MutateEvent.Create,
      MutateEvent.Update,
      MutateEvent.Delete,
    ]) {
      mutateEntityHook({
        entity: Folder,
        hook,
        event,
        callback: this.updateFromHook,
      });
    }
  }

  @eventOptions({ capture: true })
  private clickSubmit(ev: KeyboardEvent) {
    if (ev.key === 'Enter') {
      this.submitButton?.click();
    }
  }

  @LazyGetter()
  get availableSleeves() {
    console.log('got sleeves');
    return [...game.actors].flatMap((actor) =>
      actor.agent.type === ActorType.Character ? [] : actor.agent,
    );
  }

  private updateOptions = (options: Partial<ActorCreator['options']>) => {
    this.options = safeMerge(this.options, options);
  };

  render() {
    return html`
      ${renderAutoForm({
        classes: 'options-form',
        props: this.options,
        update: this.updateOptions,
        fields: ({ renderSheet, closeOnCreate, actorLink }) => [
          renderLabeledCheckbox(renderSheet),
          renderLabeledCheckbox({
            ...closeOnCreate,
            label: `${localize('close')} ${localize('on')} ${localize(
              'create',
            )}`,
          }),
          renderLabeledCheckbox(actorLink),
        ],
      })}

    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'actor-creator': ActorCreator;
  }
}
