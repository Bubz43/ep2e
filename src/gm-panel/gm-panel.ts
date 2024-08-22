import { renderSelectField } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import { ActorType } from '@src/entities/entity-types';
import { SkillType } from '@src/features/skills';
import { customElement, html, LitElement, state } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { isNumber } from 'remeda';
import styles from './gm-panel.scss';

@customElement('gm-panel')
export class GMPanel extends LitElement {
  static get is() {
    return 'gm-panel';
  }

  static get styles() {
    return [styles];
  }

  @state() private skillType: SkillType = SkillType.Athletics;

  render() {
    const playerCharacters: Character[] = [];
    for (const actor of game.actors) {
      if (actor.hasPlayerOwner && actor.proxy.type === ActorType.Character) {
        playerCharacters.push(actor.proxy);
      }
    }
    const { skillType } = this;
    return html`
      ${renderAutoForm({
        props: { skillType },
        noDebounce: true,
        update: (changes) => {
          if (changes.skillType) {
            this.skillType = changes.skillType;
          }
        },
        fields: ({ skillType }) => [
          renderSelectField(
            {
              ...skillType,
              label: 'Skill',
            },
            enumValues(SkillType),
          ),
        ],
      })}

      <table>
        <thead>
            <tr>
                <th>PC</th>
                <th>Test Target</th>
            </tr>
        </thead>
        ${repeat(
          playerCharacters,
          (character) => character.id,
          (character) => {
            const skill = character.ego.getCommonSkill(skillType);
            const skillTotal = isNumber(skill.total) ? skill.total : '-';
            return html`<tr>
              <td>${character.name}</td>
              <td>${skillTotal}</td>
            </tr>`;
          },
        )}
        
      </table>`;
  }
}
