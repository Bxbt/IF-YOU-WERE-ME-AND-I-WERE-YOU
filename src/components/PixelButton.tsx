import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'ghost' | 'danger';

export interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
}

/** docs/06 §2 PixelButton — default, hover, focus, active, disabled, loading. */
export const PixelButton = forwardRef<HTMLButtonElement, PixelButtonProps>(function PixelButton(
  {
    variant = 'primary',
    loading = false,
    icon,
    block = false,
    className = '',
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`btn btn-${variant} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 aria-hidden className="h-5 w-5 animate-spin" /> : icon}
      {children}
    </button>
  );
});
