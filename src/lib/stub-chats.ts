export interface ChatNode {
  id: string;
  title: string;
  children?: ChatNode[];
}

export function getStubChats(): ChatNode[] {
  return [
    {
      id: "1",
      title: "Project planning",
      children: [
        {
          id: "1-1",
          title: "Architecture decisions",
          children: [
            { id: "1-1-1", title: "Database choice" },
            { id: "1-1-2", title: "Auth strategy" },
          ],
        },
        { id: "1-2", title: "Timeline estimate" },
      ],
    },
    {
      id: "2",
      title: "Debug session",
      children: [
        { id: "2-1", title: "Stack trace analysis" },
        { id: "2-2", title: "Root cause found" },
      ],
    },
    { id: "3", title: "Quick question about TypeScript" },
    {
      id: "4",
      title: "Code review",
      children: [{ id: "4-1", title: "PR #42 feedback" }],
    },
    { id: "5", title: "Brainstorming session" },
  ];
}
