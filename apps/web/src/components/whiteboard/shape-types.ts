import type { TLBaseShape } from "tldraw";

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    "sd-service": { w: number; h: number; label: string; subLabel: string; techChoice: string };
    "sd-database": { w: number; h: number; label: string; subLabel: string; techChoice: string };
    "sd-cache": { w: number; h: number; label: string; subLabel: string; techChoice: string };
    "sd-queue": { w: number; h: number; label: string; subLabel: string; techChoice: string };
    "sd-load-balancer": { w: number; h: number; label: string; subLabel: string; techChoice: string };
    "sd-cdn": { w: number; h: number; label: string; subLabel: string; techChoice: string };
    "sd-client": { w: number; h: number; label: string; subLabel: string; techChoice: string };
    "sd-storage": { w: number; h: number; label: string; subLabel: string; techChoice: string };
    "sd-zone": { w: number; h: number; label: string };
  }
}

type SDBoxProps = { w: number; h: number; label: string; subLabel: string; techChoice: string };
type SDZoneProps = { w: number; h: number; label: string };

export type SDServiceShape = TLBaseShape<"sd-service", SDBoxProps>;
export type SDDatabaseShape = TLBaseShape<"sd-database", SDBoxProps>;
export type SDCacheShape = TLBaseShape<"sd-cache", SDBoxProps>;
export type SDQueueShape = TLBaseShape<"sd-queue", SDBoxProps>;
export type SDLoadBalancerShape = TLBaseShape<"sd-load-balancer", SDBoxProps>;
export type SDCdnShape = TLBaseShape<"sd-cdn", SDBoxProps>;
export type SDClientShape = TLBaseShape<"sd-client", SDBoxProps>;
export type SDStorageShape = TLBaseShape<"sd-storage", SDBoxProps>;
export type SDZoneShape = TLBaseShape<"sd-zone", SDZoneProps>;
