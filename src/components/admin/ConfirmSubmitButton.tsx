'use client'

import type { ButtonHTMLAttributes, MouseEvent } from 'react'

interface ConfirmSubmitButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'onClick'> {
  confirmMessage: string
}

export function ConfirmSubmitButton({
  confirmMessage,
  children,
  ...props
}: ConfirmSubmitButtonProps) {
  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    if (!confirm(confirmMessage)) {
      event.preventDefault()
    }
  }

  return (
    <button type="submit" onClick={handleClick} {...props}>
      {children}
    </button>
  )
}
