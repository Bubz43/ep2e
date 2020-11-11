// Side Effects
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
// import '@tinymce/tinymce-webcomponent'; // TODO Test this out further
import { Datepicker } from 'app-datepicker/dist/datepicker';
import 'web-animations-js';
// Misc
import 'web-dialog';
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
import { EgoForm } from './entities/actor/components/ego-form/ego-form';
import { EgoFormFieldSkill } from './entities/actor/components/ego-form/skills/ego-form-field-skill';
import { EgoFormFieldSkillCreator } from './entities/actor/components/ego-form/skills/ego-form-field-skill-creator';
import { EgoFormSkill } from './entities/actor/components/ego-form/skills/ego-form-skill';
import { EgoFormSkills } from './entities/actor/components/ego-form/skills/ego-form-skills';
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
import './foundry/prototype-overrides';
import { HealthItem } from './health/components/health-item/health-item';
import { HealthLog } from './health/components/health-log/health-log';
import { HealthRegenSettingsForm } from './health/components/health-regen-settings-form/health-regen-settings-form';
import { HealthStateForm } from './health/components/health-state-form/health-state-form';
import './init';
import { EgoFormThreatStress } from './entities/actor/components/ego-form/ego-form-threat-stress';
import { EgoFormRep } from './entities/actor/components/ego-form/ego-form-rep';

customElements.define('app-datepicker', Datepicker);

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
ItemTrash;
EgoForm;
EgoFormSkills;
EgoFormSkill;
EgoFormFieldSkill;
EgoFormFieldSkillCreator;
EgoFormThreatStress;
EgoFormRep;

//Feature Editors
EffectCreator;
EffectEditor;
TagEditor;
FormMotivationItem;

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
PhysicalTechForm;
ItemFormEffectsList;

// Health Components
HealthItem;
HealthLog;
HealthRegenSettingsForm;
HealthStateForm;
