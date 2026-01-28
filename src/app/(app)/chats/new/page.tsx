import { getModels } from "@/lib/models";
import { NewChatForm } from "./new-chat-form";

export default async function NewChatPage() {
  const models = await getModels();

  return (
    <div className="flex h-screen items-center justify-center p-4">
      <NewChatForm models={models} />
    </div>
  );
}
