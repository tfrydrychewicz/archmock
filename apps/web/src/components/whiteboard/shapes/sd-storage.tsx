"use client";

import {
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  type TLResizeInfo,
} from "tldraw";
import type { SDStorageShape } from "../shape-types";

export class SDStorageShapeUtil extends ShapeUtil<SDStorageShape> {
  static override type = "sd-storage" as const;

  override getDefaultProps(): SDStorageShape["props"] {
    return { w: 180, h: 70, label: "Storage", subLabel: "", techChoice: "" };
  }

  getGeometry(shape: SDStorageShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  component(shape: SDStorageShape) {
    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
          pointerEvents: "all",
        }}
      >
        <div
          className="flex flex-col items-center justify-center h-full bg-orange-500/20 border-2 border-orange-500 p-2"
          style={{
            transform: "skewX(-10deg)",
          }}
        >
          <span className="text-lg">📦</span>
          <span className="font-semibold text-sm truncate w-full text-center">
            {shape.props.label || "Storage"}
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

  indicator(shape: SDStorageShape) {
    return (
      <rect
        width={shape.props.w}
        height={shape.props.h}
        fill="none"
        stroke="var(--color-selected)"
        strokeWidth={2}
      />
    );
  }

  override onResize(shape: SDStorageShape, info: TLResizeInfo<SDStorageShape>) {
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
