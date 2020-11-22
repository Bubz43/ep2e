// Side Effects
import './foundry/prototype-overrides';
import './init';
import 'web-animations-js';

// Material Components
import '@material/mwc-button';
import '@material/mwc-checkbox';
import '@material/mwc-circular-progress';
import '@material/mwc-formfield';
import '@material/mwc-icon';
import '@material/mwc-icon-button';
import '@material/mwc-icon-button-toggle';
import '@material/mwc-linear-progress';
import '@material/mwc-list';
import '@material/mwc-list/mwc-check-list-item';
import '@material/mwc-list/mwc-list-item';
import '@material/mwc-list/mwc-radio-list-item';
import '@material/mwc-menu';
import '@material/mwc-radio';
import '@material/mwc-slider';
import '@material/mwc-snackbar';
import '@material/mwc-switch';
import '@material/mwc-tab-bar';
import '@material/mwc-dialog';

// import '@tinymce/tinymce-webcomponent'; // TODO Test this out further
import { Datepicker } from 'app-datepicker/dist/datepicker';
customElements.define('app-datepicker', Datepicker);

// Weightless Components
import 'weightless/label';
import 'weightless/list-item';

import { AnimatedList } from './components/animated-list/animated-list';
import { DateField } from './components/date-field/date-field';
import { DeleteButton } from './components/delete-button/delete-button';
import { Details } from './components/details/details';
import { DropZone } from './components/dropzone/dropzone';
import { EditorWrapper } from './components/editor-wrapper/editor-wrapper';
import { EnrichedHTML } from './components/enriched-html/enriched-html';
import { EventList } from './components/event-list/event-list';
import { Field } from './components/field/field';
import { Form } from './components/form/form';
import { Group } from './components/group/group';
import { Header } from './components/header/header';
import { NotificationCoin } from './components/notification-coin/notification-coin';
import { Popover } from './components/popover/popover';
import { PopoverSection } from './components/popover/popover-section';
import { Section } from './components/section/section';
import { SubmitButton } from './components/submit-button/submit-button';
import { TimeField } from './components/time-field/time-field';
import { ToolTip } from './components/tooltip/tooltip';
import { ValueStatus } from './components/value-status/value-status';
import { SlWindow } from './components/window/window';
import { EgoForm } from './entities/components/ego-form/ego-form';
import { EgoFormFieldSkill } from './entities/components/ego-form/skills/ego-form-field-skill';
import { EgoFormFieldSkillCreator } from './entities/components/ego-form/skills/ego-form-field-skill-creator';
import { EgoFormSkill } from './entities/components/ego-form/skills/ego-form-skill';
import { EgoFormSkills } from './entities/components/ego-form/skills/ego-form-skills';
import { ItemTrash } from './entities/actor/components/item-trash/item-trash';
import { SleeveFormAquisition } from './entities/actor/components/sleeve-forms/acquisition/sleeve-form-acquisition';
import { BiologicalForm } from './entities/actor/components/sleeve-forms/biological/biological-form';
import { InfomorphForm } from './entities/actor/components/sleeve-forms/infomorph/infomorph-form';
import { FormItemsList } from './entities/actor/components/items-list/form-items-list';
import { SleeveFormMovementList } from './entities/actor/components/sleeve-forms/movement/sleeve-form-movement-list';
import { SleeveFormPools } from './entities/actor/components/sleeve-forms/pools/sleeve-form-pools';
import { SyntheticForm } from './entities/actor/components/sleeve-forms/synthetic/synthetic-form';
import { CompendiumList } from './entities/components/compendium-list/compendium-list';
import { EntityFormFooter } from './entities/components/form-layout/entity-form-footer';
import { EntityFormHeader } from './entities/components/form-layout/entity-form-header';
import { EntityFormLayout } from './entities/components/form-layout/entity-form-layout';
import { EntityFormSidebarDivider } from './entities/components/form-layout/entity-form-sidebar-divider';
import { ItemFormEffectsList } from './entities/item/components/forms/item-form-effects-list/item-form-effects-list';
import { PhysicalTechForm } from './entities/item/components/forms/physical-tech/physical-tech-form';
import { EffectCreator } from './features/components/effect-creator/effect-creator';
import { EffectEditor } from './features/components/effect-editor/effect-editor';
import { FormMotivationItem } from './features/components/form-motivation-item/form-motivation-item';
import { TagEditor } from './features/components/tag-editor/tag-editor';
import { HealthItem } from './health/components/health-item/health-item';
import { HealthLog } from './health/components/health-log/health-log';
import { HealthRegenSettingsForm } from './health/components/health-regen-settings-form/health-regen-settings-form';
import { HealthStateForm } from './health/components/health-state-form/health-state-form';
import { EgoFormThreatStress } from './entities/components/ego-form/ego-form-threat-stress';
import { EgoFormRep } from './entities/components/ego-form/ego-form-rep';
import { PhysicalServiceForm } from './entities/item/components/forms/physical-service/physical-service-form';
import { TraitForm } from './entities/item/components/forms/trait/trait-form';
import { SleightForm } from './entities/item/components/forms/sleight/sleight-form';
import { PsiForm } from './entities/item/components/forms/psi/psi-form';
import { TraitFormLevel } from './entities/item/components/forms/trait/trait-form-level';
import { EPOverlay } from './components/ep-overlay/ep-overlay';
import { SceneView } from './components/ep-overlay/components/scene-view/scene-view';
import { EnvironmentForms } from './components/ep-overlay/components/environment-forms/environment-forms';
import { MeleeWeaponForm } from './entities/item/components/forms/melee-weapon/melee-weapon-form';
import { SubstanceForm } from './entities/item/components/forms/substance/substance-form';
import { ExplosiveForm } from './entities/item/components/forms/explosive/explosive-form';
import { ThrownWeaponForm } from './entities/item/components/forms/thrown-weapon/thrown-weapon-form';
import { FirearmAmmoForm } from './entities/item/components/forms/firearm-ammo/firearm-ammo-form';
import { RailgunForm } from './entities/item/components/forms/railgun/railgun-form';
import { FirearmForm } from './entities/item/components/forms/firearm/firearm-form';
import { SeekerWeaponForm } from './entities/item/components/forms/seeker-weapon/seeker-weapon-form';
import { SprayWeaponForm } from './entities/item/components/forms/spray-weapon/spray-weapon-form';
import { BeamWeaponForm } from './entities/item/components/forms/beam-weapon/beam-weapon-form';
import { FirearmAmmoTransformer } from './entities/components/firearm-ammo-transformer/firearm-ammo-transformer';
import { ArmorForm } from './entities/item/components/forms/armor/armor-form';
import { SoftwareForm } from './entities/item/components/forms/software/software-form';
import { ItemCreator } from './entities/item/components/item-creator/item-creator';
import { AptitudeCheckInfoEditor } from './features/components/aptitude-check-info-editor/aptitude-check-info-editor';
import { ActorCreator } from './entities/actor/components/actor-creator/actor-creator';
import { CharacterView } from './entities/actor/components/character-views/character-view';
import { CharacterViewEgo } from './entities/actor/components/character-views/components/character-view-ego/character-view-ego';
import { CharacterViewSleeve } from './entities/actor/components/character-views/components/character-view-sleeve/character-view-sleeve';
import { CharacterViewHeader } from './entities/actor/components/character-views/components/character-view-header/character-view-header';
import { EffectsViewer } from './features/components/effects-viewer/effects-viewer';
import { CharacterViewResleeve } from './entities/actor/components/character-views/components/character-view-resleeve/character-view-resleeve';

// Generic Components
Field;
Form;
AnimatedList;
DateField;
DeleteButton;
Details;
DropZone;
EditorWrapper;
EnrichedHTML;
Group;
EventList;
NotificationCoin;
Popover;
Header;
PopoverSection;
Section;
SubmitButton;
TimeField;
ToolTip;
ValueStatus;
SlWindow;

// Entity
CompendiumList;

// Actor
ActorCreator;
ItemTrash;

// Character
CharacterView;
CharacterViewHeader;
CharacterViewEgo;
CharacterViewSleeve;
CharacterViewResleeve;

// Ego
EgoForm;
EgoFormSkills;
EgoFormSkill;
EgoFormFieldSkill;
EgoFormFieldSkillCreator;
EgoFormThreatStress;
EgoFormRep;

// Feature Views
EffectsViewer;

// Feature Editors
EffectCreator;
EffectEditor;
TagEditor;
FormMotivationItem;
AptitudeCheckInfoEditor;

// Entity Form Layout Components
EntityFormHeader;
EntityFormLayout;
EntityFormFooter;
EntityFormSidebarDivider;

// Sleeve Forms
InfomorphForm;
BiologicalForm;
SyntheticForm;
SleeveFormPools;
SleeveFormAquisition;
FormItemsList;
SleeveFormMovementList;

// Item Forms
ItemCreator;
TraitForm;
TraitFormLevel;
SleightForm;
PsiForm;
PhysicalServiceForm;
PhysicalTechForm;
MeleeWeaponForm;
SubstanceForm;
ExplosiveForm;
ThrownWeaponForm;
FirearmAmmoForm;
RailgunForm;
FirearmForm;
SprayWeaponForm;
SeekerWeaponForm;
ArmorForm;
SoftwareForm;
BeamWeaponForm;
ItemFormEffectsList;
FirearmAmmoTransformer;

// Health Components
HealthItem;
HealthLog;
HealthRegenSettingsForm;
HealthStateForm;

// Overlay
EPOverlay;
SceneView;
EnvironmentForms;
