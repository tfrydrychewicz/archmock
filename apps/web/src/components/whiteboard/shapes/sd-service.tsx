"use client";

import {
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  type TLResizeInfo,
} from "tldraw";
import type { SDServiceShape } from "../shape-types";

export class SDServiceShapeUtil extends ShapeUtil<SDServiceShape> {
  static override type = "sd-service" as const;

  override getDefaultProps(): SDServiceShape["props"] {
    return { w: 200, h: 80, label: "Service", subLabel: "", techChoice: "" };
  }

  getGeometry(shape: SDServiceShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  component(shape: SDServiceShape) {
    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
          pointerEvents: "all",
        }}
      >
        <div className="flex flex-col items-center justify-center h-full rounded-lg bg-blue-500/20 border-2 border-blue-500 p-2">
          <span className="text-lg">⚙️</span>
          <span className="font-semibold text-sm truncate w-full text-center">
            {shape.props.label || "Service"}
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

  indicator(shape: SDServiceShape) {
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

  override onResize(shape: SDServiceShape, info: TLResizeInfo<SDServiceShape>) {
    const resized = resizeBox(shape, info);
    return {
      ...shape,
      x: resized.x,
      y: resized.y,
      props: {
        ...shape.props,
        w: Math.max(120, resized.props.w),
        h: Math.max(60, resized.props.h),
      },
    };
  }
}
