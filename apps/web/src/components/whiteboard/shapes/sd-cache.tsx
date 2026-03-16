"use client";

import {
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  type TLResizeInfo,
} from "tldraw";
import type { SDCacheShape } from "../shape-types";

export class SDCacheShapeUtil extends ShapeUtil<SDCacheShape> {
  static override type = "sd-cache" as const;

  override getDefaultProps(): SDCacheShape["props"] {
    return { w: 180, h: 70, label: "Cache", subLabel: "", techChoice: "" };
  }

  getGeometry(shape: SDCacheShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  component(shape: SDCacheShape) {
    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
          pointerEvents: "all",
        }}
      >
        <div className="flex flex-col items-center justify-center h-full rounded-lg bg-yellow-500/20 border-2 border-dashed border-yellow-500 p-2">
          <span className="text-lg">⚡</span>
          <span className="font-semibold text-sm truncate w-full text-center">
            {shape.props.label || "Cache"}
          </span>
          {shape.props.subLabel && (
            <span className="text-xs text-muted-foreground truncate w-full text-center">
              {shape.props.subLabel}
            </span>
          )}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: SDCacheShape) {
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

  override onResize(shape: SDCacheShape, info: TLResizeInfo<SDCacheShape>) {
    const resized = resizeBox(shape, info);
    return {
      ...shape,
      x: resized.x,
      y: resized.y,
      props: {
        ...shape.props,
        w: Math.max(100, resized.props.w),
        h: Math.max(50, resized.props.h),
      },
    };
  }
}
