import { overlay } from '@src/init';
import { throttleFn } from '@src/utility/decorators';
import { notEmpty } from '@src/utility/helpers';
import { compact, pick } from 'remeda';
import type { SetOptional } from 'type-fest';
import type { ValuesType } from 'utility-types';
import type { SceneEP } from '../entities/scene';
import type { CanvasLayers } from './foundry-cont';

export type MeasuredTemplateData = {
  t: keyof typeof CONFIG['MeasuredTemplate']['types'];
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

export const createMeasuredTemplate = ({
  user = game.user.id,
  fillColor = game.user.color,
  direction = 0,
  ...data
}: SetOptional<
  Omit<MeasuredTemplateData, '_id'>,
  'user' | 'fillColor' | 'direction'
>) => new MeasuredTemplate({ ...data, user, fillColor, direction });

export const placeMeasuredTemplate = (
  template: MeasuredTemplate,
  pan = true,
) => {
  const canvas = readyCanvas();
  if (!canvas) return null;

  return new Promise<{ templateId: string; sceneId: string } | null>(
    async (resolve) => {
      const { activeLayer: originalLayer, stage, grid, scene } = canvas;
      const { view } = canvas.app;

      (await template.draw()).layer.activate().preview?.addChild(template);
      overlay.faded = true;

      const cleanup = (ev?: Event) => {
        template.layer.preview?.removeChildren();
        stage.off('mousemove', moveTemplate).off('mousedown', createTemplate);
        view.removeEventListener('context', cleanup);
        view.removeEventListener('wheel', rotateTemplate);
        window.removeEventListener("keydown", closeOnEscape, { capture: true})
        originalLayer.activate();
        overlay.faded = false;
        if (ev) resolve(null);
      };

      const closeOnEscape = (ev: KeyboardEvent) => ev.key === "Escape" && cleanup(ev)

      const createTemplate = async () => {
        cleanup();
        const savedTemplateData: MeasuredTemplateData | null = await scene.createEmbeddedEntity(
          'MeasuredTemplate',
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
      };

      const moveTemplate = throttleFn(
        (ev: PIXI.InteractionEvent) => {
          ev.stopPropagation();
          const center = ev.data.getLocalPosition(template.layer);
          const { x, y } = grid.getSnappedPosition(center.x, center.y, 2);
          template.data.x = x;
          template.data.y = y;
          template.refresh();
        },
        20,
        true,
      );

      const rotateTemplate = (ev: WheelEvent) => {
        if (ev.ctrlKey) return;
        ev.stopPropagation();
        const delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
        const snap = ev.shiftKey ? delta : 5;
        template.data.direction += snap * Math.sign(ev.deltaY);
        template.refresh();
      };

      stage.on('mousemove', moveTemplate).on('mousedown', createTemplate);
      view.addEventListener('contextmenu', cleanup);
      view.addEventListener('wheel', rotateTemplate);
      window.addEventListener("keydown", closeOnEscape, { capture: true} )
      pan && canvas.pan(template.center);
    },
  );
};

export const getTemplateGridHighlight = (templateId: string) => {
  return readyCanvas()?.grid.getHighlightLayer(`Template.${templateId}`);
};

export const getTokensWithinHighligtedTemplate = (templateId: string) => {
  const highlighted = getTemplateGridHighlight(templateId);
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
      if (within) contained.add(token);
    }
  }

  return contained;
};

export const getNormalizedTokenSize = ({ data }: Token) =>
  Math.min(data.height, data.width) * data.scale;

type CanvasProps = {
  scene: SceneEP;
  stage: PIXI.Application['stage'];
  dimensions: ReturnType<typeof Canvas['getDimensions']>;
  hud: HeadsUpDisplay;
  activeLayer: ValuesType<CanvasLayers>;
  app: PIXI.Application;
  pan: (location: Partial<Record<'x' | 'y' | 'scale', number>>) => void;
};

export const readyCanvas = () =>
  canvas instanceof Canvas && canvas.ready
    ? (canvas as Omit<Canvas, keyof CanvasProps> & CanvasLayers & CanvasProps)
    : null;
