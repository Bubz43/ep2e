# Changelog

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
