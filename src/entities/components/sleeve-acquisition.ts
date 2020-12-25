import { MorphCost } from '@src/data-enums';
import { formatComplexity } from '@src/features/complexity';
import { localize } from '@src/foundry/localization';
import type { AcquisitionData } from '@src/foundry/template-schema';
import { html } from 'lit-html';
import { createPipe, map } from 'remeda';

export const morphAcquisitionDetails = ({
  resource,
  cost,
  availability,
  ...gp
}: AcquisitionData) => {
  const details: { label: string; value: string | number }[] = [];

  if (resource === MorphCost.GearPoints) {
    details.push({
      label: `${localize('complexity')}/${localize('SHORT', 'gearPoints')}`,
      value: formatComplexity(gp),
    });
  } else if (resource === MorphCost.MorphPoints) {
    details.push(
      {
        label: localize('cost'),
        value: `${cost} ${localize('SHORT', 'morphPoints')}`,
      },
      {
        label: localize('availability'),
        value: availability,
      },
    );
  }
  return details;
};

export const renderMorphAcquisition = createPipe(
  morphAcquisitionDetails,
  map(({ label, value }) => html`<sl-group label=${label}>${value}</sl-group>`),
);
