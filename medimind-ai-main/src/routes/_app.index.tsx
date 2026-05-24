import { createFileRoute } from "@tanstack/react-router";
import { ChatContainer } from "@/components/ChatContainer";

export const Route = createFileRoute("/_app/")({
  component: () => <ChatContainer />,
});
