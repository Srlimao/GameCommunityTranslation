import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface QaModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  iconClass?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const QaModal: React.FC<QaModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  iconClass = 'p-1.5 bg-[#5865F2]/20 border border-[#5865F2] text-[#5865F2]',
  maxWidthClass = 'max-w-xl',
  children,
  footer,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 font-mono">
      <div
        className={`bg-[#161B22] border border-[#30363D] w-full ${maxWidthClass} overflow-hidden shadow-2xl flex flex-col max-h-[90vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#30363D] bg-[#10141D] shrink-0">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className={iconClass}>
                <Icon className="w-4 h-4" />
              </div>
            )}
            <div>
              <h2 className="font-bold text-xs uppercase tracking-wider text-[#E6EDF3]">{title}</h2>
              {subtitle && <p className="text-[10px] text-[#8B949E]">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8B949E] hover:text-[#E6EDF3] p-1 cursor-pointer transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 p-3 border-t border-[#30363D] bg-[#10141D] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
