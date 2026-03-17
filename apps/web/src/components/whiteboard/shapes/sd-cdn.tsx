"use client";

import {
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  type TLResizeInfo,
} from "tldraw";
import type { SDCdnShape } from "../shape-types";

export class SDCdnShapeUtil extends ShapeUtil<SDCdnShape> {
  static override type = "sd-cdn" as const;

  override getDefaultProps(): SDCdnShape["props"] {
    return { w: 140, h: 60, label: "CDN", subLabel: "", techChoice: "" };
  }

  getGeometry(shape: SDCdnShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  component(shape: SDCdnShape) {
    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
          pointerEvents: "all",
        }}
      >
        <div className="flex flex-col items-center justify-center h-full rounded-lg bg-sky-500/20 border-2 border-sky-500 p-2">
          <span className="text-lg">🌐</span>
          <span className="font-semibold text-sm truncate w-full text-center">
            {shape.props.label || "CDN"}
          </span>
          {shape.props.subLabel && (
            <span className="text-xs text-muted-foreground w-full text-center whitespace-pre-wrap break-words">
              {shape.props.subLabel}
            </span>
          )}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: SDCdnShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        rx={8}
        fill="none"
        stroke="var(--color-selected)"
        strokeWidth={2}
      />
    );
  }

  override onResize(shape: SDCdnShape, info: TLResizeInfo<SDCdnShape>) {
    const resized = resizeBox(shape, info);
    return {
      ...shape,
      x: resized.x,
      y: resized.y,
      props: {
        ...shape.props,
        w: Math.max(80, resized.props.w),
        h: Math.max(40, resized.props.h),
      },
    };
  }
}
