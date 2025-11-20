// app/help/page.tsx
import React from "react";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

export default function HelpPage() {
  return (
    <main style={{ padding: 24 }}>
      <Card>
        <CardHeader>
          <CardTitle>Aide PIMPAY</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            Bienvenue dans la page d'aide. Si vous avez des questions ou besoin d'assistance,
            contactez support@pimpay.com.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
