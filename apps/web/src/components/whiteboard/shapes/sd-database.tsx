"use client";

import {
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  type TLResizeInfo,
} from "tldraw";
import type { SDDatabaseShape } from "../shape-types";

export class SDDatabaseShapeUtil extends ShapeUtil<SDDatabaseShape> {
  static override type = "sd-database" as const;

  override getDefaultProps(): SDDatabaseShape["props"] {
    return { w: 180, h: 90, label: "Database", subLabel: "", techChoice: "" };
  }

  getGeometry(shape: SDDatabaseShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  component(shape: SDDatabaseShape) {
    return (
      <HTMLContainer
        id={shape.id}
        style={{
          width: shape.props.w,
          height: shape.props.h,
          pointerEvents: "all",
        }}
      >
        <div className="flex flex-col items-center justify-center h-full rounded-t-lg rounded-b-[40%] bg-amber-600/30 border-2 border-amber-600 p-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-4 bg-amber-600/40 rounded-t-lg" />
          <span className="text-lg mt-2">🗄️</span>
          <span className="font-semibold text-sm truncate w-full text-center">
            {shape.props.label || "Database"}
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

  indicator(shape: SDDatabaseShape) {
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

  override onResize(shape: SDDatabaseShape, info: TLResizeInfo<SDDatabaseShape>) {
    const resized = resizeBox(shape, info);
    return {
      ...shape,
      x: resized.x,
      y: resized.y,
      props: {
        ...shape.props,
        w: Math.max(100, resized.props.w),
        h: Math.max(70, resized.props.h),
      },
    };
  }
}
