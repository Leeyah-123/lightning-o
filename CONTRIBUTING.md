# Contributing to LightningO

Thank you for your interest in contributing to LightningO! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)
- [Documentation](#documentation)

## 🤝 Code of Conduct

This project follows a code of conduct that we expect all contributors to follow. Please be respectful, inclusive, and constructive in all interactions.

### Our Pledge

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js 18+** installed
- **Git** for version control
- **A GitHub account** for forking and pull requests
- **Basic knowledge** of React, TypeScript, and Next.js
- **Understanding** of Bitcoin Lightning and Nostr protocols (helpful but not required)

### Development Setup

1. **Fork the repository**

   ```bash
   # Click the "Fork" button on GitHub, then clone your fork
   git clone https://github.com/yourusername/lightningo.git
   cd lightningo
   ```

2. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/originalusername/lightningo.git
   ```

3. **Install dependencies**

   ```bash
   pnpm install
   ```

4. **Set up environment variables**

   ```bash
   cp env.example .env.local
   ```

   Edit `.env.local` with your configuration (see [README.md](README.md) for details).

5. **Start development server**
   ```bash
   pnpm dev
   ```

## 🏗️ Project Structure

Understanding the project structure will help you contribute effectively:

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── lightning/     # Lightning payment endpoints
│   │   └── webhooks/      # Webhook handlers
│   ├── bounties/          # Bounty pages
│   ├── gigs/              # Gig pages
│   ├── grants/            # Grant pages
│   └── pay/               # Payment pages
├── components/            # React components
│   ├── auth/              # Authentication components
│   ├── bounty/            # Bounty-specific components
│   ├── gig/               # Gig-specific components
│   ├── grant/             # Grant-specific components
│   ├── layout/            # Layout components
│   └── ui/                # Reusable UI components
├── lib/                   # Utility functions
├── services/              # Business logic services
├── store/                 # Zustand state stores
├── types/                 # TypeScript type definitions
└── validators/            # Zod validation schemas
```

### Key Directories

- **`/app`**: Next.js App Router pages and API routes
- **`/components`**: Reusable React components organized by feature
- **`/services`**: Business logic and external API integrations
- **`/store`**: Zustand state management stores
- **`/types`**: TypeScript type definitions
- **`/lib`**: Utility functions and helpers

## 📝 Coding Standards

### TypeScript

- Use **strict TypeScript** with proper type annotations
- Avoid `any` types - use specific types or `unknown`
- Use **interface** for object shapes, **type** for unions/primitives
- Export types from `/types` directory

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

// ❌ Avoid
const user: any = { id: 1, name: 'John' };
```

### React Components

- Use **functional components** with hooks
- Use **TypeScript interfaces** for props
- Follow **single responsibility** principle
- Use **custom hooks** for complex logic

```typescript
// ✅ Good
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({
  children,
  onClick,
  variant = 'primary',
}: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick}>
      {children}
    </button>
  );
}
```

### Styling

- Use **Tailwind CSS** for styling
- Follow **mobile-first** responsive design
- Use **ShadCN UI** components when possible
- Maintain **consistent spacing** and colors

```tsx
// ✅ Good
<div className="flex flex-col gap-4 p-6 bg-background rounded-lg">
  <h2 className="text-2xl font-bold text-foreground">Title</h2>
  <p className="text-muted-foreground">Description</p>
</div>
```

### State Management

- Use **Zustand** for global state
- Keep **local state** in components when possible
- Use **React Query** for server state
- Follow **immutable updates**

```typescript
// ✅ Good
interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

### Error Handling

- Use **try-catch** blocks for async operations
- Provide **meaningful error messages**
- Use **toast notifications** for user feedback
- Log errors for debugging

```typescript
// ✅ Good
try {
  const result = await api.createBounty(data);
  toast({ title: 'Success', description: 'Bounty created successfully' });
} catch (error) {
  console.error('Failed to create bounty:', error);
  toast({
    title: 'Error',
    description: 'Failed to create bounty. Please try again.',
    variant: 'destructive',
  });
}
```

## 🔄 Pull Request Process

### Before Submitting

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```

2. **Make your changes**

   - Write clean, readable code
   - Add tests if applicable
   - Update documentation if needed

3. **Test your changes**

   ```bash
   pnpm build
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

### Commit Message Format

Use conventional commits:

```
type(scope): description

feat(auth): add login modal component
fix(api): handle payment webhook errors
docs(readme): update installation instructions
style(ui): improve button hover states
refactor(store): simplify state management
test(utils): add validation tests
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Submitting a Pull Request

1. **Push your branch**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request**

   - Use the PR template
   - Provide a clear description
   - Link related issues
   - Add screenshots if UI changes

3. **Respond to feedback**
   - Address review comments
   - Make requested changes
   - Update tests if needed

### PR Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Tests pass locally
- [ ] Manual testing completed
- [ ] Screenshots added (if UI changes)

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
```

## 🐛 Issue Reporting

### Before Creating an Issue

1. **Search existing issues** to avoid duplicates
2. **Check if it's already fixed** in the latest version
3. **Gather information** about the problem

### Bug Reports

Use the bug report template:

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:

1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**

- OS: [e.g. macOS, Windows, Linux]
- Browser: [e.g. Chrome, Firefox, Safari]
- Version: [e.g. 1.0.0]

**Additional context**
Any other context about the problem.
```

### Feature Requests

Use the feature request template:

```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
A clear description of any alternative solutions.

**Additional context**
Add any other context or screenshots about the feature request.
```

## 📚 Documentation

### Code Documentation

- **Comment complex logic** and algorithms
- **Document public APIs** with JSDoc
- **Keep README updated** with new features
- **Update type definitions** when changing interfaces

```typescript
/**
 * Creates a new bounty with the provided data
 * @param data - Bounty creation data
 * @returns Promise resolving to created bounty
 * @throws Error if validation fails or API call fails
 */
async function createBounty(data: CreateBountyData): Promise<Bounty> {
  // Implementation
}
```

### README Updates

When adding new features:

- Update the features list
- Add new environment variables
- Update installation instructions
- Add new API endpoints

## 🧪 Testing

### Manual Testing

- Test all user flows
- Verify responsive design
- Check error handling
- Test with different browsers

### Automated Testing

- Write unit tests for utilities
- Add integration tests for API routes
- Test component rendering
- Verify type safety

```typescript
// Example test
describe('BountyService', () => {
  it('should create a bounty with valid data', async () => {
    const data = { title: 'Test Bounty', amount: 1000 };
    const result = await bountyService.createBounty(data);
    expect(result.title).toBe('Test Bounty');
  });
});
```

## 🎯 Areas for Contribution

### High Priority

- **Bug fixes** and stability improvements
- **Performance optimizations**
- **Accessibility improvements**
- **Mobile responsiveness**

### Medium Priority

- **New features** for bounties, gigs, or grants
- **UI/UX improvements**
- **Documentation updates**
- **Test coverage**

### Low Priority

- **Code refactoring**
- **Dependency updates**
- **Build optimizations**
- **Developer experience**

## 💡 Getting Help

### Community

- **GitHub Discussions** for questions and ideas
- **GitHub Issues** for bug reports
- **Discord** for real-time chat (if available)

### Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Nostr Protocol Documentation](https://nostr.com)
- [Bitcoin Lightning Documentation](https://lightning.network)

## 🏆 Recognition

Contributors will be recognized in:

- **README.md** contributors section
- **Release notes** for significant contributions
- **GitHub** contributor statistics

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to LightningO! ⚡**

Your contributions help make decentralized earning opportunities accessible to everyone.
