"use client";

import {
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  type TLResizeInfo,
} from "tldraw";
import type { SDQueueShape } from "../shape-types";

export class SDQueueShapeUtil extends ShapeUtil<SDQueueShape> {
  static override type = "sd-queue" as const;

  override getDefaultProps(): SDQueueShape["props"] {
    return { w: 180, h: 70, label: "Queue", subLabel: "", techChoice: "" };
  }

  getGeometry(shape: SDQueueShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  component(shape: SDQueueShape) {
    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
          pointerEvents: "all",
        }}
      >
        <div className="flex flex-col items-center justify-center h-full rounded-lg bg-purple-500/20 border-2 border-purple-500 p-2">
          <span className="text-lg">📨</span>
          <span className="font-semibold text-sm truncate w-full text-center">
            {shape.props.label || "Queue"}
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

  indicator(shape: SDQueueShape) {
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

  override onResize(shape: SDQueueShape, info: TLResizeInfo<SDQueueShape>) {
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
