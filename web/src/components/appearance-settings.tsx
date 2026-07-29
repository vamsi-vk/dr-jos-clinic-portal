"use client";

import { ThemeControls } from "@/components/theme-controls";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export function AppearanceSettings() {
  return (
    <Card>
      <CardHeader
        title="Appearance"
        description="Choose light or dark mode and your accent color for the dashboard."
      />
      <CardBody>
        <ThemeControls />
      </CardBody>
    </Card>
  );
}
