import { ChatMessageRequestEvent } from '@src/chat/chat-message-request-event';
import type { MessageData } from '@src/chat/message-data';
import type { ChatMessageEP } from '@src/entities/chat-message';
import { findToken } from '@src/entities/find-entities';
import { localize } from '@src/foundry/localization';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, LitElement, property } from 'lit-element';
import styles from './message-content.scss';

@customElement('message-content')
export class MessageContent extends LitElement {
  static get is() {
    return 'message-content' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) message!: ChatMessageEP;

  @property({ type: Object }) data!: MessageData;

  @property({ type: Boolean }) disabled = false;

  firstUpdated() {
    this.addEventListener(ChatMessageRequestEvent.is, (ev) => {
      if (ev instanceof ChatMessageRequestEvent) {
        ev.chatMessage = this.message;
        ev.nonInteractive = this.disabled;
        ev.stopPropagation();
      }
    });
  }

  render() {
    const {
      header,
      stress,
      healthChange,
      heal,
      damage,
      substanceUse,
      explosiveUse,
      attackTraitInfo,
      areaEffect,
      meleeAttack,
      successTest,
      favor,
      targets,
      specialTest,
      thrownAttack,
      rangedAttack,
      hack,
      infectionTest,
      influenceRoll,
      psiTest,
      sleightSustainEnd,
      sharedInfluence,
      techUse,
    } = this.data;
    console.log(header);
    if (!this.message.isContentVisible)
      return header
        ? html` <message-header hidden .data=${header}></message-header> `
        : '';

    return html`
      ${header ? html` <message-header .data=${header}></message-header> ` : ''}
      ${notEmpty(targets)
        ? html`
            <div class="targets">
              <span>${localize('targets')}:</span>
              ${targets.map((target) => {
                const token = findToken(target);
                return token
                  ? html`<img
                      height="24px"
                      loading="lazy"
                      src=${token.data.img}
                      title=${token.data.name}
                    />`
                  : '';
              })}
            </div>
          `
        : ''}
      ${areaEffect
        ? html`
            <message-area-effect
              .areaEffect=${areaEffect}
            ></message-area-effect>
          `
        : ''}
      ${successTest
        ? html`<message-success-test
              .successTest=${successTest}
            ></message-success-test>

            ${psiTest
              ? html`
                  <message-psi-test
                    .successTest=${successTest}
                    .psiTest=${psiTest}
                  ></message-psi-test>
                `
              : ''}
            ${specialTest && this.message.editable
              ? html`
                  <message-special-test
                    .specialTest=${specialTest}
                    .successTest=${successTest}
                  ></message-special-test>
                `
              : ''} `
        : ''}
      ${favor ? html` <message-favor .favor=${favor}></message-favor> ` : ''}
      ${infectionTest
        ? html` <message-infection-test
            .successTest=${successTest}
            .infectionTest=${infectionTest}
          ></message-infection-test>`
        : ''}
      ${influenceRoll
        ? html`
            <message-influence-roll
              .influenceRoll=${influenceRoll}
            ></message-influence-roll>
          `
        : ''}
      ${meleeAttack
        ? html`
            <message-melee-attack
              .meleeAttack=${meleeAttack}
              .successTest=${successTest}
            ></message-melee-attack>
          `
        : ''}
      ${thrownAttack
        ? html`<message-thrown-attack
            .thrownAttack=${thrownAttack}
            .successTest=${successTest}
          ></message-thrown-attack>`
        : ''}
      ${rangedAttack
        ? html`<message-ranged-attack
            .rangedAttack=${rangedAttack}
            .successTest=${successTest}
          ></message-ranged-attack>`
        : ''}
      ${hack
        ? html`<message-hack
            .hack=${hack}
            .successTest=${successTest}
          ></message-hack>`
        : ''}
      ${explosiveUse
        ? html`
            <message-explosive
              .explosiveUse=${explosiveUse}
            ></message-explosive>
          `
        : ''}
      ${heal ? html` <message-heal .heal=${heal}></message-heal> ` : ''}
      ${damage ? html`<message-damage .damage=${damage}></message-damage>` : ''}
      ${stress
        ? html` <message-stress-test .stress=${stress}></message-stress-test> `
        : ''}
      ${attackTraitInfo
        ? html`
            <message-attack-traits
              .attackTraitInfo=${attackTraitInfo}
            ></message-attack-traits>
          `
        : ''}
      ${substanceUse
        ? html`<message-substance-use
            .substanceUse=${substanceUse}
          ></message-substance-use>`
        : ''}
      ${healthChange
        ? html`
            <message-health-change
              .healthChange=${healthChange}
            ></message-health-change>
          `
        : ''}
      ${sleightSustainEnd
        ? html`<message-sleight-sustain-end
            .sleightSustainEnd=${sleightSustainEnd}
          ></message-sleight-sustain-end>`
        : ''}
      ${sharedInfluence
        ? html`<message-share-influence
            .sharedInfluence=${sharedInfluence}
          ></message-share-influence>`
        : ''}
      ${techUse
        ? html`<message-tech-use .techUse=${techUse}></message-tech-use>`
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-content': MessageContent;
  }
}
