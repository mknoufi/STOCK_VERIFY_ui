# Storybook Quick Start Guide

## ✅ Installation Complete

Storybook has been successfully installed and configured for your STOCK_VERIFY project!

## 🚀 Getting Started

### Start Storybook

```bash
cd backfron
npm run storybook
```

This will:

- Start Storybook development server
- Open browser at `http://localhost:6006`
- Watch for changes in component stories

### Build Storybook (for deployment)

```bash
npm run build-storybook
```

## 📚 Available Stories

### Components Documented:

1. **Button** (`components/Button.stories.tsx`)
   - All variants (primary, secondary, outline, text, danger)
   - All sizes (small, medium, large)
   - States (disabled, loading)
   - With icons (left/right)
   - Full width option

2. **Input** (`components/Input.stories.tsx`)
   - With/without label
   - Error states
   - With icons (left/right)
   - Multiline support
   - Different input types (email, phone, numeric)

3. **Card** (`components/Card.stories.tsx`)
   - With title and subtitle
   - Pressable cards
   - Different elevations
   - Custom padding
   - Complex content examples

4. **Modal** (`components/ui/Modal.stories.tsx`)
   - Different sizes (small, medium, large, fullscreen)
   - Animation types
   - With/without close button
   - Complex content examples

## 📝 Adding New Stories

To document a new component:

1. Create a `.stories.tsx` file next to your component
2. Follow the pattern from existing stories
3. Storybook will automatically pick it up

Example:

```typescript
// components/YourComponent.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { YourComponent } from "./YourComponent";

const meta: Meta<typeof YourComponent> = {
  title: "Components/YourComponent",
  component: YourComponent,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof YourComponent>;

export const Default: Story = {
  args: {
    // Component props
  },
};
```

## 🎨 Features

- ✅ Interactive component playground
- ✅ Auto-generated documentation
- ✅ Controls for all props
- ✅ Multiple story variants
- ✅ Theme integration
- ✅ Web and Native support

## 📖 Documentation

- Storybook Docs: https://storybook.js.org/docs
- Component stories are auto-documented
- Use the "Docs" tab in Storybook UI

## 🔧 Configuration

- Main config: `.storybook/main.ts`
- Preview/decorators: `.storybook/preview.tsx`
- Stories location: `components/**/*.stories.tsx`

## 💡 Tips

1. Use the "Controls" panel to interact with props
2. Use "Actions" tab to see event handlers
3. Use "Docs" tab for component documentation
4. Share Storybook URL with team for component review

---

**Happy Storytelling! 📖**
