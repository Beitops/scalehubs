import { useState } from 'react'
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingFocusManager,
  useId,
} from '@floating-ui/react'

interface ActionMenuItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  className?: string
}

interface ActionMenuProps {
  items: ActionMenuItem[]
  triggerLabel: string
  triggerIcon?: React.ReactNode
  className?: string
  size?: 'sm' | 'md'
}

export const ActionMenu = ({ 
  items, 
  triggerLabel, 
  triggerIcon, 
  className = '',
  size = 'md'
}: ActionMenuProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset(4),
      flip({
        fallbackPlacements: ['top-start', 'bottom-start', 'top-end', 'bottom-end']
      }),
      shift({ padding: 8 })
    ],
    whileElementsMounted: autoUpdate,
  })

  const click = useClick(context)
  const dismiss = useDismiss(context)
  const role = useRole(context)

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ])

  const headingId = useId()

  const handleItemClick = (onClick: () => void) => {
    onClick()
    setIsOpen(false)
  }

  const sizeClasses = {
    sm: {
      button: 'text-xs',
      icon: 'w-3 h-3',
      menu: 'w-40',
      item: 'px-3 py-2 text-xs'
    },
    md: {
      button: 'text-sm',
      icon: 'w-4 h-4',
      menu: 'w-48',
      item: 'px-4 py-2 text-sm'
    }
  }

  const currentSize = sizeClasses[size]

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        className={`text-[#18cb96] hover:text-[#15b885] transition-colors flex items-center gap-1 ${currentSize.button} ${className}`}
      >
        {triggerLabel}
        {triggerIcon || (
          <svg className={currentSize.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {isOpen && (
        <FloatingFocusManager context={context} modal={false}>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            aria-labelledby={headingId}
            {...getFloatingProps()}
            className={`bg-white rounded-lg shadow-lg border border-gray-200 z-50 ${currentSize.menu}`}
          >
            <div className="py-1">
              {items.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleItemClick(item.onClick)}
                  className={`w-full ${currentSize.item} text-left hover:bg-gray-100 flex items-center gap-2 ${item.className || 'text-gray-700'}`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </FloatingFocusManager>
      )}
    </>
  )
}
