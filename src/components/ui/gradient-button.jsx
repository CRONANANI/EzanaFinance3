'use client';

import { cn } from '@/lib/utils';

/**
 * GradientButton - Rotating gradient button with metallic finish
 * Uses primary green (#10b981) with metallic sheen and border
 */
export default function GradientButton({
  children,
  width = '100%',
  height = '56px',
  className = '',
  onClick,
  disabled = false,
  type,
  ...props
}) {
  const commonStyles = cn(
    'relative rounded-[50px] cursor-pointer overflow-hidden',
    'after:content-[""] after:block after:absolute after:z-[1]',
    'after:inset-[4px] after:rounded-[46px]',
    'after:bg-[#0f1419] after:transition-opacity after:duration-300 after:ease-linear',
    'flex items-center justify-center',
    'border-2 border-transparent',
    'bg-[length:400%_400%]',
    disabled && 'opacity-50 cursor-not-allowed',
    !disabled && 'hover:after:opacity-90',
    className
  );

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e);
    }
  };

  const Component = type === 'submit' ? 'button' : 'div';

  return (
    <div className="text-center w-full">
      <Component
        role={type === 'submit' ? undefined : 'button'}
        tabIndex={disabled ? -1 : 0}
        type={type}
        className={cn(commonStyles, 'gradient-button-metallic')}
        style={{
          minWidth: width === '100%' ? undefined : width,
          width: width === '100%' ? '100%' : undefined,
          height,
        }}
        onClick={disabled ? undefined : (type === 'submit' ? undefined : onClick)}
        onKeyDown={handleKeyDown}
        aria-disabled={disabled}
        disabled={type === 'submit' ? disabled : undefined}
        {...props}
      >
        <span className="relative z-10 text-white font-semibold text-base flex items-center justify-center">
          {children}
        </span>
      </Component>
    </div>
  );
}
