// components/ui/Card.tsx
import React, { PropsWithChildren } from "react";

export function Card({ children }: PropsWithChildren<{}>) {
  return (
    <div style={{
      border: "1px solid #e5e7eb",
      borderRadius: 8,
      padding: 16,
      background: "#fff",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)"
    }}>
      {children}
    </div>
  );
}

export function CardHeader({ children }: PropsWithChildren<{}>) {
  return <div style={{ marginBottom: 8 }}>{children}</div>;
}

export function CardTitle({ children }: PropsWithChildren<{}>) {
  return <h3 style={{ margin: 0, fontSize: 18 }}>{children}</h3>;
}

export function CardContent({ children }: PropsWithChildren<{}>) {
  return <div style={{ marginTop: 8 }}>{children}</div>;
}

export function CardFooter({ children }: PropsWithChildren<{}>) {
  return <div style={{ marginTop: 12 }}>{children}</div>;
}

export default Card;

