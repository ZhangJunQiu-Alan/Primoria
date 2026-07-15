import { notFound } from "next/navigation";
import { DeclarativeLensClient } from "./declarative-lens-client";

export default function DeclarativeLensPage() {
  if (process.env.NODE_ENV === "production" || process.env.PRIMORIA_ENABLE_QA_ROUTES !== "1") {
    notFound();
  }
  return <DeclarativeLensClient />;
}
