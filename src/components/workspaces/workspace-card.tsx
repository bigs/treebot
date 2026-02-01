"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ellipsis, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteWorkspaceAction } from "@/lib/actions/workspace-actions";

type WorkspaceChat = {
  id: string;
  title: string | null;
};

type WorkspaceCardProps = {
  workspace: {
    id: string;
    name: string;
  };
  chats: WorkspaceChat[];
};

export function WorkspaceCard({ workspace, chats }: WorkspaceCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteWorkspaceAction({
        workspaceId: workspace.id,
      });
      if ("error" in result) {
        return;
      }
      setAlertOpen(false);
      router.refresh();
    });
  };

  return (
    <Card
      className="relative cursor-pointer overflow-hidden"
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/ws/${workspace.id}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`/ws/${workspace.id}`);
        }
      }}
    >
      <div className="relative z-10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">
              <Link
                href={`/ws/${workspace.id}`}
                className="hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {workspace.name}
              </Link>
            </CardTitle>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hover:bg-muted inline-flex size-8 items-center justify-center rounded-md"
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`Workspace options for ${workspace.name}`}
                >
                  <Ellipsis className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(event) => event.stopPropagation()}
              >
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    setMenuOpen(false);
                    setAlertOpen(true);
                  }}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {chats.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No conversations yet.
            </p>
          ) : (
            chats.map((chat) => (
              <div
                key={chat.id}
                className="rounded-md border bg-muted/60 transition hover:bg-muted"
              >
                <Link
                  href={`/ws/${workspace.id}/chats/${chat.id}`}
                  className="block px-3 py-2 text-sm font-medium"
                  onClick={(event) => event.stopPropagation()}
                >
                  {chat.title ?? "Untitled"}
                </Link>
              </div>
            ))
          )}
        </CardContent>
      </div>

      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the workspace and all its chats. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
