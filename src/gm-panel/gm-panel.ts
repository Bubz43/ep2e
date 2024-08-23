import { renderSelectField } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { AptitudeType, enumValues } from '@src/data-enums';
import type { ActorEP } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import { ActorType } from '@src/entities/entity-types';
import { SkillType } from '@src/features/skills';
import { customElement, html, LitElement, state } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { isNumber } from 'remeda';
import styles from './gm-panel.scss';

const hooks = [
  'createFolder',
  'updateFolder',
  'deleteFolder',
  'createActor',
  'updateActor',
  'deleteActor',
];

const options: ['aptitudeCheck', 'skillTest'] = ['aptitudeCheck', 'skillTest'];

@customElement('gm-panel')
export class GMPanel extends LitElement {
  static get is() {
    return 'gm-panel';
  }

  static get styles() {
    return [styles];
  }

  @state() private successTestType: typeof options[number] =
    'aptitudeCheck';

  @state() private skillType: SkillType = SkillType.Athletics;

  @state() private aptitude: AptitudeType = AptitudeType.Cognition;

  @state() private selectedFolderId: string = '';

  @state() private foldersWithCharacters: string[] = [];

  @state() private characters: Character[] = [];

  private readonly setState = () => {
    const foldersWithCharacters = new Map<Folder, ReadonlySet<Character>>();
    const foldersWithoutDirectCharacters = new Set<Folder>();

    for (const folder of game.folders) {
      if (folder.type !== 'Actor') {
        continue;
      }
      const characters = new Set<Character>();
      for (const unknown of folder.contents) {
        const actor = unknown as ActorEP;
        if (actor.hasPlayerOwner && actor.proxy.type === ActorType.Character) {
          characters.add(actor.proxy);
        }
      }
      if (characters.size > 0) {
        foldersWithCharacters.set(folder, characters);
      } else {
        foldersWithoutDirectCharacters.add(folder);
      }
    }

    const allCharactersCache = new Map<Folder, ReadonlySet<Character>>();
    function getAllCharacters(folder: Folder): ReadonlySet<Character> {
      let cached = allCharactersCache.get(folder);
      if (!cached) {
        const characters = new Set<Character>();
        const own = foldersWithCharacters.get(folder);
        if (own) {
          for (const character of own) {
            characters.add(character);
          }
        }

        if (folder.children?.length) {
          for (const child of folder.children) {
            for (const character of getAllCharacters(child)) {
              characters.add(character);
            }
          }
        }

        cached = characters;
        allCharactersCache.set(folder, characters);
      }
      return cached;
    }

    for (const folder of foldersWithoutDirectCharacters) {
      const characters = getAllCharacters(folder);
      if (characters.size > 0) {
        foldersWithCharacters.set(folder, characters);
      }
    }

    this.foldersWithCharacters = Array.from(foldersWithCharacters.keys()).map(
      (folder) => folder.id,
    );

    const { selectedFolderId } = this;
    const selectedFolder = selectedFolderId
      ? game.folders.get(selectedFolderId)
      : null;
    const validSelectedFolder =
      selectedFolder && foldersWithCharacters.has(selectedFolder)
        ? selectedFolder
        : null;
    if (validSelectedFolder) {
      this.characters = Array.from(getAllCharacters(validSelectedFolder));
    } else {
      this.selectedFolderId = '';
      const characters: Character[] = [];
      for (const actor of game.actors) {
        if (actor.hasPlayerOwner && actor.proxy.type === ActorType.Character) {
          characters.push(actor.proxy);
        }
      }
      this.characters = characters;
    }
  };

  connectedCallback() {
    this.setState();
    super.connectedCallback();
    hooks.forEach((hook) => Hooks.on(hook, this.setState));
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    hooks.forEach((hook) => Hooks.off(hook, this.setState));
  }

  private getTestTarget(ego: Ego) {
    if (this.successTestType === 'aptitudeCheck') {
      const aptitude = ego.aptitudes[this.aptitude];
      return aptitude * 3;
    }
    const skill = ego.getCommonSkill(this.skillType);
    return isNumber(skill.total) ? skill.total : '-';
  }

  private formatFolderName(folderId: string) {
    const folder = game.folders.get(folderId);
    if (!folder) {
      return '';
    }
    const { name, ancestors } = folder
    if (ancestors?.length) {
      return [name, ...ancestors.map(a => a.name)].reverse().join(' / ');
    }
    return name;
  }

  render() {
    const {
      characters,
      selectedFolderId,
      foldersWithCharacters,
      aptitude,
      successTestType,
      skillType,
    } = this;
    return html` ${renderAutoForm({
        props: {
          skillType,
          aptitude,
          successTestType,
          selectedFolderId: selectedFolderId ?? '',
        },
        noDebounce: true,
        update: (changes) => {
          if (changes.skillType) {
            this.skillType = changes.skillType;
          }
          if (changes.aptitude) {
            this.aptitude = changes.aptitude;
          }
          if (changes.successTestType) {
            this.successTestType = changes.successTestType;
          }
          if (changes.selectedFolderId !== undefined) {
            this.selectedFolderId = changes.selectedFolderId;
            this.setState();
          }
        },
        fields: ({
          skillType,
          selectedFolderId,
          successTestType,
          aptitude,
        }) => [
          renderSelectField(
            {
              ...selectedFolderId,
              label: 'Limit to Folder',
            },
            foldersWithCharacters,
            {
              emptyText: '-',
              altLabel: (folderId) => this.formatFolderName(folderId),
            },
          ),
          renderSelectField(
            {
              ...successTestType,
              label: 'Success Test',
            },
            options,
            {
              altLabel: (value) =>
                value === 'aptitudeCheck' ? 'Aptitude Check' : 'Skill Test',
            },
          ),
          successTestType.value === 'aptitudeCheck'
            ? renderSelectField(
                {
                  ...aptitude,
                  label: 'Aptitude',
                },
                enumValues(AptitudeType),
              )
            : renderSelectField(
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
            <th class="target-col">Base Target</th>
          </tr>
        </thead>
        ${repeat(
          characters,
          (character) => character.id,
          (character) => html`<tr>
              <td>${character.name}</td>
              <td>${this.getTestTarget(character.ego)}</td>
            </tr>`,
        )}
      </table>`;
  }
}
