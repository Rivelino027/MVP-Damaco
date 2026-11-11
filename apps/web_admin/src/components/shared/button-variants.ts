import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-input)] text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'gradient-primary text-white shadow-md hover:shadow-lg hover:brightness-110 active:brightness-95',
        secondary:
          'bg-white border border-border text-text-primary hover:bg-background active:bg-border/40',
        reject:
          'bg-white border border-border text-primary-dark hover:bg-danger-tint active:bg-primary-tint',
        ghost:
          'hover:bg-background active:bg-border/30',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-5 text-sm',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);
