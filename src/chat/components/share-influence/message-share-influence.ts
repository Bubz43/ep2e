import type { SharedPsiInfluence } from '@src/chat/message-data';
import { pickOrDefaultCharacter } from '@src/entities/find-entities';
import { addFeature } from '@src/features/feature-helpers';
import { influenceInfo, PsiInfluenceType } from '@src/features/psi-influence';
import { currentWorldTimeMS, prettyMilliseconds } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { EP } from '@src/foundry/system';
import produce from 'immer';
import { customElement, html, LitElement, property } from 'lit-element';
import styles from './message-share-influence.scss';

@customElement('message-share-influence')
export class MessageShareInfluence extends LitElement {
  static get is() {
    return 'message-share-influence' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) sharedInfluence!: SharedPsiInfluence;

  private applyTraitInfluence(level: number) {
    this.applyInfluence(level);
  }

  private applyMotivationOrUniqueInfluence() {
    this.applyInfluence();
  }

  private applyInfluence(level?: number) {
    pickOrDefaultCharacter((character) => {
      const { influence, duration } = this.sharedInfluence;
      const finalInfluence = produce(influence, (draft) => {
        if (
          typeof level === 'number' &&
          draft.type === PsiInfluenceType.Trait
        ) {
          draft.trait.system.state.level = level;
        }
        draft.active = {
          duration,
          startTime: currentWorldTimeMS(),
        };
      });
      character.updater
        .path('flags', EP.Name, 'foreignPsiInfluences')
        .commit((influences) => addFeature(influences || [], finalInfluence));
    });
  }

  render() {
    const { influence, duration } = this.sharedInfluence;
    const { name } = influenceInfo(influence);
    return html`
      <p class="name">${name}</p>
      <p class="duration">
        ${localize('duration')}:
        ${prettyMilliseconds(duration, { compact: false })}
      </p>
      <div class="levels">
        ${influence.type === PsiInfluenceType.Trait
          ? html`
              ${influence.trait.system.levels.map(
                (_, index) =>
                  html`<mwc-button
                    @click=${() => this.applyTraitInfluence(index)}
                    >${localize('level')} ${index + 1}</mwc-button
                  >`,
              )}
            `
          : html`<mwc-button @click=${this.applyMotivationOrUniqueInfluence}
              >${localize('apply')} ${localize('influence')}</mwc-button
            >`}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-share-influence': MessageShareInfluence;
  }
}
