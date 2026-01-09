'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  useIsMobile,
} from '@workspace/ui';
import type { CollectedItem } from '@/db/schema';
import { ItemDetailContent } from './item-detail-content';

interface ItemDetailPanelProps {
  item: CollectedItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ItemDetailPanel({
  item,
  open,
  onOpenChange,
}: ItemDetailPanelProps) {
  const isMobile = useIsMobile();

  if (!item) return null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="line-clamp-1">
              {item.title || 'Untitled'}
            </DrawerTitle>
            <DrawerDescription className="capitalize">
              {item.sourceType} activity
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6">
            <ItemDetailContent item={item} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="line-clamp-1 pr-6">
            {item.title || 'Untitled'}
          </SheetTitle>
          <SheetDescription className="capitalize">
            {item.sourceType} activity
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4">
          <ItemDetailContent item={item} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
