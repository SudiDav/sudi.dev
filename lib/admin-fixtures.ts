/**
 * Mock data for the admin screens, transcribed from the design frames.
 *
 * This is deliberately NOT the public site's MDX content. The design's admin
 * screens use their own sample data — different projects (CollabSync,
 * TypeForge, …), posts that don't exist publicly, and counters (18 posts, 142
 * comments) that don't match the 7 real posts. Reconciling the two is a product
 * decision for whoever gives the admin real persistence, so each surface keeps
 * the content its own frame specifies.
 */

export type AdminPostStatus = 'Published' | 'Draft' | 'Archived'

export type AdminPost = {
  id: string
  title: string
  category: string
  status: AdminPostStatus
  date: string
  views: string
  comments: string
}

export const adminPosts: AdminPost[] = [
  {
    id: 'building-a-real-time-collaboration-engine',
    title: 'Building a Real-Time Collaboration Engine',
    category: 'Development',
    status: 'Published',
    date: 'Aug 2, 2026',
    views: '2,841',
    comments: '4',
  },
  {
    id: 'optimizing-react-renders-at-scale',
    title: 'Optimizing React Renders at Scale',
    category: 'Development',
    status: 'Published',
    date: 'Jul 15, 2026',
    views: '1,923',
    comments: '8',
  },
  {
    id: 'type-safe-api-layers-with-trpc',
    title: 'Type-Safe API Layers with tRPC',
    category: 'Development',
    status: 'Published',
    date: 'Jun 28, 2026',
    views: '1,204',
    comments: '3',
  },
  {
    id: 'from-monolith-to-microservices',
    title: 'From Monolith to Microservices',
    category: 'Architecture',
    status: 'Published',
    date: 'Jun 4, 2026',
    views: '987',
    comments: '6',
  },
  {
    id: 'event-sourcing-in-practice',
    title: 'Event Sourcing in Practice',
    category: 'Architecture',
    status: 'Draft',
    date: 'Aug 4, 2026',
    views: '—',
    comments: '0',
  },
  {
    id: 'designing-cli-tools',
    title: 'Designing CLI Tools That Developers Love',
    category: 'Development',
    status: 'Draft',
    date: 'Jul 28, 2026',
    views: '—',
    comments: '0',
  },
]

export const adminPostCounts = [
  { label: 'All Posts', value: '18' },
  { label: 'Published', value: '14' },
  { label: 'Drafts', value: '3' },
  { label: 'Archived', value: '1' },
]

export type AdminProject = {
  name: string
  description: string
  tech: string
  views: string
  status: AdminPostStatus
}

export const adminProjects: AdminProject[] = [
  {
    name: 'CollabSync',
    description: 'Real-time collaboration engine built with CRDTs and WebSockets.',
    tech: 'React, TypeScript, Yjs',
    views: '342',
    status: 'Published',
  },
  {
    name: 'TypeForge',
    description: 'CLI tool for generating type-safe API clients from OpenAPI specs.',
    tech: 'Node.js, TypeScript',
    views: '891',
    status: 'Published',
  },
  {
    name: 'QueryBench',
    description: 'Visual database query builder with schema introspection.',
    tech: 'React, PostgreSQL, Go',
    views: '567',
    status: 'Published',
  },
  {
    name: 'DevPulse',
    description: 'Developer productivity metrics dashboard for engineering teams.',
    tech: 'Next.js, D3.js, Redis',
    views: '234',
    status: 'Published',
  },
  {
    name: 'StackDeploy',
    description: 'One-click deployment templates for common tech stacks.',
    tech: 'Docker, Terraform',
    views: '128',
    status: 'Draft',
  },
  {
    name: 'MemoGraph',
    description: 'Knowledge graph note-taking app with bidirectional links.',
    tech: 'React, Neo4j, GraphQL',
    views: '—',
    status: 'Draft',
  },
]

export type AdminComment = {
  author: string
  post: string
  time: string
  body: string
}

export const adminComments: AdminComment[] = [
  {
    author: 'Sarah Chen',
    post: 'Building a Real-Time Collaboration Engine',
    time: '10 minutes ago',
    body: 'This is incredibly well-written! The section on conflict resolution finally made CRDTs click for me.',
  },
  {
    author: 'Marcus Johnson',
    post: 'Optimizing React Renders at Scale',
    time: '1 hour ago',
    body: 'We implemented a similar virtualization strategy and saw a 40% improvement in render times.',
  },
  {
    author: 'Yuki Tanaka',
    post: 'Type-Safe API Layers with tRPC',
    time: '3 hours ago',
    body: 'Have you compared this approach with GraphQL codegen? Curious about the tradeoffs.',
  },
]

export const adminCommentCounts = [
  { label: 'All', value: '142' },
  { label: 'Pending', value: '6' },
  { label: 'Approved', value: '128' },
  { label: 'Spam', value: '8' },
]
