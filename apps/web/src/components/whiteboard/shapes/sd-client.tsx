"use client";

import {
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  type TLResizeInfo,
} from "tldraw";
import type { SDClientShape } from "../shape-types";

export class SDClientShapeUtil extends ShapeUtil<SDClientShape> {
  static override type = "sd-client" as const;

  override getDefaultProps(): SDClientShape["props"] {
    return { w: 140, h: 60, label: "Client", subLabel: "", techChoice: "" };
  }

  getGeometry(shape: SDClientShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  component(shape: SDClientShape) {
    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
          pointerEvents: "all",
        }}
      >
        <div className="flex flex-col items-center justify-center h-full rounded-lg bg-green-500/20 border-2 border-green-500 p-2">
          <span className="text-lg">📱</span>
          <span className="font-semibold text-sm truncate w-full text-center">
            {shape.props.label || "Client"}
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

  indicator(shape: SDClientShape) {
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

  override onResize(shape: SDClientShape, info: TLResizeInfo<SDClientShape>) {
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
