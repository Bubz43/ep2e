# Changelog

## [1.2.17] - 2025-23-28

- Fix Actor Link checkbox in Actor Creator not setting the value on the created actor
- Add a full movement modify effect to prehensile feet ware within physical augmentations compendium

## [1.2.16] - 2025-02-23

- Fix lists in rich text not having proper styling
- Fix Mnemonics, Spasm and Smart Clothing having wrong icon in compendiums
- Allow dropping physical gear onto Synthetic Shell window ware section, installing it as hardware
- Allow dropping apps onto morph window ware sections and installing them as meshware
- Allow dropping meshware onto biomorph window ware sections
- Add difficulty modifier select to success tests

## [1.2.15] - 2025-01-02

- Fix Psychosurgery app complexity (minor -> moderate)

## [1.2.14] - 2024-11-20

- Allow using shift to step number fields by 10

## [1.2.13] - 2024-11-01

- Add user setting to force all EP windows to be resizable in both directions.
- Fix Dice So Nice! module interaction so users doing a blind success test won't see the dice being rolled.

## [1.2.12] - 2024-10-12

- Apply aggressive penalty when using aggressive melee attack
- Add Full Defense select to character combat tab

## [1.2.11] - 2024-08-25

- Fix Software Skill success test not rolling

## [1.2.10] - 2024-08-24

- Add Ooze movement type
- Set Pilot: Space movement skill for Plasma Sail and Magnetic Generator

## [1.2.9] - 2024-08-24

- Add Brachiate, Glider, Plasma Sail, and Magnetic Generator movement types from Character Options

## [1.2.8] - 2024-08-23

- Fix layering interactions between ep windows and foundry ones
- Add folder select to gm-panel
- Add aptitude checks to gm-panel

## [1.2.7] - 2024-08-22

- Add a barebones GM panel that lets you see base test targets of PC's skills
- Fix some foundry labels having poor contrast
- Don't overwrite styles for user-config sheet

## [1.2.6] - 2024-07-27

- Fix add modifier popover being clipped

## [1.2.5] - 2024-07-22

- Fix section headers disappearing during drag on opaque windows

## [1.2.4] - 2024-07-11

- Fix some foundry icons not rendering correctly

## [1.2.3] - 2024-06-22

- Only armor that provides energy/kinetic is considered for layering/concealable

## [1.2.2] - 2024-06-02

- Fix explosives not rolling their damage
- Fix not being able to edit own chat messages if GM is not connected

## [1.2.1] - 2024-06-01

- Add ability to drag and drop a morph onto the character creation sheet

## [1.2.0] - 2024-06-01

- Add support for Foundry v12

## [1.1.7] - 2024-04-14

- Only attempt to delete embedded items that exist - fixes error when attempting to remove exoskeleton after deleting one of its items

## [1.1.6] - 2024-04-04

- Fix styling for content links and inline rolls

## [1.1.5] - 2024-03-07

- Fix token sheets occasionally opening when prototype token settings are changed

## [1.1.4] - 2023-12-28

- Expand macro api to allow modifiers, and returning the created message id

## [1.1.3] - 2023-09-22

- Fix placement of chat jump to bottom button

## [1.1.2] - 2023-07-21

- Allow sleight use without sub-strain
- Fix text clipping on firefox select

## [1.1.1] - 2023-07-20

- Fix clipped chat popover
- Fix scenes list context menu hover

## [1.1.0] - 2023-07-16

- Make compatible with foundry v11

## [1.0.7] - 2023-04-23

- Add armor used option to Melee Weapons
- Add Exotic Skill option to Spray Weapons

## [1.0.6] - 2023-01-12

- "Fix" style of inputs after datalist selection
- Restore functionality of middle click scene controls menu

## [1.0.5] - 2023-01-02

- Fix styling of armor input fields on shell frames

## [1.0.4] - 2022-12-28

- Correct system manifest

## [1.0.3] - 2022-12-09

- Change chat styling to avoid conflicts with modules
- Resolve conflict with foundry tooltip

## [1.0.2] - 2022-12-03

- Fix style conflict with foundry Configure Game Settings app
- Apply consistent styling on inputs

## [1.0.1] - 2022-09-15

- Fix broken drag and drop

## [1.0.0] - 2022-09-13

- Update for Foundry v10 compatibility

## [0.910] - 2022-06-09

- Keep sidebar actor/item info synced
- Minor style fixes

## [0.909] - 2022-06-08

- Fix typo in Exoskeleton/Hardsuit compendium (Batttlesuit -> Battlesuit)
- Fix typo in Resources description (Minorcomplexity -> Minor complexity)

## [0.908] - 2022-06-06

- Fix compendium browser not loading entries

## [0.907] - 2022-06-04

- Apply custom styling solution for Monk's Enhanced Journal module

## [0.906] - 2022-06-02

- Update some dependencies

## [0.905] - 2022-06-02

- Only apply overburdened if character has multiple armor layers

## [0.904] - 2022-01-31

- Brighten health bar damage taken

## [0.903] - 2022-01-31

- Fix various bugs related to token updates and referencing base actor instead of token.
- Add primary sleeve health bar to combat tracker for GMs and observer+ permissions.

## [0.902] - 2021-12-27

- Fix extra outlines sometimes showing up on inputs
- Fix dice formulas not being visually cleaned up (e.g. 1d6 + + 1d10)
- Fix -1d10 DV from beyond range being applied to firearms with steady ammo

## [0.901] - 2021-12-13

- Update for compatability with Foundry v9, will not work on prior versions

## [0.837] - 2021-11-15

- Fix Fault Tolerance compendium entry counting as armor layer
- Add Actor/Item sheet compatibility for Taskbar module

## [0.836] - 2021-10-11

- Add year start setting input when clicking on game date as GM
- Fix being able to rewind before 0

## [0.835] - 2021-09-18

- Fix Body Dysmorphia typo
- Clicking on the character sheet icon with the Tokenizer module active will open it
- Clearer level select button on trait sheet

## [0.834] - 2021-09-3

- Fix Striking Looks in trait compendium (and premade Chi) incorrectly providing a +20 instead of +10 bonus at level 2

## [0.833] - 2021-09-2

- Fix blind roll on success test showing message to player

## [0.832] - 2021-08-26

- Respect message visibility settings for infection tests
- Whisper sustained sleight end message to GMs and owners of affected characters

## [0.831] - 2021-08-20

- Fix effects targeting specific ego rep tests not applying

## [0.83] - 2021-08-19

- Module Compatability - Override some styles of [Combat Focus](https://foundryvtt.com/packages/foundry-combat-focus)

## [0.829] - 2021-08-19

- Add quick success test button
- Account for size when computing distance between tokens and add a tooltip explaining how target distance is computed

## [0.828] - 2021-08-17

- Support foundry 0.8.9 - specifically fixing style issue with canvas controls
- Default all skills tests, except for Perceive and Fray, to complex actions

## [0.827] - 2021-08-06

- Allow dragging aptitudes/skills onto the hotbar. This creates a macro with a command which will attempt to start the test on the selected character's primary ego.

## [0.826] - 2021-07-30

- Fix armor-piercing not being applied to melee attacks

## [0.825] - 2021-07-17

- Add client side system setting to remove transparency from character sheets

## [0.824] - 2021-07-10

- Fix health recoveries not storing data permanently in some situations
- Fix rep refreshes not setting correct start time when setting favor

## [0.823] - 2021-07-03

- Fix meshware version of Endocrine controls providing +2 insight instead of +2 moxie

## [0.822] - 2021-07-03

- Add button to activate armor with active state

## [0.821] - 2021-07-02

- Allow setting any armor used to sleight attack

## [0.82] - 2021-07-02

- Allow full control over skill effects
- Allow editing fake id reps after creation
- Remove [Fake ID] from name of active rep source
- Add health type option to Health Recovery effects, allowing for mental health heals from items
- Allow setting custom exotic skill to sleights

## [0.819] - 2021-06-28

- Make sure icons for owned combat participants are clickable to focus token if available
- Don't show menu button on hover for non-owned combat participants
- Show button to open threat source sheet for unlinked tokens using threat
- Add a custom option to pools
- Add a Trivial/0 GP option to complexity

## [0.818] - 2021-06-20

- Only group App as Ware or Meshware instead of all Software with sleeves

## [0.817] - 2021-06-20

- Update compatible core version to avoid warning message

## [0.816] - 2021-06-20

- Improve compendium search
- Move sleeve ware out of equipped and into own section
- Show GP of sleeve ware separately from equipped gear

## [0.815] - 2021-06-17

- Add pools to Remade biomorph compendium entry
- Add option to roll incomplete health recovery without resetting timer
- Allow health recoveries to accumlate multiple instances
- Properly lower healing time on leftover partial health recovery instances

## [0.814] - 2021-06-16

- Fix middle mouse click on canvas not opening canvas menu
- Update dependencies

## [0.813] -- 2021-06-03

- Update styling of chat inside of popped out chatlog
- Add Cyberware variants for Access Jacks, Cortical Stack and Cyberbrain to Standard Augmentations compendium
- Add Meshware variant for Mnemonics to Standard Augmentations compendium
- Add compendium title to compendium search entries
- Drop custom compendium list in favor of default to reduce conflicts with modules

## [0.812] -- 2021-06-02

- Fix styling conflicts with Compendium Folders module

## [0.811] -- 2021-06-02

- Fix initiative rolls not showing proper chat message
- Add min width so combat tracker window doesn't change size when combat start
- Remove extra puppet sock from Arachnoid compendium entry

## [0.81] -- 2021-06-01

- Update to provide compatibility with Foundry 0.8. **This release, and all future releases will be incompatible with Foundry versions lower than 0.8.6.**
- Fix errors in default created muse. Perceive from 40 -> 30 and added Medicine: Psychosurgery at 30
- Update Toughness/Frailty Traits to also apply to derived stats
- Add GP totals to character details

## [0.731] - 2021-05-20

- Fix opening combat tracker popout with right click opening browser context menu

## [0.73] - 2021-05-19

- Update dependencies
- Update readme
- Allow dropping a character onto physical tech onboard ali section to autofill its data
- Allow sleeve on character sheet to be draggable
- Allow ego on character sheet to be draggable
- Use custom window for combat tracker popout
- Hybernoid -> Hibernoid in Biomorph compendium
- Right click on Aptitude/Skill/Software Skill tests to skip the sheet and roll instantly using default target number

## [0.722] - 2021-05-07

- Fix custom attack button not rendering

## [0.721] - 2021-05-07

- Make sure chat footer is at bottom
- Improve logic for initial render of chat messages

## [0.72] - 2021-05-07

- Fix permission and filepicker not being styled
- Add limited view for characters

## [0.715] - 2021-05-07

- Specifically target foundry apps for styling, leaving modules alone

## [0.71] - 2021-05-07

- Show motivation goals on click

## [0.7] - 2021-05-07

- Add ability to equip an exoskeleton in addition to a morph
- Add Exoskeletons/Hardsuits compendium pack
- Make the character header a dropzone for sleeves/exoskeletons
- Add option to fast forward through shape changing weapon transformation
