"use client";

import { useEffect, useRef } from "react";
import { useBreadcrumb, BreadcrumbItem } from "./BreadcrumbContext";

interface SetBreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function SetBreadcrumb({ items }: SetBreadcrumbProps) {
  const { setBreadcrumb } = useBreadcrumb();
  const hasSet = useRef(false);

  useEffect(() => {
    // Only set once per items change
    if (!hasSet.current || JSON.stringify(items) !== JSON.stringify(hasSet.current)) {
      setBreadcrumb(items);
      hasSet.current = true;
    }
    
    return () => {
      // Clear on unmount
      setBreadcrumb([]);
    };
  }, [items, setBreadcrumb]);

  return null;
}
