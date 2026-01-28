export interface ChatNode {
  id: number;
  title: string;
  children: ChatNode[];
}

interface ChatRow {
  id: number;
  parentId: number | null;
  title: string | null;
}

export function buildChatTree(rows: ChatRow[]): ChatNode[] {
  const nodeMap = new Map<number, ChatNode>();
  const roots: ChatNode[] = [];

  for (const row of rows) {
    nodeMap.set(row.id, {
      id: row.id,
      title: row.title ?? "Untitled",
      children: [],
    });
  }

  for (const row of rows) {
    const node = nodeMap.get(row.id)!;
    if (row.parentId != null) {
      const parent = nodeMap.get(row.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}
