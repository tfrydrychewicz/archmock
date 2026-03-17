"use client";

import {
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  type TLResizeInfo,
} from "tldraw";
import type { SDLoadBalancerShape } from "../shape-types";

export class SDLoadBalancerShapeUtil extends ShapeUtil<SDLoadBalancerShape> {
  static override type = "sd-load-balancer" as const;

  override getDefaultProps(): SDLoadBalancerShape["props"] {
    return { w: 140, h: 80, label: "Load Balancer", subLabel: "", techChoice: "" };
  }

  getGeometry(shape: SDLoadBalancerShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  component(shape: SDLoadBalancerShape) {
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
          className="flex flex-col items-center justify-center h-full bg-cyan-500/20 border-2 border-cyan-500 p-2"
          style={{
            clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
          }}
        >
          <span className="text-lg">⚖️</span>
          <span className="font-semibold text-xs truncate w-full text-center">
            {shape.props.label || "LB"}
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

  indicator(shape: SDLoadBalancerShape) {
    return (
      <polygon
        points={`${shape.props.w / 2},0 ${shape.props.w},${shape.props.h / 2} ${shape.props.w / 2},${shape.props.h} 0,${shape.props.h / 2}`}
        fill="none"
        stroke="var(--color-selected)"
        strokeWidth={2}
      />
    );
  }

  override onResize(shape: SDLoadBalancerShape, info: TLResizeInfo<SDLoadBalancerShape>) {
    const resized = resizeBox(shape, info);
    return {
      ...shape,
      x: resized.x,
      y: resized.y,
      props: {
        ...shape.props,
        w: Math.max(80, resized.props.w),
        h: Math.max(60, resized.props.h),
      },
    };
  }
}
