"use client";

import {
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  type TLResizeInfo,
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
    return {
      ...shape,
      x: resized.x,
      y: resized.y,
      props: {
        ...shape.props,
        w: Math.max(200, resized.props.w),
        h: Math.max(150, resized.props.h),
      },
    };
  }
}
