import { ActorType } from '@src/entities/entity-types';
import { overlay } from '@src/init';
import { throttleFn } from '@src/utility/decorators';
import { notEmpty } from '@src/utility/helpers';
import { compact, forEach, intersection, pick, pipe } from 'remeda';
import type { SetOptional } from 'type-fest';
import type { ValuesType } from 'utility-types';
import { stopEvent } from 'weightless';
import type { SceneEP } from '../entities/scene';
import type { CanvasLayers } from './foundry-cont';

export type MeasuredTemplateType = keyof typeof CONFIG['MeasuredTemplate']['types'];

export type MeasuredTemplateData = {
  t: MeasuredTemplateType;
  user: string;
  x: number;
  y: number;
  direction: number;
  angle?: number;
  distance: number;
  borderColor?: string;
  fillColor: string;
  texture?: string;
  _id?: string;
};

export type PlacedTemplateIDs = {
  templateId: string;
  sceneId: string;
};

export const createTemporaryMeasuredTemplate = ({
  user = game.user.id,
  fillColor = game.user.color,
  direction = 0,
  x = 0,
  y = 0,
  ...data
}: SetOptional<
  Omit<MeasuredTemplateData, '_id'>,
  'user' | 'fillColor' | 'direction' | "x" | "y"
>) => new MeasuredTemplate({ ...data, user, fillColor, direction, x, y });

export const placeMeasuredTemplate = (
  template: MeasuredTemplate,
  pan = true,
) => {
  const canvas = readyCanvas();
  if (!canvas) return null;

  return new Promise<PlacedTemplateIDs | null>(async (resolve) => {
    const { activeLayer: originalLayer, stage, grid, scene, tokens } = canvas;
    const { view } = canvas.app;
    const controlled =
      originalLayer === tokens ? originalLayer.controlled : null;

    (await template.draw()).layer.activate().preview?.addChild(template);
    overlay.faded = true;

    const moveTemplate = throttleFn(
      (ev: PIXI.InteractionEvent) => {
        const center = ev.data.getLocalPosition(template.layer);
        const { x, y } = grid.getSnappedPosition(center.x, center.y, 2);
        template.data.x = x;
        template.data.y = y;
        template.refresh();
      },
      20,
      true,
    );

    stage.on('mousemove', moveTemplate).on('mousedown', createTemplate);
    view.addEventListener('contextmenu', cleanup);
    view.addEventListener('wheel', rotateTemplate);
    window.addEventListener('keydown', cancelOrSave, { capture: true });
    pan && canvas.pan(template.center);

    function cleanup(ev?: Event) {
      stage.off('mousemove', moveTemplate).off('mousedown', createTemplate);
      view.removeEventListener('contextmenu', cleanup);
      view.removeEventListener('wheel', rotateTemplate);
      window.removeEventListener('keydown', cancelOrSave, { capture: true });
      template.layer.preview?.removeChildren();
      originalLayer.activate();
      overlay.faded = false;
      if (controlled && originalLayer === tokens) {
        pipe(
          controlled,
          intersection(originalLayer.placeables),
          forEach((token) => token.control({ releaseOthers: false })),
        );
      }
      if (ev) resolve(null);
    }

    function cancelOrSave(ev: KeyboardEvent) {
      if (['Escape', 'Enter'].includes(ev.key)) stopEvent(ev);
      ev.key === 'Escape'
        ? cleanup(ev)
        : ev.key === 'Enter' && createTemplate();
    }

    async function createTemplate(ev?: PIXI.InteractionEvent) {
      ev?.stopPropagation();
      cleanup();
      const savedTemplateData: MeasuredTemplateData | null = await scene.createEmbeddedEntity(
        MeasuredTemplate.embeddedName,
        {
          ...template.data,
          ...grid.getSnappedPosition(template.x, template.y, 2),
        },
      );
      resolve(
        savedTemplateData?._id
          ? {
              templateId: savedTemplateData._id,
              sceneId: scene.data._id,
            }
          : null,
      );
    }

    function rotateTemplate(ev: WheelEvent) {
      if (ev.ctrlKey) return;
      ev.stopPropagation();
      const delta = grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
      const snap = ev.shiftKey ? delta : 5;
      template.data.direction += snap * Math.sign(ev.deltaY);
      template.refresh();
    }
  });
};

export const deletePlacedTemplate = (ids: PlacedTemplateIDs | undefined | null) => {
  if (!ids) return;
  const { sceneId, templateId } = ids;
  return game.scenes
    .get(sceneId)
    ?.deleteEmbeddedEntity(MeasuredTemplate.embeddedName, templateId);
}

export const editPlacedTemplate = (ids: PlacedTemplateIDs | null | undefined) => {
  const { templateId, sceneId } = ids ?? {};
  const canvas = readyCanvas();
  if (templateId && canvas?.scene.id === sceneId) {
    canvas?.templates.get(templateId)?.sheet.render(true);
  }
}

export const updatePlacedTemplate = (
  ids: PlacedTemplateIDs,
  changed: Partial<MeasuredTemplateData>,
) => {
  return game.scenes
    .get(ids.sceneId)
    ?.updateEmbeddedEntity(MeasuredTemplate.embeddedName, {
      ...changed,
      _id: ids.templateId,
    });
};

export const getNormalizedTokenSize = ({ data }: Token) =>
  Math.min(data.height, data.width) * data.scale;

export const getTemplateGridHighlightLayer = (templateId: string) => {
  return readyCanvas()?.grid.getHighlightLayer(`Template.${templateId}`);
};

export const getVisibleTokensWithinHighlightedTemplate = (
  templateId: string,
) => {
  const highlighted = getTemplateGridHighlightLayer(templateId);
  const canvas = readyCanvas();
  const contained = new Set<Token>();

  if (
    highlighted &&
    canvas &&
    notEmpty(highlighted.positions) &&
    notEmpty(canvas.tokens.placeables)
  ) {
    const { grid, tokens, dimensions } = canvas;
    const { distance } = dimensions;

    const positions = [...highlighted.positions].map((pos) => {
      const [x = 0, y = 0] = compact(pos.split('.').map(Number));
      return { x, y };
    });

    for (const token of tokens.placeables) {
      const { center } = token;
      const hitSize = getNormalizedTokenSize(token) * 0.71 * distance;
      const within = positions.some(
        (pos) => grid.measureDistance(center, pos) <= hitSize,
      );
      if (within && token.isVisible) contained.add(token);
    }
  }

  return contained;
};

type CanvasProps = {
  scene: SceneEP;
  stage: PIXI.Application['stage'];
  dimensions: ReturnType<typeof Canvas['getDimensions']>;
  hud: HeadsUpDisplay;
  activeLayer: ValuesType<CanvasLayers>;
  app: PIXI.Application;
  pan: (location: Partial<Record<'x' | 'y' | 'scale', number>>) => void;
};

export const controlledToken = () => {
  const canvas = readyCanvas();
  if (!canvas) return null;
  const { controlled } = canvas.tokens;
  return (
    controlled.find((t) => t.actor?.type === ActorType.Character) ??
    controlled[0] ??
    game.user.character?.getActiveTokens(true)[0]
  );
};

export const readyCanvas = () =>
  canvas instanceof Canvas && canvas.ready
    ? (canvas as Omit<Canvas, keyof CanvasProps> & CanvasLayers & CanvasProps)
    : null;
