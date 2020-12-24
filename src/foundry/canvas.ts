import { overlay } from '@src/init';
import { throttleFn } from '@src/utility/decorators';
import { pick } from 'remeda';
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

export const previewMeasuredTemplate = async (template: MeasuredTemplate) => {
  const canvas = readyCanvas();
  if (!canvas) return;

  const { activeLayer: originalLayer } = canvas;

  const cleanup = () => {
    template.layer.preview?.removeChildren();
    canvas.stage
      .off('mousemove', moveTemplate)
      .off('mousedown', createTemplate);
    canvas.app.view.oncontextmenu = null;
    canvas.app.view.onwheel = null;
    originalLayer.activate();
    overlay.faded = false;
  };

  const createTemplate = () => {
    cleanup();
    canvas.scene.createEmbeddedEntity('MeasuredTemplate', {
      ...template.data,
      ...pick(canvas.grid.getSnappedPosition(template.x, template.y, 2), [
        'x',
        'y',
      ]),
    });
  };

  const moveTemplate = throttleFn(
    (ev: PIXI.InteractionEvent) => {
      ev.stopPropagation();
      const center = ev.data.getLocalPosition(template.layer);
      const { x, y } = canvas.grid.getSnappedPosition(center.x, center.y, 2);
      template.data.x = x;
      template.data.y = y;
      template.refresh();
    },
    20,
    true,
  );

  (await template.draw()).layer.activate().preview?.addChild(template);
  overlay.faded = true;

  

  canvas.stage.on('mousemove', moveTemplate).on('mousedown', createTemplate);
  canvas.app.view.oncontextmenu = cleanup;
  canvas.app.view.onwheel = (ev) => {
    if (ev.ctrlKey) return;
    ev.stopPropagation();
    const delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
    const snap = ev.shiftKey ? delta : 5;
    template.data.direction += snap * Math.sign(ev.deltaY);
    template.refresh();
  };
};



type CanvasProps = {
  scene: SceneEP;
  stage: PIXI.Application['stage'];
  dimensions: ReturnType<typeof Canvas["getDimensions"]>
  hud: HeadsUpDisplay;
  activeLayer: ValuesType<CanvasLayers>
  app: PIXI.Application;
};

export const readyCanvas = () =>
  canvas instanceof Canvas && canvas.ready
    ? (canvas as Omit<Canvas, keyof CanvasProps> & CanvasLayers & CanvasProps)
    : null;
