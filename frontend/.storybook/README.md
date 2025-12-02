# Storybook Configuration

This directory contains Storybook configuration for the STOCK_VERIFY frontend components.

## Files

- `main.ts` - Main Storybook configuration
- `preview.tsx` - Global decorators and parameters

## Usage

### Start Storybook

```bash
npm run storybook
```

This will start Storybook on `http://localhost:6006`

### Build Storybook

```bash
npm run build-storybook
```

This creates a static build of Storybook for deployment.

## Components Documented

- ✅ Button (`components/Button.stories.tsx`)
- ✅ Input (`components/Input.stories.tsx`)
- ✅ Card (`components/Card.stories.tsx`)
- ✅ Modal (`components/ui/Modal.stories.tsx`)

## Adding New Stories

Create a new `.stories.tsx` file next to your component:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { YourComponent } from './YourComponent';

const meta: Meta<typeof YourComponent> = {
  title: 'Components/YourComponent',
  component: YourComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof YourComponent>;

export const Default: Story = {
  args: {
    // Your component props
  },
};
```

## Notes

- Storybook runs in web mode (React Native Web)
- Components are wrapped with theme provider
- All stories are automatically documented
