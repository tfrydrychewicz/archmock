"use client";

import {
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  type TLResizeInfo,
  type TLShape,
  type TLDragShapesOutInfo,
} from "tldraw";
import type { SDZoneShape } from "../shape-types";

export class SDZoneShapeUtil extends ShapeUtil<SDZoneShape> {
  static override type = "sd-zone" as const;

  override getDefaultProps(): SDZoneShape["props"] {
    return { w: 400, h: 300, label: "Zone" };
  }

  getGeometry(shape: SDZoneShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  component(shape: SDZoneShape) {
    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
          pointerEvents: "all",
        }}
      >
        <div className="flex flex-col h-full rounded-lg bg-slate-500/10 border-2 border-dashed border-slate-400 p-3">
          <span className="font-semibold text-sm text-slate-400 mb-2">
            {shape.props.label || "Zone"}
          </span>
          <div className="flex-1 min-h-0" />
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: SDZoneShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx={8}
        fill="none"
        stroke="var(--color-selected)"
        strokeWidth={2}
        strokeDasharray="8 4"
      />
    );
  }

  override onResize(shape: SDZoneShape, info: TLResizeInfo<SDZoneShape>) {
    const resized = resizeBox(shape, info);
    const newW = Math.max(200, resized.props.w);
    const newH = Math.max(150, resized.props.h);
    const oldW = info.initialShape.props.w;
    const oldH = info.initialShape.props.h;
    const scaleX = newW / oldW;
    const scaleY = newH / oldH;

    if (scaleX !== 1 || scaleY !== 1) {
      const childIds = this.editor.getSortedChildIdsForParent(shape.id);
      const updates = [];
      for (const id of childIds) {
        const child = this.editor.getShape(id);
        if (!child) continue;
        const props = child.props as Record<string, unknown>;
        const next: { id: typeof id; type: string; x: number; y: number; props?: Record<string, unknown> } = {
          id,
          type: child.type,
          x: child.x / scaleX,
          y: child.y / scaleY,
        };
        if (typeof props?.w === "number" && typeof props?.h === "number") {
          next.props = { ...props, w: props.w / scaleX, h: props.h / scaleY };
        }
        updates.push(next);
      }
      if (updates.length > 0) {
        this.editor.updateShapes(updates);
      }
    }

    return {
      ...shape,
      x: resized.x,
      y: resized.y,
      props: {
        ...shape.props,
        w: newW,
        h: newH,
      },
    };
  }

  override canReceiveNewChildrenOfType(_shape: SDZoneShape, type: string) {
    return type.startsWith("sd-") || type === "arrow" || type === "geo" || type === "text" || type === "note";
  }

  override onDragShapesIn(shape: SDZoneShape, draggingShapes: TLShape[]) {
    const toReparent = draggingShapes.filter((s) => {
      if (s.parentId === shape.id) return false;
      if (s.id === shape.id) return false;
      if (this.editor.hasAncestor(shape, s.id)) return false;
      return true;
    });
    if (toReparent.length > 0) {
      this.editor.reparentShapes(toReparent, shape.id);
    }
  }

  override onDragShapesOut(
    shape: SDZoneShape,
    draggingShapes: TLShape[],
    info: TLDragShapesOutInfo
  ) {
    if (info.nextDraggingOverShapeId) return;
    const children = draggingShapes.filter((s) => s.parentId === shape.id);
    if (children.length > 0) {
      this.editor.reparentShapes(children, this.editor.getCurrentPageId());
    }
  }
}
